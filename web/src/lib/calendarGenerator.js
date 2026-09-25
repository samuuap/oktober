// ============================================================
// Generador del calendario personal
//
// Mismo algoritmo que la Edge Function `generate-calendar`, pero
// ejecutándose en el navegador sobre el catálogo ya cargado.
// MyCalendar intenta primero la Edge Function y cae aquí si no
// está desplegada o falla, así que generar nunca se queda colgado.
// ============================================================

const DAYS = 31

function matchScore(characteristics = {}, preferences = {}) {
  let sum = 0
  let count = 0

  for (const [key, value] of Object.entries(characteristics)) {
    if (preferences[key] === undefined) continue
    sum += value * preferences[key]
    count++
  }

  return count > 0 ? sum / count : 25
}

function dominantTrait(movie) {
  const entries = Object.entries(movie.characteristics || {})
  if (entries.length === 0) return 'general'
  return entries.sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * Devuelve 31 películas ordenadas del 1 al 31 de octubre.
 *
 * - Puntúa cada película contra el perfil del onboarding.
 * - Sube las que el usuario marcó como favoritas.
 * - Reparte la intensidad en curva ascendente: empieza suave y
 *   reserva lo más bestia para la noche de Halloween.
 * - Evita repetir subgénero dominante en días seguidos.
 */
export function generateCalendar(movies, profile) {
  const preferences = profile?.preference_scores || {}
  const liked = new Set(profile?.liked_movie_ids || [])
  const popularityTaste = preferences.popularity ?? 7

  const candidates = movies
    .filter((movie) => movie.characteristics && movie.tmdb_id)
    .map((movie) => {
      let score = matchScore(movie.characteristics, preferences)
      if (liked.has(movie.tmdb_id)) score *= 1.3
      return { movie, score }
    })

  if (candidates.length === 0) return []

  // El gusto por lo popular decide de qué mitad del catálogo tiramos
  const byPopularity = [...candidates].sort(
    (a, b) => (b.movie.popularity || 0) - (a.movie.popularity || 0)
  )
  const poolSize = Math.max(
    DAYS * 3,
    Math.round(byPopularity.length * (popularityTaste >= 7 ? 0.35 : popularityTaste <= 4 ? 1 : 0.65))
  )
  const pool = byPopularity.slice(0, poolSize)

  const maxScore = Math.max(...pool.map((c) => c.score), 1)
  const calendar = []
  const used = new Set()
  const lastSeenTrait = {}

  for (let day = 1; day <= DAYS; day++) {
    // Curva de intensidad: 0.45 el día 1 → 1.0 el día 31
    const progress = (day - 1) / (DAYS - 1)
    const target = (0.45 + Math.pow(progress, 1.4) * 0.55) * maxScore

    let best = null
    let bestDistance = Infinity

    for (const candidate of pool) {
      if (used.has(candidate.movie.tmdb_id)) continue

      const trait = dominantTrait(candidate.movie)
      const repeated = lastSeenTrait[trait] !== undefined && day - lastSeenTrait[trait] <= 2

      const distance = Math.abs(candidate.score - target) + (repeated ? maxScore * 0.5 : 0)

      if (distance < bestDistance) {
        best = candidate
        bestDistance = distance
      }
    }

    if (!best) break

    used.add(best.movie.tmdb_id)
    lastSeenTrait[dominantTrait(best.movie)] = day
    calendar.push({ day_number: day, tmdb_id: best.movie.tmdb_id, movie: best.movie })
  }

  return calendar
}
