import React from 'react'
import { X, Heart, Trash2, Film } from 'lucide-react'
import { MovieCard } from './MovieCard'

export const WatchlistModal = ({ isOpen, onClose, watchlistIds, allMovies, onSelectMovie }) => {
  if (!isOpen) return null

  const watchlistedMovies = allMovies.filter((m) => watchlistIds.includes(m.tmdb_id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#121218] border border-gray-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-gray-100 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-500">
              <Heart className="w-6 h-6 fill-rose-500" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wider">
                Mi Lista de Terror para Halloween
              </h2>
              <p className="text-xs text-gray-400">
                {watchlistedMovies.length} {watchlistedMovies.length === 1 ? 'película guardada' : 'películas guardadas'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-6">
          {watchlistedMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {watchlistedMovies.map((movie) => (
                <MovieCard
                  key={movie.tmdb_id}
                  movie={movie}
                  onSelect={(m) => {
                    onClose()
                    onSelectMovie(m)
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Film className="w-12 h-12 text-gray-600" />
              <p className="text-base font-bold text-gray-300">Tu lista está vacía</p>
              <p className="text-xs text-gray-500 max-w-sm">
                Haz clic en el icono del corazón en cualquier película para guardarla aquí y organizar tu maratón de Halloween.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

