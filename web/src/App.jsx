import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { CountdownWidget } from './components/CountdownWidget'
import { Top10Carousel } from './components/Top10Carousel'
import { MovieCarousel } from './components/MovieCarousel'
import { MovieCard } from './components/MovieCard'
import { MovieDetailModal } from './components/MovieDetailModal'
import { AuthModal } from './components/AuthModal'
import { WatchlistModal } from './components/WatchlistModal'
import { OnboardingModal } from './components/OnboardingModal'
import { FilterBar } from './components/FilterBar'
import { OfficialCalendar } from './pages/OfficialCalendar'
import { MyCalendar } from './pages/MyCalendar'
import { AdminDashboard } from './pages/AdminDashboard'
import { Skull, Ghost, Flame, Film } from 'lucide-react'

export function App() {
  const { watchlist } = useAuth()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false)
  const [watchlistModalOpen, setWatchlistModalOpen] = useState(false)

  // Filters and navigation state
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedTrait, setSelectedTrait] = useState('all')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [sortBy, setSortBy] = useState('popularity')

  // Fetch all horror movies from Supabase
  useEffect(() => {
    async function fetchMovies() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('movies')
          .select('*')
          .order('popularity', { ascending: false })
          .limit(1000)

        if (error) {
          console.error('Error fetching movies from Supabase:', error)
        } else {
          setMovies(data || [])
        }
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
  }, [])

  // Thematic collections based on AI characteristics
  const slashers = movies.filter((m) => (m.characteristics?.slasher || 0) >= 6)
  const goreList = movies.filter((m) => (m.characteristics?.gore || 0) >= 6)
  const sobrenaturalList = movies.filter((m) => (m.characteristics?.sobrenatural || 0) >= 6)
  const psicologicoList = movies.filter((m) => (m.characteristics?.psicologico || 0) >= 6)
  const tensionList = movies.filter((m) => (m.characteristics?.tension || 0) >= 7)

  // Filtered & Sorted movies when user searches or applies filters
  const isFiltering =
    searchQuery.trim() !== '' ||
    activeCategory !== 'all' ||
    selectedTrait !== 'all' ||
    selectedPlatform !== 'all' ||
    sortBy !== 'popularity'

  const filteredMovies = movies
    .filter((m) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = m.title?.toLowerCase().includes(q)
        const origMatch = m.original_title?.toLowerCase().includes(q)
        if (!titleMatch && !origMatch) return false
      }

      // Active category filter from Navbar
      if (activeCategory === 'slasher' && (m.characteristics?.slasher || 0) < 6) return false
      if (activeCategory === 'gore' && (m.characteristics?.gore || 0) < 6) return false
      if (activeCategory === 'sobrenatural' && (m.characteristics?.sobrenatural || 0) < 6) return false
      if (activeCategory === 'psicologico' && (m.characteristics?.psicologico || 0) < 6) return false

      // Trait filter from FilterBar
      if (selectedTrait !== 'all') {
        const score = m.characteristics?.[selectedTrait] || 0
        if (score < 6) return false
      }

      // Platform filter in Spain
      if (selectedPlatform !== 'all') {
        const flatrate = m.watch_providers?.flatrate || []
        const rent = m.watch_providers?.rent || []
        const buy = m.watch_providers?.buy || []
        const allProviders = [...flatrate, ...rent, ...buy]
        const hasPlatform = allProviders.some((p) =>
          p.provider_name.toLowerCase().includes(selectedPlatform.toLowerCase())
        )
        if (!hasPlatform) return false
      }

      return true
    })
    .sort((a, b) => {
      if (sortBy === 'vote_average') return (b.vote_average || 0) - (a.vote_average || 0)
      if (sortBy === 'year_desc') return (b.year || 0) - (a.year || 0)
      if (sortBy === 'year_asc') return (a.year || 0) - (b.year || 0)
      if (sortBy === 'gore') return (b.characteristics?.gore || 0) - (a.characteristics?.gore || 0)
      if (sortBy === 'slasher') return (b.characteristics?.slasher || 0) - (a.characteristics?.slasher || 0)
      return (b.popularity || 0) - (a.popularity || 0)
    })

  return (
    <div className="min-h-screen bg-[#09090c] text-gray-100 flex flex-col font-sans selection:bg-[#ff5400] selection:text-black">
      
      {/* Navbar */}
      <Navbar
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenWatchlist={() => setWatchlistModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-40 space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-[#ff5400]/30 border-t-[#ff5400] animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest text-[#ff5400] animate-pulse">
            Invocando las películas del terror...
          </p>
        </div>
      ) : (
        <main className="flex-1">

          {/* Show Official Calendar if selected */}
          {activeCategory === 'calendar' ? (
            <OfficialCalendar onSelectMovie={setSelectedMovie} />
          ) : activeCategory === 'my-calendar' ? (
            <MyCalendar onSelectMovie={setSelectedMovie} />
          ) : activeCategory === 'admin' ? (
            <AdminDashboard />
          ) : (
            <>
              {/* Main Hero (Image 3 inspired) - Only displayed on home mode */}
              {!isFiltering && movies.length > 0 && (
                <Hero movies={movies} onSelectMovie={setSelectedMovie} />
              )}

              {/* Countdown to Halloween Widget (Image 2 inspired) */}
              <CountdownWidget />

              {/* Filter Bar */}
              <FilterBar
                selectedTrait={selectedTrait}
                setSelectedTrait={setSelectedTrait}
                selectedPlatform={selectedPlatform}
                setSelectedPlatform={setSelectedPlatform}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />

          {/* View Mode: Filtered Grid vs Thematic Rows */}
          {isFiltering ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#ff5400]" />
                  <span>Resultados de la Búsqueda</span>
                </h2>
                <span className="text-xs font-semibold text-gray-400 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                  {filteredMovies.length} {filteredMovies.length === 1 ? 'película' : 'películas'}
                </span>
              </div>

              {filteredMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredMovies.map((movie) => (
                    <MovieCard
                      key={movie.tmdb_id}
                      movie={movie}
                      onSelect={setSelectedMovie}
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
                    onClick={() => {
                      setSearchQuery('')
                      setActiveCategory('all')
                      setSelectedTrait('all')
                      setSelectedPlatform('all')
                    }}
                    className="text-xs text-[#ff5400] font-bold uppercase tracking-wider hover:underline"
                  >
                    Restablecer filtros
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Top 10 Screambox Row (Image 1 inspired) */}
              <Top10Carousel movies={movies} onSelectMovie={setSelectedMovie} />

              {/* Slasher Collection */}
              <MovieCarousel
                title="Slasher Bloodbath"
                subtitle="Máscaras, cuchillos y supervivientes (Puntuadas >= 6 por IA)"
                icon="🔪"
                movies={slashers}
                onSelectMovie={setSelectedMovie}
              />

              {/* Gore Collection */}
              <MovieCarousel
                title="Puro Gore & Carnicería"
                subtitle="Efectos prácticos desatados y vísceras (Puntuadas >= 6 por IA)"
                icon="🩸"
                movies={goreList}
                onSelectMovie={setSelectedMovie}
              />

              {/* Supernatural Collection */}
              <MovieCarousel
                title="Presencias & Demonios"
                subtitle="Casas encantadas, exorcismos y terror del más allá"
                icon="👻"
                movies={sobrenaturalList}
                onSelectMovie={setSelectedMovie}
              />

              {/* Psychological Horror Collection */}
              <MovieCarousel
                title="Terror Psicológico"
                subtitle="Paranoia, mentes rotas y giros perturbadores"
                icon="🧠"
                movies={psicologicoList}
                onSelectMovie={setSelectedMovie}
              />

              {/* Extreme Tension Collection */}
              <MovieCarousel
                title="Tensión Inmisericorde"
                subtitle="Suspense asfixiante que no da tregua (Tensión >= 7)"
                icon="⚡"
                movies={tensionList}
                onSelectMovie={setSelectedMovie}
              />
            </>
          )}
          </>
          )}

        </main>
      )}

      {/* Spooky Footer */}
      <footer className="mt-20 border-t border-gray-800/80 bg-[#07070a] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Skull className="w-5 h-5 text-[#ff5400]" />
            <span className="text-xl font-black uppercase tracking-widest text-white">
              OKT<span className="text-[#ff5400]">OBER</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            La plataforma definitiva de cine de terror para la noche de Halloween. Con inteligencia artificial clasificando cada pesadilla y disponibilidad en plataformas en España.
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-gray-600">
            <span>Datos provistos por TMDB</span>
            <span>•</span>
            <span>Análisis por DeepSeek AI</span>
            <span>•</span>
            <span>Supabase Database & Auth</span>
          </div>
        </div>
      </footer>

      {/* Movie Detail Modal */}
      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onOpenOnboarding={() => setOnboardingModalOpen(true)}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={onboardingModalOpen}
        onClose={() => setOnboardingModalOpen(false)}
        onComplete={() => {
          // Refresh profile after onboarding
          window.location.reload()
        }}
      />

      {/* Watchlist Modal */}
      <WatchlistModal
        isOpen={watchlistModalOpen}
        onClose={() => setWatchlistModalOpen(false)}
        watchlistIds={watchlist}
        allMovies={movies}
        onSelectMovie={setSelectedMovie}
      />

    </div>
  )
}
export default App

