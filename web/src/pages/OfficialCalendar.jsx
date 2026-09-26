import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Lock, Loader, Skull, Calendar, Sparkles, Star, SlidersHorizontal, ArrowRight } from 'lucide-react'
import { ChallengeModal } from '../components/ChallengeModal'
import { CountdownWidget } from '../components/CountdownWidget'
import { challengeTypeForDay, CHALLENGE_META } from '../lib/challenges'
import { autoRevealedThrough } from '../lib/calendarDates'

const MOVIE_FIELDS =
  'tmdb_id, title, original_title, overview, poster_path, backdrop_path, year, runtime, vote_average, vote_count, genres, characteristics, watch_providers'

export const OfficialCalendar = ({ movies, onSelectMovie, onRequireAuth, onOpenOnboarding }) => {
  const { user, hasCompletedOnboarding } = useAuth()

  const [year, setYear] = useState(new Date().getFullYear())
  const [days, setDays] = useState([])
  const [revealedMovies, setRevealedMovies] = useState({}) // tmdb_id -> movie
  const [unlocked, setUnlocked] = useState(new Set())      // day_number
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState(null)
  const [migrationMissing, setMigrationMissing] = useState(false)

  // Las puertas de los días ya pasados se abren solas, para todo el mundo y
  // sin prueba. Se recalcula cada minuto para que el cambio de día entre
  // aunque la pestaña lleve horas abierta.
  const [revealedThrough, setRevealedThrough] = useState(() => autoRevealedThrough(new Date().getFullYear()))
  const reloadRef = useRef(null)

  useEffect(() => {
    const tick = () =>
      setRevealedThrough((previous) => {
        const current = autoRevealedThrough(year)
        // Al cruzar la medianoche con la pestaña abierta hay puertas nuevas
        // cuyas películas no se pidieron al cargar. Sin esto se pintarían
        // como «abiertas, sin película asignada».
        if (current > previous) reloadRef.current?.()
        return current
      })

    tick()
    const timer = setInterval(tick, 60_000)
    return () => clearInterval(timer)
  }, [year])

  // ----------------------------------------------------------
  // Carga
  // ----------------------------------------------------------

  const loadCalendar = useCallback(async () => {
    setLoading(true)

    try {
      const currentYear = new Date().getFullYear()

      // El calendario del año en curso; si aún no está montado,
      // enseñamos el último publicado en vez de una página vacía.
      let targetYear = currentYear
      let { data: rows, error } = await supabase
        .from('official_calendar')
        .select('day_number, theme, note, tmdb_id, year')
        .eq('year', currentYear)
        .order('day_number', { ascending: true })

      if (error) throw error

      if (!rows || rows.length === 0) {
        const { data: latest } = await supabase
          .from('official_calendar')
          .select('year')
          .order('year', { ascending: false })
          .limit(1)

        if (latest && latest.length > 0) {
          targetYear = latest[0].year
          const { data: fallbackRows } = await supabase
            .from('official_calendar')
            .select('day_number, theme, note, tmdb_id, year')
            .eq('year', targetYear)
            .order('day_number', { ascending: true })
          rows = fallbackRows || []
        }
      }

      setYear(targetYear)
      setDays(rows || [])

      // Días ya superados por este usuario. Si la tabla todavía no
      // existe (falta correr supabase_migration_unlocks.sql) seguimos
      // mostrando el calendario y avisamos, en vez de caer entero.
      let unlockedDays = new Set()
      if (user) {
        const { data: unlocks, error: unlocksError } = await supabase
          .from('calendar_unlocks')
          .select('day_number')
          .eq('user_id', user.id)
          .eq('year', targetYear)

        if (unlocksError) {
          console.warn('No se pudieron leer los desbloqueos:', unlocksError)
          setMigrationMissing(unlocksError.code === 'PGRST205')
        } else {
          setMigrationMissing(false)
          unlockedDays = new Set((unlocks || []).map((row) => row.day_number))
        }
      }
      setUnlocked(unlockedDays)

      // Solo pedimos los datos de las películas ya reveladas —por prueba
      // superada o porque su día ya pasó—: las selladas ni siquiera llegan
      // al navegador.
      const revealed = autoRevealedThrough(targetYear)
      const idsToLoad = (rows || [])
        .filter((row) => (unlockedDays.has(row.day_number) || row.day_number <= revealed) && row.tmdb_id)
        .map((row) => row.tmdb_id)

      if (idsToLoad.length > 0) {
        const { data: movieRows } = await supabase
          .from('movies')
          .select(MOVIE_FIELDS)
          .in('tmdb_id', idsToLoad)

        setRevealedMovies(
          Object.fromEntries((movieRows || []).map((movie) => [movie.tmdb_id, movie]))
        )
      } else {
        setRevealedMovies({})
      }
    } catch (err) {
      console.error('Error cargando el calendario oficial:', err)
    } finally {
      setLoading(false)
    }
    // Dependemos del id y no del objeto: Supabase devuelve un `user`
    // nuevo en cada refresco de token y recargaríamos sin motivo.
  }, [user?.id])

  useEffect(() => {
    reloadRef.current = loadCalendar
    loadCalendar()
  }, [loadCalendar])

  // ----------------------------------------------------------
  // Desbloqueo
  // ----------------------------------------------------------

  const isOpen = useCallback(
    (dayNumber) => unlocked.has(dayNumber) || dayNumber <= revealedThrough,
    [unlocked, revealedThrough]
  )

  // Las películas aún selladas quedan fuera de las preguntas
  const challengePool = useMemo(() => {
    const hidden = new Set(
      days.filter((day) => !isOpen(day.day_number)).map((day) => day.tmdb_id)
    )
    return movies.filter((movie) => !hidden.has(movie.tmdb_id))
  }, [movies, days, isOpen])

  const handleSolved = async (dayNumber, { challengeType, attempts }) => {
    const day = days.find((item) => item.day_number === dayNumber)

    const { error } = await supabase
      .from('calendar_unlocks')
      .upsert(
        {
          user_id: user.id,
          year,
          day_number: dayNumber,
          challenge_type: challengeType,
          attempts
        },
        { onConflict: 'user_id,year,day_number' }
      )

    if (error) {
      if (error.code === 'PGRST205') {
        setMigrationMissing(true)
        throw new Error('Falta crear la tabla calendar_unlocks: ejecuta supabase_migration_unlocks.sql en Supabase.')
      }
      throw error
    }

    setUnlocked((prev) => new Set(prev).add(dayNumber))

    if (!day?.tmdb_id) return null

    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select(MOVIE_FIELDS)
      .eq('tmdb_id', day.tmdb_id)
      .single()

    if (movieError) throw movieError

    setRevealedMovies((prev) => ({ ...prev, [movie.tmdb_id]: movie }))
    return movie
  }

  const openDay = (day) => {
    if (isOpen(day.day_number)) {
      const movie = revealedMovies[day.tmdb_id]
      if (movie) onSelectMovie(movie)
      return
    }

    if (!user) {
      onRequireAuth()
      return
    }

    setActiveDay(day)
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-40 space-y-4">
        <Loader className="w-12 h-12 text-[#ff5400] animate-spin" />
        <p className="text-sm font-bold uppercase tracking-widest text-[#ff5400] animate-pulse">
          Sellando las puertas…
        </p>
      </div>
    )
  }

  const openCount = days.filter((day) => isOpen(day.day_number)).length
  const total = days.length
  const percent = total > 0 ? Math.round((openCount / total) * 100) : 0

  return (
    <div className="py-10">
      {/* Cabecera */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ff5400]/10 border-2 border-[#ff5400]/40">
            <Calendar className="w-8 h-8 text-[#ff5400]" />
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-none">
            Calendario <span className="text-[#ff5400] text-glow-orange">Oficial</span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
            31 puertas selladas, una por cada noche de octubre de {year}. Detrás de cada una hay una
            película — pero solo se abre para quien supere su prueba.
          </p>

          {total > 0 && (
            <div className="max-w-md mx-auto space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-gray-500">Puertas abiertas</span>
                <span className="text-[#ff5400]">{openCount} / {total}</span>
              </div>
              <div className="h-2 bg-[#181822] rounded-full overflow-hidden border border-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-[#ff5400] to-[#e11d48] transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {!user && total > 0 && (
            <button
              onClick={onRequireAuth}
              className="inline-flex items-center gap-2 mt-2 px-6 py-3 bg-gradient-to-r from-[#ff5400] to-[#e11d48] text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,84,0,0.35)]"
            >
              <Sparkles className="w-4 h-4" />
              Crea tu cuenta para empezar a abrir puertas
            </button>
          )}
        </div>
      </div>

      {/* Quien ha entrado pero no ha dicho qué le gusta se queda sin
          calendario personal y sin saberlo. Se lo recordamos aquí, que es
          por donde se aterriza, y desaparece solo al completarlo. */}
      {user && !hasCompletedOnboarding && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <button
            onClick={onOpenOnboarding}
            className="group w-full flex items-center gap-4 text-left rounded-2xl border border-[#ff5400]/40 bg-gradient-to-r from-[#ff5400]/10 to-transparent px-5 py-4 hover:border-[#ff5400] hover:from-[#ff5400]/20 transition-all cursor-pointer"
          >
            <div className="shrink-0 w-11 h-11 rounded-xl bg-[#ff5400]/15 border border-[#ff5400]/40 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-[#ff5400]" />
            </div>

            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-black uppercase tracking-wider text-white">
                Te falta decirnos qué terror te va
              </p>
              <p className="text-xs text-gray-400 leading-snug">
                Un par de preguntas y te montamos un segundo calendario, distinto a este y
                hecho a tu medida. Se cambia cuando quieras.
              </p>
            </div>

            <ArrowRight className="shrink-0 w-5 h-5 text-[#ff5400] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* Cuenta atrás hasta la noche de Halloween */}
      <CountdownWidget />

      {/* Rejilla de días */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {migrationMissing && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs rounded-xl px-4 py-3">
            Los desbloqueos no se están guardando: falta ejecutar{' '}
            <code className="font-bold">supabase_migration_unlocks.sql</code> en el editor SQL de Supabase.
          </div>
        )}
        {total === 0 ? (
          <div className="text-center py-24 space-y-3">
            <Skull className="w-12 h-12 text-gray-700 mx-auto" />
            <p className="text-base font-bold text-gray-300">
              El calendario de este año todavía no está montado
            </p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Ejecuta <code className="text-[#ff5400]">populate_official_calendar.py</code> para
              publicar las 31 películas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
            {days.map((day) => (
              <DayDoor
                key={day.day_number}
                day={day}
                isUnlocked={isOpen(day.day_number)}
                byDate={!unlocked.has(day.day_number) && day.day_number <= revealedThrough}
                movie={revealedMovies[day.tmdb_id]}
                year={year}
                onOpen={() => openDay(day)}
              />
            ))}
          </div>
        )}
      </div>

      <ChallengeModal
        isOpen={activeDay !== null}
        day={activeDay}
        year={year}
        pool={challengePool}
        onClose={() => setActiveDay(null)}
        onSolved={handleSolved}
        onOpenDetail={onSelectMovie}
      />
    </div>
  )
}

// ------------------------------------------------------------
// Puerta de un día
// ------------------------------------------------------------

const DayDoor = ({ day, isUnlocked, byDate, movie, year, onOpen }) => {
  const meta = CHALLENGE_META[challengeTypeForDay(day.day_number, year)]

  // Día superado pero sin película asignada en el calendario editorial:
  // sin esto volvería a pintarse como sellado y parecería que se cerró solo.
  if (isUnlocked && !movie) {
    return (
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-emerald-700/50 bg-[#101016] flex flex-col items-center justify-center gap-2 p-3 text-center">
        <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded-lg border border-emerald-700/60">
          <span className="text-xs font-black text-emerald-500">{day.day_number}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
          Abierto
        </span>
        <span className="text-[10px] text-gray-600">Sin película asignada</span>
      </div>
    )
  }

  if (isUnlocked && movie) {
    return (
      <button
        onClick={onOpen}
        className="group relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-gray-800 hover:border-[#ff5400] transition-all hover:scale-[1.04] cursor-pointer text-left"
      >
        <div className="absolute top-2 left-2 z-20 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-[#ff5400]/60">
          <span className="text-xs font-black text-[#ff5400]">{day.day_number}</span>
        </div>

        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#181822]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />

        {movie.vote_average ? (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-amber-500/40 text-[10px] font-bold text-amber-400">
            <Star className="w-2.5 h-2.5 fill-amber-400" />
            {movie.vote_average.toFixed(1)}
          </div>
        ) : null}

        <div className="absolute bottom-0 inset-x-0 p-2.5 space-y-1">
          {/* En una sola fila: apilados empujaban el título sobre el póster. */}
          <div className="flex flex-wrap items-center gap-1">
            {byDate && (
              <span className="bg-black/70 border border-gray-700 text-gray-400 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded">
                Ya pasó
              </span>
            )}
            {day.theme && (
              <span className="bg-[#ff5400]/20 border border-[#ff5400]/40 text-[#ff5400] text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded">
                {day.theme}
              </span>
            )}
          </div>
          <h3 className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
            {movie.title}
          </h3>
          <p className="text-[10px] text-gray-400">{movie.year || ''}</p>
        </div>
      </button>
    )
  }

  // Puerta sellada
  return (
    <button
      onClick={onOpen}
      className="group relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-gray-800 hover:border-[#ff5400]/70 transition-all hover:scale-[1.04] cursor-pointer bg-[#101016]"
    >
      {/* Textura de puerta */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#14141c_25%,transparent_25%,transparent_50%,#14141c_50%,#14141c_75%,transparent_75%)] bg-[length:14px_14px] opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/70" />
      <div className="absolute -inset-8 bg-[#ff5400]/0 group-hover:bg-[#ff5400]/10 blur-2xl transition-all duration-500" />

      <div className="absolute top-2 left-2 z-20 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-gray-700 group-hover:border-[#ff5400]/60 transition-colors">
        <span className="text-xs font-black text-gray-400 group-hover:text-[#ff5400] transition-colors">
          {day.day_number}
        </span>
      </div>

      <div className="relative h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <div className="w-11 h-11 rounded-full bg-black/60 border border-gray-700 flex items-center justify-center group-hover:border-[#ff5400]/60 transition-colors">
          <Lock className="w-5 h-5 text-gray-500 group-hover:text-[#ff5400] transition-colors" />
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">
          Sellado
        </span>
      </div>

      {/* Pista: el tipo de prueba y el tema editorial */}
      <div className="absolute bottom-0 inset-x-0 p-2 space-y-1">
        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 truncate">
          {meta.emoji} {meta.name}
        </p>
        {day.theme && (
          <p className="text-[9px] text-gray-600 truncate italic">Pista: {day.theme}</p>
        )}
      </div>
    </button>
  )
}
