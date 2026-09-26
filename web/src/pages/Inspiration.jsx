import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Loader, Users, ArrowLeft, Star, Eye, Calendar } from 'lucide-react'

const MOVIE_FIELDS =
  'tmdb_id, title, original_title, overview, poster_path, backdrop_path, year, runtime, vote_average, vote_count, genres, characteristics, watch_providers'

// La galería lee de la vista public_calendars, no de user_calendars: así
// se puede enseñar el alias del autor sin abrir user_profiles, donde están
// sus preferencias y su rol.
export const Inspiration = ({ onSelectMovie }) => {
  const [calendars, setCalendars] = useState([])
  const [loading, setLoading] = useState(true)
  const [openCalendar, setOpenCalendar] = useState(null)
  const [days, setDays] = useState([])
  const [loadingDays, setLoadingDays] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('public_calendars')
        .select('id, year, slug, title, author, day_count, updated_at')
        .order('updated_at', { ascending: false })

      if (error) console.error('Error cargando la galería:', error)
      if (!cancelled) {
        setCalendars(data || [])
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const openDetail = useCallback(async (calendar) => {
    setOpenCalendar(calendar)
    setLoadingDays(true)
    setDays([])

    try {
      const { data: rows, error } = await supabase
        .from('calendar_days')
        .select('day_number, tmdb_id, watched, rating')
        .eq('calendar_id', calendar.id)
        .order('day_number', { ascending: true })

      if (error) throw error

      const ids = (rows || []).map((row) => row.tmdb_id)
      let byId = {}

      if (ids.length > 0) {
        const { data: movieRows } = await supabase
          .from('movies')
          .select(MOVIE_FIELDS)
          .in('tmdb_id', ids)

        byId = Object.fromEntries((movieRows || []).map((m) => [m.tmdb_id, m]))
      }

      setDays((rows || []).map((row) => ({ ...row, movie: byId[row.tmdb_id] })))
    } catch (err) {
      console.error('Error abriendo el calendario:', err)
    } finally {
      setLoadingDays(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-40 space-y-4">
        <Loader className="w-12 h-12 text-[#ff5400] animate-spin" />
        <p className="text-sm font-bold uppercase tracking-widest text-[#ff5400] animate-pulse">
          Buscando octubres ajenos…
        </p>
      </div>
    )
  }

  // ----------------------------------------------------------
  // Detalle de un calendario
  // ----------------------------------------------------------

  if (openCalendar) {
    return (
      <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setOpenCalendar(null)}
          className="inline-flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#ff5400] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la galería
        </button>

        <div className="space-y-2 mb-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#ff5400] font-bold">
            Octubre de {openCalendar.author}
          </p>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-none">
            {openCalendar.title}
          </h1>
        </div>

        {loadingDays ? (
          <div className="py-20 flex justify-center">
            <Loader className="w-10 h-10 text-[#ff5400] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
            {days.map((day) => (
              <button
                key={day.day_number}
                onClick={() => day.movie && onSelectMovie(day.movie)}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-gray-800 hover:border-[#ff5400] transition-all hover:scale-[1.04] cursor-pointer text-left"
              >
                <div className="absolute top-2 left-2 z-20 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-[#ff5400]/60">
                  <span className="text-xs font-black text-[#ff5400]">{day.day_number}</span>
                </div>

                {day.movie?.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${day.movie.poster_path}`}
                    alt={day.movie.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#181822]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85" />

                {day.watched && (
                  <div className="absolute top-2 right-2 z-20 bg-emerald-500/20 border border-emerald-500/50 rounded-md p-1">
                    <Eye className="w-3 h-3 text-emerald-400" />
                  </div>
                )}

                <div className="absolute bottom-0 inset-x-0 p-2.5 space-y-1">
                  <h3 className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                    {day.movie?.title || '—'}
                  </h3>
                  {day.rating ? (
                    <p className="flex items-center gap-0.5 text-[10px] text-amber-400">
                      {Array.from({ length: day.rating }).map((_, i) => (
                        <Star key={i} className="w-2.5 h-2.5 fill-amber-400" />
                      ))}
                    </p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ----------------------------------------------------------
  // Listado
  // ----------------------------------------------------------

  return (
    <div className="py-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ff5400]/10 border-2 border-[#ff5400]/40">
          <Users className="w-8 h-8 text-[#ff5400]" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-none">
          Inspi<span className="text-[#ff5400] text-glow-orange">ración</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
          Los octubres que otros han querido enseñar. Cotillea sus 31 noches y róbales las ideas
          que te convengan.
        </p>
      </div>

      {calendars.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <Calendar className="w-12 h-12 text-gray-700 mx-auto" />
          <p className="text-base font-bold text-gray-300">Todavía no hay ninguno publicado</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Los calendarios nacen privados. Cuando alguien publique el suyo desde “Mi calendario”,
            aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {calendars.map((calendar) => (
            <button
              key={calendar.id}
              onClick={() => openDetail(calendar)}
              className="group text-left rounded-2xl border border-gray-800 bg-[#0d0d14] p-5 space-y-3 hover:border-[#ff5400]/70 hover:bg-[#12121a] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#ff5400]">
                  {calendar.author}
                </span>
                <span className="text-[10px] font-bold text-gray-600">{calendar.year}</span>
              </div>

              <h3 className="text-lg font-black uppercase tracking-tight text-white leading-tight">
                {calendar.title}
              </h3>

              <p className="text-xs text-gray-500">
                {calendar.day_count} {calendar.day_count === 1 ? 'película' : 'películas'}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
