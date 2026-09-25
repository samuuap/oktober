import React, { useMemo, useState } from 'react'
import { X, Star, Check, Ghost } from 'lucide-react'
import { MovieFilters } from './MovieFilters'
import {
  emptyFilters,
  filterMovies,
  collectPlatforms,
  posterUrl
} from '../lib/movieFilters'

const MAX_RESULTS = 120

// Buscador con filtros para elegir con qué película se sustituye
// un día del calendario personal.
export const MoviePickerModal = ({
  isOpen,
  onClose,
  onPick,
  movies,
  dayNumber,
  excludeIds = []
}) => {
  const [filters, setFilters] = useState(emptyFilters)

  const platforms = useMemo(() => collectPlatforms(movies), [movies])
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds])

  const results = useMemo(
    () => filterMovies(movies, filters),
    [movies, filters]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/92 backdrop-blur-lg overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl my-4 bg-[#0c0c11] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">

        {/* Cabecera pegajosa con los filtros */}
        <div className="sticky top-0 z-20 bg-[#0c0c11]/97 backdrop-blur-md border-b border-gray-800 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#ff5400] font-bold">
                Día {dayNumber}
              </p>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">
                Elige otra película
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Filtra por categorías, plataforma, época o nota hasta dar con la tuya.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/70 border border-gray-700 text-gray-400 hover:text-[#ff5400] transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <MovieFilters
            filters={filters}
            setFilters={setFilters}
            platforms={platforms}
            resultCount={results.length}
            compact
          />
        </div>

        {/* Resultados */}
        <div className="p-5">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <Ghost className="w-12 h-12 text-gray-700" />
              <p className="text-sm font-bold text-gray-400">
                Ninguna película cumple esos filtros
              </p>
              <button
                onClick={() => setFilters(emptyFilters)}
                className="text-xs text-[#ff5400] font-bold uppercase tracking-wider hover:underline cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {results.slice(0, MAX_RESULTS).map((movie) => {
                  const alreadyUsed = excluded.has(movie.tmdb_id)
                  const poster = posterUrl(movie)

                  return (
                    <button
                      key={movie.tmdb_id}
                      onClick={() => !alreadyUsed && onPick(movie)}
                      disabled={alreadyUsed}
                      title={alreadyUsed ? 'Ya está en tu calendario' : movie.title}
                      className={`group relative aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all text-left ${
                        alreadyUsed
                          ? 'border-emerald-700/60 opacity-45 cursor-not-allowed'
                          : 'border-gray-800 hover:border-[#ff5400] hover:scale-[1.04] cursor-pointer'
                      }`}
                    >
                      {poster ? (
                        <img
                          src={poster}
                          alt={movie.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#181822]" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85" />

                      {alreadyUsed && (
                        <div className="absolute top-2 right-2 bg-emerald-600 rounded-lg p-1">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-amber-500/40 text-[10px] font-bold text-amber-400">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        {movie.vote_average ? movie.vote_average.toFixed(1) : '-'}
                      </div>

                      <div className="absolute bottom-0 inset-x-0 p-2 space-y-0.5">
                        <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                          {movie.title}
                        </p>
                        <p className="text-[10px] text-gray-400">{movie.year || ''}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {results.length > MAX_RESULTS && (
                <p className="text-center text-xs text-gray-600 pt-6">
                  Mostrando las primeras {MAX_RESULTS} de {results.length}. Afina los filtros para ver el resto.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
