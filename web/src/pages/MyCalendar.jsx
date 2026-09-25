import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { generateCalendar } from '../lib/calendarGenerator'
import { MoviePickerModal } from '../components/MoviePickerModal'
import {
  Calendar,
  Loader,
  Sparkles,
  Repeat,
  Star,
  Eye,
  Clock,
  SlidersHorizontal,
  Shuffle,
  Lock
} from 'lucide-react'

const MOVIE_FIELDS =
  'tmdb_id, title, original_title, overview, poster_path, backdrop_path, year, runtime, vote_average, vote_count, genres, characteristics, watch_providers'

export const MyCalendar = ({ movies, onSelectMovie, onRequireAuth, onOpenOnboarding }) => {
  const { user, userProfile, hasCompletedOnboarding } = useAuth()

  const [calendar, setCalendar] = useState(null)
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [pickerDay, setPickerDay] = useState(null)

  const year = new Date().getFullYear()

  // ----------------------------------------------------------
  // Carga
  // ----------------------------------------------------------

  const loadCalendar = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data: calendarRow, error: calendarError } = await supabase
        .from('user_calendars')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', year)
        .maybeSingle()

      if (calendarError) throw calendarError

      setCalendar(calendarRow || null)

      if (!calendarRow) {
        setDays([])
        return
      }

      const { data: dayRows, error: daysError } = await supabase
        .from('calendar_days')
        .select(`id, day_number, tmdb_id, watched, rating, watched_at, movies:tmdb_id (${MOVIE_FIELDS})`)
        .eq('calendar_id', calendarRow.id)
        .order('day_number', { ascending: true })

      if (daysError) throw daysError

      setDays(dayRows || [])
    } catch (err) {
      console.error('Error cargando el calendario personal:', err)
      setError('No se pudo cargar tu calendario')
    } finally {
      setLoading(false)
    }
  }, [user?.id, year])

  useEffect(() => {
    loadCalendar()
  }, [loadCalendar])

  // ----------------------------------------------------------
  // Generar / regenerar
  // ----------------------------------------------------------

  // Intenta la Edge Function y, si no está desplegada o falla,
  // usa el mismo algoritmo en el navegador.
  const buildPlan = async () => {
    try {
      const { data, error: functionError } = await supabase.functions.invoke('generate-calendar')
      if (!functionError && data?.success && data.calendar?.length === 31) {
        return data.calendar.map((entry) => ({
          day_number: entry.day_number,
          tmdb_id: entry.tmdb_id
        }))
      }
    } catch (err) {
      console.warn('Edge Function no disponible, generando en local:', err)
    }

    const local = generateCalendar(movies, userProfile)
    return local.map((entry) => ({ day_number: entry.day_number, tmdb_id: entry.tmdb_id }))
  }

  const handleGenerate = async ({ regenerate = false } = {}) => {
    if (!hasCompletedOnboarding) {
      setError('Primero cuéntanos tus gustos en el onboarding')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const plan = await buildPlan()

      if (plan.length < 31) {
        throw new Error('No hay películas analizadas suficientes para llenar el mes')
      }

      let calendarId = calendar?.id

      if (!calendarId) {
        const username = userProfile?.username || user.email?.split('@')[0] || 'anon'
        const { data: created, error: createError } = await supabase
          .from('user_calendars')
          .insert({
            user_id: user.id,
            year,
            slug: `${username}-octubre-${year}`,
            title: `Mi Octubre ${year}`,
            is_public: true
          })
          .select()
          .single()

        if (createError) throw createError
        calendarId = created.id
        setCalendar(created)
      } else if (regenerate) {
        const { error: deleteError } = await supabase
          .from('calendar_days')
          .delete()
          .eq('calendar_id', calendarId)

        if (deleteError) throw deleteError
      }

      const { error: insertError } = await supabase
        .from('calendar_days')
        .insert(plan.map((entry) => ({ ...entry, calendar_id: calendarId, watched: false })))

      if (insertError) throw insertError

      await loadCalendar()
    } catch (err) {
      console.error('Error generando el calendario:', err)
      setError(err.message || 'No se pudo generar el calendario')
    } finally {
      setGenerating(false)
    }
  }

  // ----------------------------------------------------------
  // Edición
  // ----------------------------------------------------------

  const swapMovie = async (movie) => {
    const day = pickerDay
    setPickerDay(null)

    try {
      const { error: updateError } = await supabase
        .from('calendar_days')
        .update({ tmdb_id: movie.tmdb_id, watched: false, rating: null, watched_at: null })
        .eq('id', day.id)

      if (updateError) throw updateError

      setDays((prev) =>
        prev.map((item) =>
          item.id === day.id
            ? { ...item, tmdb_id: movie.tmdb_id, movies: movie, watched: false, rating: null, watched_at: null }
            : item
        )
      )
    } catch (err) {
      console.error('Error cambiando la película:', err)
      setError('No se pudo cambiar la película de ese día')
    }
  }

  const toggleWatched = async (day) => {
    const watched = !day.watched
    const watchedAt = watched ? new Date().toISOString() : null

    setDays((prev) =>
      prev.map((item) =>
        item.id === day.id ? { ...item, watched, watched_at: watchedAt } : item
      )
    )

    const { error: updateError } = await supabase
      .from('calendar_days')
      .update({ watched, watched_at: watchedAt })
      .eq('id', day.id)

    if (updateError) console.error('Error marcando como vista:', updateError)
  }

  const setRating = async (day, rating) => {
    const value = day.rating === rating ? null : rating

    setDays((prev) =>
      prev.map((item) => (item.id === day.id ? { ...item, rating: value } : item))
    )

    const { error: updateError } = await supabase
      .from('calendar_days')
      .update({ rating: value })
      .eq('id', day.id)

    if (updateError) console.error('Error guardando la nota:', updateError)
  }

  // ----------------------------------------------------------
  // Derivados
  // ----------------------------------------------------------

  const stats = useMemo(() => {
    const watched = days.filter((day) => day.watched)
    const minutes = watched.reduce((total, day) => total + (day.movies?.runtime || 0), 0)
    const rated = watched.filter((day) => day.rating)
    const average = rated.length
      ? rated.reduce((total, day) => total + day.rating, 0) / rated.length
      : null

    return { watched: watched.length, minutes, average }
  }, [days])

  const usedIds = useMemo(() => days.map((day) => day.tmdb_id), [days])

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  if (!user) {
    return (
      <EmptyState
        icon={<Lock className="w-8 h-8 text-[#ff5400]" />}
        title="Tu calendario te espera"
        description="Crea una cuenta y te montamos un octubre entero a tu medida, editable película a película."
        actionLabel="Entrar o registrarse"
        onAction={onRequireAuth}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-40">
        <Loader className="w-12 h-12 text-[#ff5400] animate-spin" />
      </div>
    )
  }

  if (!hasCompletedOnboarding) {
    return (
      <EmptyState
        icon={<SlidersHorizontal className="w-8 h-8 text-[#ff5400]" />}
        title="Primero, tus gustos"
        description="Contesta un par de preguntas sobre qué terror te va y con eso construimos tu calendario. Puedes cambiarlas cuando quieras."
        actionLabel="Empezar onboarding"
        onAction={onOpenOnboarding}
      />
    )
  }

  if (!calendar || days.length === 0) {
    return (
      <div className="py-20">
        <div className="max-w-xl mx-auto px-4 text-center space-y-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ff5400]/10 border-2 border-[#ff5400]/40">
            <Calendar className="w-8 h-8 text-[#ff5400]" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              Tu Octubre, a tu medida
            </h1>
            <p className="text-sm text-gray-400">
              31 películas elegidas según tu perfil, con la intensidad subiendo hasta Halloween.
              Después podrás cambiar los días que no te convenzan.
            </p>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#ff5400] hover:bg-[#ff6a1a] text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {generating ? (
              <><Loader className="w-5 h-5 animate-spin" /> Generando…</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Generar mi calendario</>
            )}
          </button>

          <button
            onClick={onOpenOnboarding}
            className="block mx-auto text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#ff5400] transition-colors cursor-pointer"
          >
            Revisar mis gustos antes
          </button>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="py-10">
      {/* Cabecera */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#ff5400] font-bold">
              Calendario personal
            </p>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-none">
              {calendar.title}
            </h1>
            <p className="text-sm text-gray-500">
              Cámbialo a tu gusto: toca “Cambiar” en cualquier día para buscar otra película.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenOnboarding}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16161f] border border-gray-800 text-gray-300 text-xs font-bold uppercase tracking-wider rounded-xl hover:border-[#ff5400]/60 hover:text-white transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Mis gustos
            </button>

            <button
              onClick={() => {
                if (window.confirm('Se sustituirán las 31 películas y perderás las notas y marcas de vista. ¿Seguimos?')) {
                  handleGenerate({ regenerate: true })
                }
              }}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16161f] border border-gray-800 text-gray-300 text-xs font-bold uppercase tracking-wider rounded-xl hover:border-[#ff5400]/60 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {generating ? <Loader className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
              Regenerar
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Eye className="w-4 h-4" />} label="Vistas" value={`${stats.watched}/31`} />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Tiempo"
            value={`${Math.floor(stats.minutes / 60)}h ${stats.minutes % 60}m`}
          />
          <StatCard
            icon={<Star className="w-4 h-4" />}
            label="Tu nota media"
            value={stats.average ? stats.average.toFixed(1) : '—'}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 px-4 py-3 rounded-xl">
            {error}
          </p>
        )}
      </div>

      {/* Rejilla */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
          {days.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              onOpenDetail={() => day.movies && onSelectMovie(day.movies)}
              onSwap={() => setPickerDay(day)}
              onToggleWatched={() => toggleWatched(day)}
              onRate={(value) => setRating(day, value)}
            />
          ))}
        </div>
      </div>

      <MoviePickerModal
        isOpen={pickerDay !== null}
        dayNumber={pickerDay?.day_number}
        movies={movies}
        excludeIds={usedIds}
        onPick={swapMovie}
        onClose={() => setPickerDay(null)}
      />
    </div>
  )
}

