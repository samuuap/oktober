import React, { useRef } from 'react'
import { MovieCard } from './MovieCard'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'

export const Top10Carousel = ({ movies, onSelectMovie }) => {
  const scrollRef = useRef(null)

  const top10 = [...movies]
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    .slice(0, 10)

  if (!top10 || top10.length === 0) return null

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -420 : 420
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative my-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Section Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 bg-[#ff5400] rounded-full shadow-[0_0_10px_#ff5400]" />
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
            <span>Top 10 Más Aclamadas</span>
            <Flame className="w-5 h-5 text-[#ff5400]" />
          </h2>
        </div>

        {/* Scroll Navigation Arrows */}
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

      {/* Horizontal Carousel (Image 1 Screambox Style with giant numbers) */}
      <div
        ref={scrollRef}
        className="flex items-end gap-2 sm:gap-6 overflow-x-auto no-scrollbar py-4 px-2"
      >
        {top10.map((movie, index) => {
          const rank = index + 1
          return (
            <div
              key={movie.tmdb_id}
              className="flex items-end flex-shrink-0 relative group"
            >
              {/* Giant Hollow Red/Orange Outline Rank Number (Screambox style) */}
              <div className="select-none font-black text-7xl sm:text-8xl lg:text-9xl leading-none -mr-4 sm:-mr-6 z-0 pointer-events-none top-number-outline transition-transform duration-300 group-hover:scale-105">
                {rank}
              </div>

              {/* Card */}
              <div className="relative z-10">
                <MovieCard movie={movie} onSelect={onSelectMovie} rankNumber={rank} />
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

