import React from 'react'
import { Star, Heart, Tv } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const MovieCard = ({ movie, onSelect, rankNumber = null }) => {
  const { isWatchlisted, toggleWatchlist } = useAuth()
  const inWatchlist = isWatchlisted(movie.tmdb_id)

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=500&q=80'

  // Determine top horror characteristic
  const chars = movie.characteristics || {}
  const topTrait = Object.entries(chars)
    .filter(([_, val]) => val >= 6)
    .sort((a, b) => b[1] - a[1])[0]

  // Check if available on subscription streaming in Spain
  const flatrateProviders = movie.watch_providers?.flatrate || []
  const hasStreaming = flatrateProviders.length > 0

  return (
    <div
      onClick={() => onSelect(movie)}
      className="group relative flex-shrink-0 cursor-pointer transition-transform duration-300 hover:scale-[1.03] select-none"
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-40 sm:w-48 rounded-2xl overflow-hidden bg-[#161620] border border-gray-800/80 group-hover:border-[#ff5400]/70 group-hover:shadow-[0_0_25px_rgba(255,84,0,0.4)] transition-all">
        
        {/* Poster Image */}
        <img
          src={posterUrl}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges: Rating & Watchlist Quick Button */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
          
          {/* Vote Average Badge */}
          <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-lg border border-amber-500/40 text-[11px] font-bold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{movie.vote_average ? movie.vote_average.toFixed(1) : '-'}</span>
          </div>

          {/* Watchlist Quick Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleWatchlist(movie.tmdb_id)
            }}
            className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${
              inWatchlist
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-black/60 text-gray-300 hover:text-white hover:bg-black/80'
            }`}
            title={inWatchlist ? 'Quitar de mi lista' : 'Guardar en mi lista'}
          >
            <Heart className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-white' : ''}`} />
          </button>

        </div>

        {/* Streaming Platform Badge in Spain (if available) */}
        {hasStreaming && (
          <div className="absolute bottom-14 left-2.5 flex items-center gap-1.5 z-10">
            {flatrateProviders.slice(0, 2).map((p) => (
              <img
                key={p.provider_id}
                src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                alt={p.provider_name}
                title={`Disponible en ${p.provider_name}`}
                className="w-5 h-5 rounded-md shadow-md border border-white/20"
              />
            ))}
            {flatrateProviders.length > 2 && (
              <span className="text-[10px] bg-black/80 text-gray-300 px-1 rounded border border-gray-700">
                +{flatrateProviders.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Bottom Info: Title, Year, Top Characteristic */}
        <div className="absolute bottom-0 inset-x-0 p-3 z-10 space-y-1">
          
          {topTrait && (
            <span className="inline-block bg-[#ff5400]/20 border border-[#ff5400]/40 text-[#ff5400] text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded">
              {topTrait[0]}: {topTrait[1]}/10
            </span>
          )}

          <h3 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-md">
            {movie.title}
          </h3>

          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>{movie.year || 'N/A'}</span>
            {movie.runtime ? <span>{movie.runtime}m</span> : null}
          </div>

        </div>

      </div>
    </div>
  )
}