// ------------------------------------------------------------
// Subcomponentes
// ------------------------------------------------------------

const StatCard = ({ icon, label, value }) => (
  <div className="bg-[#12121a] border border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-[#ff5400]/10 border border-[#ff5400]/30 text-[#ff5400] flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold truncate">{label}</p>
      <p className="text-base font-black text-white leading-tight">{value}</p>
    </div>
  </div>
)

const DayCard = ({ day, onOpenDetail, onSwap, onToggleWatched, onRate }) => {
  const movie = day.movies

  return (
    <div
      className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
        day.watched ? 'border-emerald-600/70' : 'border-gray-800 hover:border-[#ff5400]/70'
      }`}
    >
      <div className="relative aspect-[2/3]">
        <button onClick={onOpenDetail} className="w-full h-full cursor-pointer">
          {movie?.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#181822]" />
          )}
        </button>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent opacity-85 pointer-events-none" />

        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-[#ff5400]/60">
          <span className="text-xs font-black text-[#ff5400]">{day.day_number}</span>
        </div>

        <button
          onClick={onSwap}
          title="Cambiar película"
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 border border-gray-700 text-gray-300 hover:text-black hover:bg-[#ff5400] hover:border-[#ff5400] transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Shuffle className="w-3.5 h-3.5" />
        </button>

        <div className="absolute bottom-0 inset-x-0 p-2 pointer-events-none">
          <h3 className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
            {movie?.title || 'Sin asignar'}
          </h3>
          <p className="text-[10px] text-gray-400">
            {[movie?.year, movie?.runtime ? `${movie.runtime}m` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-[#0f0f16] p-2 space-y-1.5">
        <button
          onClick={onToggleWatched}
          className={`w-full py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            day.watched
              ? 'bg-emerald-600 text-white'
              : 'bg-[#1b1b26] text-gray-400 hover:text-white hover:bg-[#25253355]'
          }`}
        >
          {day.watched ? '✓ Vista' : 'Marcar vista'}
        </button>

        {day.watched && (
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRate(star)}
                className="text-[11px] leading-none hover:scale-125 transition-transform cursor-pointer"
                title={`${star} de 5`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    star <= (day.rating || 0)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-700'
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onSwap}
          className="w-full py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-[#ff5400] transition-colors cursor-pointer"
        >
          Cambiar
        </button>
      </div>
    </div>
  )
}

const EmptyState = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="py-24">
    <div className="max-w-md mx-auto px-4 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ff5400]/10 border-2 border-[#ff5400]/40">
        {icon}
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-black uppercase tracking-wider text-white">{title}</h1>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <button
        onClick={onAction}
        className="px-7 py-3.5 bg-[#ff5400] hover:bg-[#ff6a1a] text-black font-black uppercase tracking-wider text-sm rounded-xl transition-all cursor-pointer"
      >
        {actionLabel}
      </button>
    </div>
  </div>
)
