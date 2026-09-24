import React, { useRef } from 'react'
import { MovieCard } from './MovieCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const MovieCarousel = ({ title, subtitle, icon, movies, onSelectMovie }) => {
  const scrollRef = useRef(null)

  if (!movies || movies.length === 0) return null

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -460 : 460
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div className="my-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide uppercase font-sans">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* Scroll Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-xl bg-[#161620] border border-gray-800 text-gray-300 hover:text-[#ff5400] hover:border-[#ff5400] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-xl bg-[#161620] border border-gray-800 text-gray-300 hover:text-[#ff5400] hover:border-[#ff5400] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel Scroll Area */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 overflow-x-auto no-scrollbar py-3 px-1"
      >
        {movies.map((movie) => (
          <MovieCard
            key={movie.tmdb_id}
            movie={movie}
            onSelect={onSelectMovie}
          />
        ))}
      </div>

    </div>
  )
}

