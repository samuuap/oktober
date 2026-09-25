// ============================================================
// Pruebas de desbloqueo del calendario oficial
//
// Cada día está sellado. Para abrirlo hay que superar una prueba
// que se genera sola a partir del catálogo: no hay contenido
// escrito a mano, así que nunca se agota ni se queda obsoleto.
//
// El TIPO de prueba es fijo por día (todo el mundo se enfrenta al
// mismo reto el día 7), pero las preguntas se re-sortean en cada
// intento para que reintentar no sea memorizar.
// ============================================================

import { TRAITS } from './movieFilters'

export const CHALLENGE_TYPES = ['trivia', 'poster', 'synopsis', 'duel']

export const CHALLENGE_META = {
  trivia: {
    name: 'Interrogatorio',
    tagline: 'Tres preguntas. Ningún fallo.',
    emoji: '🕯️'
  },
  poster: {
    name: 'Entre sombras',
    tagline: 'Reconoce el póster tras la niebla.',
    emoji: '🌫️'
  },
  synopsis: {
    name: 'Psicofonía',
    tagline: 'Una sinopsis censurada. Averigua de quién habla.',
    emoji: '📻'
  },
  duel: {
    name: 'Balanza de sangre',
    tagline: 'Cara a cara: decide cuál es peor.',
    emoji: '⚖️'
  }
}

// El tipo depende del día, no del usuario ni del intento.
export function challengeTypeForDay(dayNumber, year) {
  const index = Math.abs(year * 3 + dayNumber * 7) % CHALLENGE_TYPES.length
  return CHALLENGE_TYPES[index]
}

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)]
}

// n películas distintas (por título, para no mostrar dos veces lo mismo)
function sampleMovies(pool, n) {
  const chosen = []
  const seenTitles = new Set()

  for (const movie of shuffle(pool)) {
    const key = (movie.title || '').toLowerCase()
    if (seenTitles.has(key)) continue
    seenTitles.add(key)
    chosen.push(movie)
    if (chosen.length === n) break
  }

  return chosen
}

