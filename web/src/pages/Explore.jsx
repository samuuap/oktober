import React, { useMemo } from 'react'
import { Film, Ghost } from 'lucide-react'
import { Hero } from '../components/Hero'
import { Top10Carousel } from '../components/Top10Carousel'
import { MovieCarousel } from '../components/MovieCarousel'
import { MovieCard } from '../components/MovieCard'
import { MovieFilters } from '../components/MovieFilters'
import {
  emptyFilters,
  filterMovies,
  collectPlatforms,
  isFiltering,
  TRAIT_THRESHOLD
} from '../lib/movieFilters'

// Catálogo completo. Es la parte "de toda la vida" de OKTOBER:
// sirve para curiosear, no para seguir el calendario.
export const Explore = ({ movies, filters, setFilters, onSelectMovie }) => {
  const platforms = useMemo(() => collectPlatforms(movies), [movies])
  const filtered = useMemo(() => filterMovies(movies, filters), [movies, filters])
  // Ordenar también saca la rejilla: con los carruseles puestos el
  // cambio de orden no se vería por ninguna parte.
  const searching = isFiltering(filters) || filters.sort !== 'popularity'

  const byTrait = (trait, threshold = TRAIT_THRESHOLD) =>
    movies.filter((movie) => (movie.characteristics?.[trait] || 0) >= threshold)

  return (
    <div className="space-y-2">
      {!searching && movies.length > 0 && (
        <Hero movies={movies} onSelectMovie={onSelectMovie} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
        <MovieFilters
          filters={filters}
          setFilters={setFilters}
          platforms={platforms}
          resultCount={searching ? filtered.length : undefined}
        />
      </div>

      {searching ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-[#ff5400]" />
              <span>Resultados</span>
            </h2>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.slice(0, 180).map((movie) => (
                <MovieCard
                  key={movie.tmdb_id}
                  movie={movie}
                  onSelect={onSelectMovie}
                  gridView
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <Ghost className="w-12 h-12 text-gray-600" />
              <p className="text-base font-bold text-gray-300">
                No se encontraron películas con esos criterios
              </p>
              <button
                onClick={() => setFilters(emptyFilters)}
                className="text-xs text-[#ff5400] font-bold uppercase tracking-wider hover:underline cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <Top10Carousel movies={movies} onSelectMovie={onSelectMovie} />

          <MovieCarousel
            title="Slasher Bloodbath"
            subtitle="Máscaras, cuchillos y supervivientes"
            icon="🔪"
            movies={byTrait('slasher')}
            onSelectMovie={onSelectMovie}
          />

          <MovieCarousel
            title="Puro Gore & Carnicería"
            subtitle="Efectos prácticos desatados y vísceras"
            icon="🩸"
            movies={byTrait('gore')}
            onSelectMovie={onSelectMovie}
          />

          <MovieCarousel
            title="Presencias & Demonios"
            subtitle="Casas encantadas, exorcismos y terror del más allá"
            icon="👻"
            movies={byTrait('sobrenatural')}
            onSelectMovie={onSelectMovie}
          />

          <MovieCarousel
            title="Terror Psicológico"
            subtitle="Paranoia, mentes rotas y giros perturbadores"
            icon="🧠"
            movies={byTrait('psicologico')}
            onSelectMovie={onSelectMovie}
          />

          <MovieCarousel
            title="Tensión Inmisericorde"
            subtitle="Suspense asfixiante que no da tregua"
            icon="⚡"
            movies={byTrait('tension', 7)}
            onSelectMovie={onSelectMovie}
          />
        </>
      )}
    </div>
  )
}
