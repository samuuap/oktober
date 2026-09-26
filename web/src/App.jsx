import React, { useState, useEffect, Suspense, lazy } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { MovieDetailModal } from './components/MovieDetailModal'
import { AuthModal } from './components/AuthModal'
import { WatchlistModal } from './components/WatchlistModal'
import { OnboardingModal } from './components/OnboardingModal'
import { AmbientPlayer } from './components/AmbientPlayer'
import { OfficialCalendar } from './pages/OfficialCalendar'

// El calendario oficial es la portada y entra en el bundle principal.
// Las demás vistas se cargan al pisarlas: quien solo mira el calendario
// no descarga Explorar, Mi calendario ni el panel de admin.
const MyCalendar = lazy(() => import('./pages/MyCalendar').then((m) => ({ default: m.MyCalendar })))
const Explore = lazy(() => import('./pages/Explore').then((m) => ({ default: m.Explore })))
const Inspiration = lazy(() => import('./pages/Inspiration').then((m) => ({ default: m.Inspiration })))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))

const Spinner = ({ label }) => (
  <div className="flex-1 flex flex-col items-center justify-center py-40 space-y-4">
    <div className="w-16 h-16 rounded-full border-4 border-[#ff5400]/30 border-t-[#ff5400] animate-spin" />
    <p className="text-sm font-bold uppercase tracking-widest text-[#ff5400] animate-pulse">{label}</p>
  </div>
)
import { emptyFilters } from './lib/movieFilters'
import { Skull } from 'lucide-react'

const MOVIE_FIELDS =
  // Sin watch_providers a propósito: son 511 KB de los 1,2 MB que pesaba
  // esta consulta y solo se usan en la ficha, que ahora los pide sola.
  'tmdb_id, title, original_title, overview, poster_path, backdrop_path, year, runtime, vote_average, vote_count, genres, characteristics, popularity'

export function App() {
  const { refreshProfile, watchlist } = useAuth()

  const [view, setView] = useState('official')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedMovie, setSelectedMovie] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [watchlistOpen, setWatchlistOpen] = useState(false)

  // Estado de filtros de Explorar; vive aquí para que no se pierda
  // al cambiar de pestaña y para que el buscador de la barra lo alimente.
  const [filters, setFilters] = useState(emptyFilters)

  useEffect(() => {
    async function fetchMovies() {
      try {
        const { data, error } = await supabase
          .from('movies')
          .select(MOVIE_FIELDS)
          // nullsFirst: en Postgres los NULL encabezan un DESC, así que una
          // película sin popularity adelantaría a todo el catálogo y acabaría
          // de portada en el Hero.
          .order('popularity', { ascending: false, nullsFirst: false })
          .limit(1000)

        if (error) throw error
        setMovies(data || [])
      } catch (err) {
        console.error('Error cargando el catálogo:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
  }, [])

  const handleSearch = (query) => {
    setFilters((prev) => ({ ...prev, query }))
    if (query) setView('explore')
  }

  return (
    <div className="min-h-screen bg-[#09090c] text-gray-100 flex flex-col font-sans selection:bg-[#ff5400] selection:text-black">

      <Navbar
        view={view}
        setView={setView}
        searchQuery={filters.query}
        onSearch={handleSearch}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenWatchlist={() => setWatchlistOpen(true)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />

      <main className="flex-1">
        {/* El calendario oficial se pinta sin esperar al catálogo: solo lo
            necesita para generar las preguntas, y eso ocurre al abrir una
            puerta. Antes la portada aguardaba a 1,2 MB de películas. */}
        {view === 'official' && (
          <OfficialCalendar
            movies={movies}
            onSelectMovie={setSelectedMovie}
            onRequireAuth={() => setAuthModalOpen(true)}
            onOpenOnboarding={() => setOnboardingOpen(true)}
          />
        )}

        {view !== 'official' && (
          loading ? (
            <Spinner label="Invocando las películas del terror…" />
          ) : (
            <Suspense fallback={<Spinner label="Abriendo…" />}>
              {view === 'mine' && (
                <MyCalendar
                  movies={movies}
                  onSelectMovie={setSelectedMovie}
                  onRequireAuth={() => setAuthModalOpen(true)}
                  onOpenOnboarding={() => setOnboardingOpen(true)}
                />
              )}

              {view === 'explore' && (
                <Explore
                  movies={movies}
                  filters={filters}
                  setFilters={setFilters}
                  onSelectMovie={setSelectedMovie}
                />
              )}

              {view === 'inspiration' && <Inspiration onSelectMovie={setSelectedMovie} />}

              {view === 'admin' && <AdminDashboard />}
            </Suspense>
          )
        )}
      </main>

      <footer className="mt-20 border-t border-gray-800/80 bg-[#07070a] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Skull className="w-5 h-5 text-[#ff5400]" />
            <span className="text-xl font-black uppercase tracking-widest text-white">
              OKT<span className="text-[#ff5400]">OBER</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Un calendario de adviento para octubre: 31 puertas selladas, una prueba detrás de cada
            una y un calendario paralelo hecho a tu medida.
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-gray-600">
            <span>Datos de TMDB</span>
            <span>•</span>
            <span>Análisis por DeepSeek AI</span>
            <span>•</span>
            <span>Supabase</span>
          </div>
        </div>
      </footer>

      {/* Fuera de <main> y de las vistas: si viviera dentro del contador, la
          música se cortaría al cambiar de pestaña. */}
      <AmbientPlayer />

      <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />

      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={() => {
          refreshProfile()
          setOnboardingOpen(false)
          setView('mine')
        }}
      />

      <WatchlistModal
        isOpen={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        watchlistIds={watchlist}
        allMovies={movies}
        onSelectMovie={setSelectedMovie}
      />
    </div>
  )
}

export default App