// Tacha el título dentro de la sinopsis para que no sea un regalo
function censorTitle(text, movie) {
  if (!text) return ''

  const words = [movie.title, movie.original_title]
    .filter(Boolean)
    .flatMap((title) => title.split(/[\s:,.\-–—'"!?]+/))
    .filter((word) => word.length > 3)

  let censored = text
  for (const word of new Set(words)) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    censored = censored.replace(new RegExp(escaped, 'gi'), '█████')
  }

  return censored
}

function toOptions(movies, answer) {
  return {
    options: shuffle(
      movies.map((movie) => ({
        id: String(movie.tmdb_id),
        label: movie.title,
        posterPath: movie.poster_path
      }))
    ),
    answerId: String(answer.tmdb_id)
  }
}

// ------------------------------------------------------------
// Generadores de ronda
// ------------------------------------------------------------

function yearRound(pool) {
  const candidates = pool.filter((m) => m.year)
  if (candidates.length < 1) return null

  const movie = pick(candidates)
  const decoys = new Set()
  let guard = 0

  while (decoys.size < 3 && guard < 50) {
    guard++
    const offset = Math.floor(Math.random() * 11) - 5
    const year = movie.year + (offset === 0 ? 3 : offset)
    if (year !== movie.year && year > 1900 && year <= new Date().getFullYear()) {
      decoys.add(year)
    }
  }

  if (decoys.size < 3) return null

  const years = shuffle([movie.year, ...decoys])

  return {
    kind: 'text',
    prompt: `¿En qué año se estrenó «${movie.title}»?`,
    options: years.map((year) => ({ id: String(year), label: String(year) })),
    answerId: String(movie.year)
  }
}

function ratingRound(pool) {
  const candidates = pool.filter((m) => typeof m.vote_average === 'number')

  for (let attempt = 0; attempt < 20; attempt++) {
    const movies = sampleMovies(candidates, 4)
    if (movies.length < 4) return null

    const sorted = [...movies].sort((a, b) => b.vote_average - a.vote_average)
    // Margen claro para que la pregunta tenga una única respuesta justa
    if (sorted[0].vote_average - sorted[1].vote_average < 0.5) continue

    return {
      kind: 'text',
      prompt: '¿Cuál de estas tiene mejor nota en TMDB?',
      ...toOptions(movies, sorted[0])
    }
  }

  return null
}

function traitRound(pool) {
  const candidates = pool.filter((m) => m.characteristics)

  for (let attempt = 0; attempt < 25; attempt++) {
    const trait = pick(TRAITS)
    const movies = sampleMovies(candidates, 4)
    if (movies.length < 4) return null

    const score = (movie) => movie.characteristics?.[trait.id] ?? 0
    const sorted = [...movies].sort((a, b) => score(b) - score(a))
    if (score(sorted[0]) - score(sorted[1]) < 3) continue

    return {
      kind: 'text',
      prompt: `Según el análisis de la IA, ¿cuál es la más ${trait.label.toLowerCase()}? ${trait.emoji}`,
      ...toOptions(movies, sorted[0])
    }
  }

  return null
}

function synopsisRound(pool) {
  const candidates = pool.filter((m) => (m.overview || '').length > 90)

  for (let attempt = 0; attempt < 20; attempt++) {
    const movies = sampleMovies(candidates, 4)
    if (movies.length < 4) return null

    const target = movies[0]
    const text = censorTitle(target.overview, target)

    return {
      kind: 'synopsis',
      prompt: '¿A qué película pertenece esta sinopsis?',
      text,
      ...toOptions(movies, target)
    }
  }

  return null
}

function posterRound(pool, blur) {
  const candidates = pool.filter((m) => m.poster_path)
  const movies = sampleMovies(candidates, 4)
  if (movies.length < 4) return null

  const target = movies[0]

  return {
    kind: 'poster',
    prompt: '¿De qué película es este póster?',
    posterPath: target.poster_path,
    blur,
    ...toOptions(movies, target)
  }
}

function duelRound(pool) {
  const candidates = pool.filter((m) => m.characteristics && m.poster_path)

  for (let attempt = 0; attempt < 30; attempt++) {
    const trait = pick(TRAITS)
    const movies = sampleMovies(candidates, 2)
    if (movies.length < 2) return null

    const score = (movie) => movie.characteristics?.[trait.id] ?? 0
    const sorted = [...movies].sort((a, b) => score(b) - score(a))
    if (score(sorted[0]) - score(sorted[1]) < 3) continue

    return {
      kind: 'duel',
      prompt: `¿Cuál tiene más ${trait.label.toLowerCase()}? ${trait.emoji}`,
      ...toOptions(movies, sorted[0])
    }
  }

  return null
}

// Intenta varios generadores hasta que uno devuelva una ronda válida
function firstValid(generators) {
  for (const generator of generators) {
    const round = generator()
    if (round) return round
  }
  return null
}

// ------------------------------------------------------------
// Construcción de la prueba completa
// ------------------------------------------------------------

export function isPoolUsable(pool) {
  return Array.isArray(pool) && pool.length >= 8
}

/**
 * Construye una prueba jugable.
 * @param {string} type  tipo de prueba (challengeTypeForDay)
 * @param {Array}  pool  catálogo disponible, ya sin las películas por revelar
 * @returns {{type, rounds}|null}
 */
export function buildChallenge(type, pool) {
  if (!isPoolUsable(pool)) return null

  const usable = pool.filter((movie) => movie.title && movie.tmdb_id)
  const rounds = []

  if (type === 'trivia') {
    const generators = shuffle([
      () => yearRound(usable),
      () => ratingRound(usable),
      () => traitRound(usable),
      () => synopsisRound(usable)
    ])

    for (const generator of generators) {
      if (rounds.length === 3) break
      const round = generator()
      if (round) rounds.push(round)
    }

    // Si algún generador no pudo cumplir sus restricciones, rellenamos
    while (rounds.length < 3) {
      const round = firstValid([
        () => posterRound(usable, 10),
        () => yearRound(usable)
      ])
      if (!round) break
      rounds.push(round)
    }
  }

  if (type === 'poster') {
    for (const blur of [14, 9]) {
      const round = posterRound(usable, blur)
      if (round) rounds.push(round)
    }
  }

  if (type === 'synopsis') {
    for (let i = 0; i < 2; i++) {
      const round = firstValid([
        () => synopsisRound(usable),
        () => traitRound(usable)
      ])
      if (round) rounds.push(round)
    }
  }

  if (type === 'duel') {
    for (let i = 0; i < 3; i++) {
      const round = firstValid([
        () => duelRound(usable),
        () => ratingRound(usable)
      ])
      if (round) rounds.push(round)
    }
  }

  if (rounds.length === 0) return null

  return {
    type,
    rounds: rounds.map((round, index) => ({ ...round, id: `${type}-${index}-${Date.now()}` }))
  }
}
