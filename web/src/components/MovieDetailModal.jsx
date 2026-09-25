import React, { useEffect } from 'react'
import { X, Star, Clock, Calendar, Heart, Tv, ShoppingCart, Film, Skull } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const MovieDetailModal = ({ movie, onClose }) => {
  const { isWatchlisted, toggleWatchlist } = useAuth()

  useEffect(() => {
    if (!movie) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [movie, onClose])

  if (!movie) return null

  const inWatchlist = isWatchlisted(movie.tmdb_id)

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : ''

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : ''

  const chars = movie.characteristics || {}

  // Horror characteristics metadata with custom colors & labels
  const charLabels = [
    { key: 'terror', label: 'Terror / Miedo', color: 'from-orange-500 to-amber-500' },
    { key: 'gore', label: 'Gore / Sangre', color: 'from-red-600 to-rose-700' },
    { key: 'tension', label: 'Tensión / Suspense', color: 'from-amber-500 to-yellow-400' },
    { key: 'slasher', label: 'Slasher / Asesino', color: 'from-rose-500 to-red-600' },
    { key: 'sobrenatural', label: 'Sobrenatural / Fantasmas', color: 'from-purple-500 to-indigo-600' },
    { key: 'psicologico', label: 'Horror Psicológico', color: 'from-blue-500 to-cyan-500' },
    { key: 'body_horror', label: 'Body Horror', color: 'from-pink-600 to-rose-800' },
    { key: 'jump_scares', label: 'Jump Scares / Sustos', color: 'from-emerald-500 to-teal-600' },
    { key: 'atmosfera', label: 'Atmósfera / Dread', color: 'from-violet-600 to-purple-800' },
    { key: 'humor', label: 'Humor Negro / Comedia', color: 'from-lime-500 to-emerald-600' },
  ]

  const providers = movie.watch_providers || { flatrate: [], rent: [], buy: [] }
  const flatrate = providers.flatrate || []
  const rent = providers.rent || []
  const buy = providers.buy || []
  const hasAnyProviders = flatrate.length > 0 || rent.length > 0 || buy.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-lg overflow-y-auto animate-fadeIn">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-[#12121a] border border-gray-700 rounded-3xl overflow-hidden shadow-2xl text-gray-100 my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/70 text-gray-300 hover:text-[#ff5400] hover:bg-black transition-all border border-gray-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Backdrop Banner Header */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-black">
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover filter brightness-70"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-900 to-black" />
          )}

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/60 to-transparent" />

          {/* Title overlay in banner for mobile / desktop */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {movie.year && (
                  <span className="text-gray-300 text-xs font-semibold">
                    {movie.year}
                  </span>
                )}
                {movie.runtime && (
                  <span className="text-gray-400 text-xs">
                    • {movie.runtime} min
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight drop-shadow-md">
                {movie.title}
              </h2>
              {movie.original_title && movie.original_title !== movie.title && (
                <p className="text-xs sm:text-sm text-gray-400 italic">
                  Título original: {movie.original_title}
                </p>
              )}
            </div>

            {/* Quick Watchlist Action in banner */}
            <button
              onClick={() => toggleWatchlist(movie.tmdb_id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex-shrink-0 ${
                inWatchlist
                  ? 'bg-rose-600 border-rose-500 text-white shadow-lg'
                  : 'bg-black/80 border-gray-700 text-gray-300 hover:text-white hover:border-[#ff5400]'
              }`}
              title={inWatchlist ? 'Quitar de mi lista' : 'Guardar en mi lista'}
            >
              <Heart className={`w-5 h-5 ${inWatchlist ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-8 max-h-[60vh] overflow-y-auto">
          
          {/* Top Meta: Genres + Ratings */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
            {/* Genres */}
            <div className="flex flex-wrap items-center gap-2">
              {movie.genres?.map((g) => (
                <span
                  key={g.id || g.name}
                  className="bg-gray-800/90 text-gray-300 border border-gray-700 text-xs font-semibold px-3 py-1 rounded-full"
                >
                  {g.name}
                </span>
              ))}
            </div>

            {/* Ratings */}
            <div className="flex items-center gap-4 text-sm font-bold">
              <div className="flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-xl">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{movie.vote_average ? movie.vote_average.toFixed(1) : '-'} / 10</span>
                <span className="text-xs text-gray-400 font-normal ml-1">
                  ({movie.vote_count} votos)
                </span>
              </div>
            </div>
          </div>

          {/* Synopsis */}
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#ff5400] flex items-center gap-2">
              <Film className="w-4 h-4" /> Sinopsis
            </h3>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-sans">
              {movie.overview || 'No hay sinopsis disponible para esta película.'}
            </p>
          </div>

          {/* AI Horror Characteristics Analysis Breakdown */}
          <div className="space-y-4 bg-black/40 border border-gray-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-[#ff5400]" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  Análisis de Características por Inteligencia Artificial
                </h3>
              </div>
              <span className="text-[11px] text-gray-400 font-mono">
                Escala 0 al 10
              </span>
            </div>

            {Object.keys(chars).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {charLabels.map(({ key, label, color }) => {
                  const score = chars[key] ?? 0
                  const percent = Math.min(100, Math.max(0, score * 10))

                  return (
                    <div key={key} className="space-y-1 bg-[#181822] p-2.5 rounded-xl border border-gray-800">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-300">{label}</span>
                        <span className={`font-mono font-bold ${score >= 7 ? 'text-[#ff5400]' : 'text-gray-400'}`}>
                          {score} / 10
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Pendiente de análisis por IA (ejecuta analyze_movies.py).
              </p>
            )}
          </div>

          {/* Watch Providers in Spain Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#ff5400] flex items-center gap-2">
              <Tv className="w-4 h-4" /> Dónde Ver en España
            </h3>

            {hasAnyProviders ? (
              <div className="space-y-4">
                
                {/* Flatrate (Suscripción) */}
                {flatrate.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Incluida en Suscripción
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {flatrate.map((p) => (
                        <div
                          key={p.provider_id}
                          className="flex items-center gap-2.5 bg-[#181824] border border-gray-700/80 px-3 py-1.5 rounded-xl hover:border-[#ff5400] transition-colors"
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                            alt={p.provider_name}
                            className="w-7 h-7 rounded-lg shadow-sm"
                          />
                          <span className="text-xs font-semibold text-white">
                            {p.provider_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rent (Alquiler) */}
                {rent.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Alquiler Digital
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {rent.map((p) => (
                        <div
                          key={p.provider_id}
                          className="flex items-center gap-2.5 bg-[#181824] border border-gray-700/80 px-3 py-1.5 rounded-xl"
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                            alt={p.provider_name}
                            className="w-6 h-6 rounded-lg shadow-sm"
                          />
                          <span className="text-xs font-medium text-gray-300">
                            {p.provider_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buy (Compra) */}
                {buy.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                      Compra Digital
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {buy.map((p) => (
                        <div
                          key={p.provider_id}
                          className="flex items-center gap-2.5 bg-[#181824] border border-gray-700/80 px-3 py-1.5 rounded-xl"
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                            alt={p.provider_name}
                            className="w-6 h-6 rounded-lg shadow-sm"
                          />
                          <span className="text-xs font-medium text-gray-300">
                            {p.provider_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#161620] border border-gray-800 text-xs text-gray-400">
                ⚠️ Actualmente no hay información de disponibilidad en streaming para España en TMDB.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}

