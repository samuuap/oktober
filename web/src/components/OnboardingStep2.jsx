import React, { useState, useEffect } from 'react'
import { Heart, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const OnboardingStep2 = ({ preferences, onNext, onBack }) => {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])

  useEffect(() => {
    fetchFilteredMovies()
  }, [])

  const fetchFilteredMovies = async () => {
    try {
      setLoading(true)

      // Lista curada: películas MUY CONOCIDAS que representan cada subgénero
      const representativeMovies = [
        694,    // The Shining (psicológico, atmosfera)
        539,    // Psycho (suspense, slasher clásico)
        348,    // Alien (sci-fi terror, tensión)
        807,    // Se7en (thriller oscuro, perturbador)
        274,    // The Silence of the Lambs (psicológico)
        745,    // The Sixth Sense (sobrenatural suave)
        482,    // A Nightmare on Elm Street (slasher, jump scares)
        4348,   // Let the Right One In (vampiros atmosférico)
        9552,   // Shaun of the Dead (zombies + humor)
        1724,   // The Cabinet of Dr. Caligari (clásico expresionista)
        419430, // Get Out (terror social, psicológico)
        423108, // Hereditary (terror familiar, perturbador)
        530385, // Midsommar (folk horror, atmosférico)
        346,    // The Blair Witch Project (found footage)
        4488    // Friday the 13th (slasher clásico)
      ]

      // Fetch estas películas específicas
      const { data, error } = await supabase
        .from('movies')
        .select('tmdb_id, title, poster_path, characteristics, vote_average, popularity')
        .in('tmdb_id', representativeMovies)

      if (error) throw error

      // Si no hay suficientes, completar con populares
      if ((data || []).length < 15) {
        const { data: additionalData } = await supabase
          .from('movies')
          .select('tmdb_id, title, poster_path, characteristics, vote_average, popularity')
          .not('tmdb_id', 'in', `(${representativeMovies.join(',')})`)
          .not('characteristics', 'is', null)
          .order('popularity', { ascending: false })
          .limit(15 - (data || []).length)

        setMovies([...(data || []), ...(additionalData || [])])
      } else {
        setMovies(data || [])
      }
    } catch (err) {
      console.error('Error fetching movies:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleMovie = (tmdbId) => {
    setSelected(prev =>
      prev.includes(tmdbId)
        ? prev.filter(id => id !== tmdbId)
        : [...prev, tmdbId]
    )
  }

  const handleContinue = () => {
    if (selected.length < 3) return
    onNext({ likedMovies: selected })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader className="w-12 h-12 text-[#ff5400] animate-spin" />
        <p className="text-sm text-gray-400">Cargando películas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-black uppercase tracking-wider text-white">
          Elige Tus Favoritas
        </h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Estas son películas icónicas que representan diferentes subgéneros. Marca al menos 3 que te gusten o te interesen.
        </p>
        <div className="inline-flex items-center gap-2 bg-[#ff5400]/10 border border-[#ff5400]/40 px-4 py-2 rounded-full">
          <Heart className="w-4 h-4 text-[#ff5400]" />
          <span className="text-sm font-bold text-[#ff5400]">
            {selected.length} / 3 mínimo
          </span>
        </div>
      </div>

      {/* Movies Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {movies.map((movie) => {
          const isSelected = selected.includes(movie.tmdb_id)
          const posterUrl = movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=500&q=80'

          return (
            <button
              key={movie.tmdb_id}
              onClick={() => toggleMovie(movie.tmdb_id)}
              className={`group relative aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all ${
                isSelected
                  ? 'border-[#ff5400] shadow-lg shadow-[#ff5400]/30 scale-105'
                  : 'border-gray-800 hover:border-gray-600'
              }`}
            >
              {/* Poster */}
              <img
                src={posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent transition-opacity ${
                isSelected ? 'opacity-90' : 'opacity-60 group-hover:opacity-80'
              }`} />

              {/* Heart Icon */}
              <div className="absolute top-2 right-2 z-10">
                <div className={`p-2 rounded-full transition-all ${
                  isSelected
                    ? 'bg-[#ff5400] shadow-lg'
                    : 'bg-black/60 group-hover:bg-black/80'
                }`}>
                  <Heart
                    className={`w-4 h-4 transition-all ${
                      isSelected
                        ? 'text-white fill-white'
                        : 'text-gray-400 group-hover:text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Title */}
              <div className="absolute bottom-0 inset-x-0 p-2">
                <p className="text-xs font-bold text-white line-clamp-2">
                  {movie.title}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 border-2 border-gray-700 text-gray-300 font-bold uppercase tracking-wider rounded-xl hover:border-gray-600 transition-all"
        >
          ← Volver
        </button>

        <button
          onClick={handleContinue}
          disabled={selected.length < 3}
          className={`flex-1 py-3 px-6 font-black uppercase tracking-wider rounded-xl transition-all ${
            selected.length >= 3
              ? 'bg-[#ff5400] hover:bg-[#ff6a1a] text-black shadow-lg hover:shadow-[0_0_30px_rgba(255,84,0,0.4)]'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}
