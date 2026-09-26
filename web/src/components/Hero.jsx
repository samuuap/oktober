import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Play, Info, Heart, Star, Clock, ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const Hero = ({ movies, onSelectMovie }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const { isWatchlisted, toggleWatchlist } = useAuth()
  const intervalRef = useRef(null)

  // Pick top 5 featured horror films (with backdrops and high votes)
  // Se recalculaba en cada rotación del carrusel, cinco veces por minuto.
  const featuredList = useMemo(
    () => movies.filter((m) => m.backdrop_path && m.poster_path).slice(0, 5),
    [movies]
  )

  useEffect(() => {
    if (paused || !featuredList.length) return
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredList.length)
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [paused, featuredList.length])

  if (!featuredList || featuredList.length === 0) return null

  const currentMovie = featuredList[currentIndex] || featuredList[0]
  const inWatchlist = isWatchlisted(currentMovie.tmdb_id)

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredList.length)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredList.length) % featuredList.length)
  }

  // Top characteristics highlights (e.g. Slasher, Gore, etc.)
  const chars = currentMovie.characteristics || {}
  const topChars = Object.entries(chars)
    .filter(([_, val]) => val >= 6)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const backdropUrl = currentMovie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${currentMovie.backdrop_path}`
    : ''

  return (
    <div
      className="relative w-full min-h-[600px] sm:min-h-[680px] lg:min-h-[740px] flex items-center overflow-hidden bg-[#09090c]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      
      {/* Cinematic Full-Bleed Backdrop */}
      {backdropUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 filter brightness-65 scale-105"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        >
          {/* Gradients to fade to dark on sides and bottom */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090c] via-[#09090c]/75 to-transparent sm:w-3/4" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090c] via-transparent to-[#09090c]/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,84,0,0.15),transparent_70%)]" />
        </div>
      )}

      {/* Content Container (Image 3 inspired layout) */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full z-10 flex flex-col justify-between">
        
        {/* Left column: Movie Info */}
        <div className="max-w-2xl space-y-4 pt-4">
          
          {/* Genre / Tagline */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ff5400]">
            <span className="flex items-center gap-1 bg-[#ff5400]/20 px-2.5 py-1 rounded-full border border-[#ff5400]/40">
              <Flame className="w-3.5 h-3.5" /> SELECCIÓN DEL MES
            </span>
            {currentMovie.genres?.slice(0, 3).map((g) => (
              <span key={g.id || g.name} className="text-gray-400">
                • {g.name}
              </span>
            ))}
          </div>

          {/* Main Title & Catchphrase */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase text-white tracking-tight leading-none font-sans drop-shadow-2xl">
              {currentMovie.title}
            </h1>
            {currentMovie.original_title && currentMovie.original_title !== currentMovie.title && (
              <p className="text-sm sm:text-base font-semibold text-gray-400 italic">
                ({currentMovie.original_title})
              </p>
            )}
          </div>

          {/* Metadata: Stars, Year, Runtime, Characteristics Badges */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-300">
            <div className="flex items-center gap-1 text-amber-400 bg-black/50 px-2.5 py-1 rounded-md border border-amber-500/30">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-sm text-white">
                {currentMovie.vote_average ? currentMovie.vote_average.toFixed(1) : 'N/A'}
              </span>
            </div>

            {currentMovie.year && (
              <span className="bg-black/50 px-2.5 py-1 rounded-md border border-gray-800">
                {currentMovie.year}
              </span>
            )}

            {currentMovie.runtime && (
              <span className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-md border border-gray-800">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {currentMovie.runtime} min
              </span>
            )}

            {/* AI Top Characteristics Highlights */}
            {topChars.map(([key, val]) => (
              <span
                key={key}
                className="bg-red-950/60 border border-red-800/60 text-red-300 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider"
              >
                {key}: {val}/10
              </span>
            ))}
          </div>

          {/* Overview text */}
          <p className="text-sm sm:text-base text-gray-300 line-clamp-3 sm:line-clamp-4 leading-relaxed max-w-xl font-sans drop-shadow-md">
            {currentMovie.overview || 'Sinopsis no disponible para esta película de terror.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            
            {/* Watch / Detail Button */}
            <button
              onClick={() => onSelectMovie(currentMovie)}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ff5400] to-[#e11d48] text-white font-extrabold uppercase tracking-wider text-xs sm:text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-xl cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Ver Ficha & Dónde Ver</span>
            </button>

            {/* Watchlist Toggle Button */}
            <button
              onClick={() => toggleWatchlist(currentMovie.tmdb_id)}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                inWatchlist
                  ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                  : 'bg-black/60 border-gray-700/80 text-gray-200 hover:text-white hover:border-[#ff5400]'
              }`}
            >
              <Heart className={`w-4 h-4 ${inWatchlist ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{inWatchlist ? 'En Mi Lista' : 'Añadir a Lista'}</span>
            </button>

          </div>

        </div>

        {/* Bottom Right: Mini Slider Preview (Image 3 inspired) */}
        <div className="self-end mt-8 lg:mt-0 flex flex-col items-end gap-3">
          
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
            {featuredList.map((m, idx) => (
              <button
                key={m.tmdb_id}
                onClick={() => setCurrentIndex(idx)}
                className={`group relative w-16 h-24 sm:w-20 sm:h-30 rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer flex-shrink-0 ${
                  currentIndex === idx
                    ? 'border-[#ff5400] scale-105 shadow-[0_0_20px_rgba(255,84,0,0.6)]'
                    : 'border-gray-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                  alt={m.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute bottom-1 right-1.5 text-[10px] font-black text-white bg-black/80 px-1 rounded">
                  0{idx + 1}
                </div>
              </button>
            ))}
          </div>

          {/* Slider Navigation Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg bg-black/60 border border-gray-800 text-gray-400 hover:text-[#ff5400] hover:border-[#ff5400] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-gray-400">
              0{currentIndex + 1} / 0{featuredList.length}
            </span>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg bg-black/60 border border-gray-800 text-gray-400 hover:text-[#ff5400] hover:border-[#ff5400] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  )
}

