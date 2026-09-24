import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Skull, Loader } from 'lucide-react'

export const OfficialCalendar = ({ onSelectMovie }) => {
  const [calendar, setCalendar] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCalendar()
  }, [])

  const fetchCalendar = async () => {
    try {
      setLoading(true)

      // Fetch calendario oficial con películas
      const { data, error } = await supabase
        .from('official_calendar')
        .select(`
          day_number,
          theme,
          note,
          movies:tmdb_id (
            tmdb_id,
            title,
            poster_path,
            vote_average,
            year
          )
        `)
        .eq('year', 2024)
        .order('day_number', { ascending: true })

      if (error) throw error

      setCalendar(data || [])
    } catch (err) {
      console.error('Error fetching calendar:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 text-[#ff5400] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090c] py-8">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#ff5400]/10 border-2 border-[#ff5400]/40">
            <Calendar className="w-10 h-10 text-[#ff5400]" />
          </div>

          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider text-white">
            Calendario Oficial
          </h1>

          <p className="text-base text-gray-400 max-w-2xl mx-auto">
            31 películas cuidadosamente seleccionadas para octubre 2024. Una progresión desde clásicos accesibles hasta el terror más intenso en la noche de Halloween.
          </p>

          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 px-4 py-2 rounded-full">
            <Skull className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-400">
              Solo lectura · Referencia 2024
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {calendar.map((day) => {
            const movie = day.movies
            const posterUrl = movie?.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=500&q=80'

            return (
              <button
                key={day.day_number}
                onClick={() => onSelectMovie?.(movie)}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-gray-800 hover:border-[#ff5400] transition-all hover:scale-105"
              >
                {/* Day Number Badge */}
                <div className="absolute top-2 left-2 z-20 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-[#ff5400]/60">
                  <span className="text-sm font-black text-[#ff5400]">
                    {day.day_number}
                  </span>
                </div>

                {/* Poster */}
                <img
                  src={posterUrl}
                  alt={movie?.title || `Día ${day.day_number}`}
                  className="w-full h-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Info */}
                <div className="absolute bottom-0 inset-x-0 p-3 space-y-1">
                  {day.theme && (
                    <span className="inline-block bg-[#ff5400]/20 border border-[#ff5400]/40 text-[#ff5400] text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded">
                      {day.theme}
                    </span>
                  )}

                  <h3 className="text-xs font-bold text-white line-clamp-2">
                    {movie?.title || 'TBD'}
                  </h3>

                  {movie?.year && (
                    <p className="text-[10px] text-gray-400">{movie.year}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Notes Section */}
        <div className="mt-12 bg-[#0d0d10] border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-white">
            Notas del Curador
          </h2>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-gray-400">
                <span className="text-[#ff5400] font-bold">Días 1-10:</span> Clásicos accesibles para entrar en ambiente
              </p>
              <p className="text-gray-400">
                <span className="text-[#ff5400] font-bold">Días 11-20:</span> Terror moderno con tensión creciente
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-gray-400">
                <span className="text-[#ff5400] font-bold">Días 21-30:</span> Máxima intensidad y horror extremo
              </p>
              <p className="text-gray-400">
                <span className="text-[#ff5400] font-bold">Día 31:</span> Halloween perfecto para cerrar el mes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
