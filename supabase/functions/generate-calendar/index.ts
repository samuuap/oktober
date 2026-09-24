import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Movie {
  tmdb_id: number
  title: string
  characteristics: Record<string, number>
  runtime: number
  [key: string]: any
}

interface UserProfile {
  preference_scores: Record<string, number>
  liked_movie_ids: number[]
}

// Calcular match score entre película y preferencias usuario
function calculateMatchScore(
  movieChars: Record<string, number>,
  userPrefs: Record<string, number>
): number {
  let sum = 0
  let count = 0

  for (const [key, movieVal] of Object.entries(movieChars)) {
    if (userPrefs[key] !== undefined) {
      sum += movieVal * userPrefs[key]
      count++
    }
  }

  return count > 0 ? sum / count : 5
}

// Obtener género dominante película
function getDominantGenre(movie: Movie): string {
  const chars = movie.characteristics || {}
  const entries = Object.entries(chars).sort((a, b) => b[1] - a[1])
  return entries[0]?.[0] || 'general'
}

// Generar calendario 31 películas
function generateCalendar(
  movies: Movie[],
  userProfile: UserProfile
): Movie[] {
  const { preference_scores, liked_movie_ids } = userProfile

  // 1. Calcular match scores
  const scored = movies.map(movie => ({
    ...movie,
    matchScore: calculateMatchScore(movie.characteristics || {}, preference_scores)
  }))

  // 2. Boost películas que usuario marcó como favoritas
  const boosted = scored.map(movie => {
    if (liked_movie_ids.includes(movie.tmdb_id)) {
      return { ...movie, matchScore: movie.matchScore * 1.3 }
    }
    return movie
  })

  // 3. Ordenar por matchScore
  boosted.sort((a, b) => b.matchScore - a.matchScore)

  // 4. Seleccionar 31 películas con progresión intensidad
  const calendar: Movie[] = []
  const usedGenres: Record<string, number> = {}

  for (let day = 1; day <= 31; day++) {
    // Progresión exponencial:
    // Días 1-15: 0.4-0.6 (suave)
    // Días 16-25: 0.6-0.8 (medio)
    // Días 26-31: 0.8-1.0 (intenso)
    const normalizedDay = (day - 1) / 30 // 0-1
    const intensity = Math.pow(normalizedDay, 1.5) * 0.6 + 0.4 // Curva exponencial

    // Filtrar candidatos no usados
    const candidates = boosted.filter(m => {
      if (calendar.includes(m)) return false

      const genre = getDominantGenre(m)

      // Evitar mismo género en días consecutivos
      if (usedGenres[genre] && usedGenres[genre] >= day - 2) {
        return false
      }

      return true
    })

    if (candidates.length === 0) break

    // Buscar película que match intensidad del día
    const targetScore = intensity * 10

    let bestPick = candidates[0]
    let bestDiff = Math.abs(candidates[0].matchScore - targetScore)

    for (const candidate of candidates.slice(1, 50)) { // Evaluar top 50 para performance
      const diff = Math.abs(candidate.matchScore - targetScore)
      if (diff < bestDiff) {
        bestPick = candidate
        bestDiff = diff
      }
    }

    calendar.push(bestPick)
    usedGenres[getDominantGenre(bestPick)] = day
  }

  return calendar
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente Supabase con auth token del request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Obtener perfil usuario
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('preference_scores, liked_movie_ids')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found. Complete onboarding first.')
    }

    if (!profile.preference_scores) {
      throw new Error('No preferences found. Complete onboarding first.')
    }

    // Obtener todas películas con características
    const { data: movies, error: moviesError } = await supabaseClient
      .from('movies')
      .select('tmdb_id, title, characteristics, runtime, poster_path')
      .not('characteristics', 'is', null)
      .limit(1000)

    if (moviesError || !movies || movies.length === 0) {
      throw new Error('No movies found in database')
    }

    // Generar calendario
    const calendar = generateCalendar(movies, profile)

    if (calendar.length < 31) {
      throw new Error(`Only ${calendar.length} suitable movies found. Need 31.`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        calendar: calendar.slice(0, 31).map((movie, index) => ({
          day_number: index + 1,
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          poster_path: movie.poster_path,
          matchScore: movie.matchScore
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
