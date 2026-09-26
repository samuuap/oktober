// ============================================================
// Filtros de catálogo compartidos
// Se usan en la página Explorar y en el buscador que permite
// cambiar películas del calendario personal.
// ============================================================

// Las 10 categorías que puntúa la IA (analyze_movies.py)
// `label` es el nombre del rasgo (filtros, etiquetas). `ask` es ese mismo
// rasgo convertido en pregunta, para las pruebas del calendario.
//
// Hace falta escribirla a mano: encajar la etiqueta en una plantilla del
// tipo «¿cuál es la más ___?» solo funciona con los adjetivos. Con los
// sustantivos sale «la más atmósfera» o «la más jump scares», que no es
// castellano. Va sin signos ni mayúscula inicial para poder encajarla
// tanto suelta como detrás de una coma.
//
// Los términos de género van en inglés —body horror, gore, slasher,
// screamer— porque es como se llaman aquí; traducirlos suena a doblaje.
export const TRAITS = [
  { id: 'terror', label: 'Terror', emoji: '💀', ask: 'cuál da más miedo' },
  { id: 'gore', label: 'Gore', emoji: '🩸', ask: 'cuál tiene más gore' },
  { id: 'tension', label: 'Tensión', emoji: '⚡', ask: 'cuál tiene más tensión' },
  { id: 'slasher', label: 'Slasher', emoji: '🔪', ask: 'cuál es más slasher' },
  { id: 'sobrenatural', label: 'Sobrenatural', emoji: '👻', ask: 'cuál es más sobrenatural' },
  { id: 'psicologico', label: 'Psicológico', emoji: '🧠', ask: 'cuál es más psicológica' },
  { id: 'body_horror', label: 'Body horror', emoji: '🫀', ask: 'cuál tiene más body horror' },
  { id: 'jump_scares', label: 'Screamers', emoji: '😱', ask: 'cuál tiene más screamers' },
  { id: 'atmosfera', label: 'Atmósfera', emoji: '🌫️', ask: 'cuál es más atmosférica' },
  { id: 'humor', label: 'Humor negro', emoji: '🤡', ask: 'cuál tiene más humor negro' }
]

export const TRAIT_LABELS = Object.fromEntries(TRAITS.map((t) => [t.id, t.label]))

// Umbral a partir del cual consideramos que una película "es" de ese género
export const TRAIT_THRESHOLD = 6

export const DECADES = [
  { id: 'all', label: 'Cualquier época' },
  { id: '2020', label: '2020s' },
  { id: '2010', label: '2010s' },
  { id: '2000', label: '2000s' },
  { id: '1990', label: '90s' },
  { id: '1980', label: '80s' },
  { id: '1970', label: '70s' },
  { id: 'classic', label: 'Antes de 1970' }
]

export const RATINGS = [
  { id: 'all', label: 'Cualquier nota' },
  { id: '6', label: '6+ ⭐' },
  { id: '7', label: '7+ ⭐' },
  { id: '8', label: '8+ ⭐' }
]

export const SORTS = [
  { id: 'popularity', label: '🔥 Más populares' },
  { id: 'vote_average', label: '⭐ Mejor valoradas' },
  { id: 'year_desc', label: '📅 Más recientes' },
  { id: 'year_asc', label: '📼 Clásicos primero' },
  { id: 'title', label: '🔤 Título (A-Z)' },
  { id: 'runtime_asc', label: '⏱️ Más cortas' }
]

export const AVAILABILITY = [
  { id: 'all', label: 'Cualquier forma' },
  { id: 'flatrate', label: 'Incluida en suscripción' },
  { id: 'rent', label: 'Alquiler' },
  { id: 'buy', label: 'Compra' }
]

export const emptyFilters = {
  query: '',
  traits: [],
  platform: 'all',
  availability: 'all',
  decade: 'all',
  minRating: 'all',
  sort: 'popularity'
}

export function isFiltering(filters) {
  return (
    filters.query.trim() !== '' ||
    filters.traits.length > 0 ||
    filters.platform !== 'all' ||
    filters.availability !== 'all' ||
    filters.decade !== 'all' ||
    filters.minRating !== 'all'
  )
}

// Devuelve los proveedores que realmente aparecen en el catálogo,
// ordenados por número de películas disponibles.
export function collectPlatforms(movies) {
  const counts = new Map()

  for (const movie of movies) {
    const providers = movie.watch_providers || {}
    const names = new Set()

    for (const type of ['flatrate', 'rent', 'buy']) {
      for (const provider of providers[type] || []) {
        if (provider?.provider_name) names.add(provider.provider_name)
      }
    }

    for (const name of names) {
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ id: name, label: name, count }))
}

function matchesDecade(movie, decade) {
  if (decade === 'all') return true
  if (!movie.year) return false
  if (decade === 'classic') return movie.year < 1970

  const start = Number(decade)
  return movie.year >= start && movie.year < start + 10
}

function providerLists(movie, availability) {
  const providers = movie.watch_providers || {}

  if (availability === 'all') {
    return [
      ...(providers.flatrate || []),
      ...(providers.rent || []),
      ...(providers.buy || [])
    ]
  }

  return providers[availability] || []
}

export function filterMovies(movies, filters) {
  const query = filters.query.trim().toLowerCase()

  const result = movies.filter((movie) => {
    if (query) {
      const title = movie.title?.toLowerCase() || ''
      const original = movie.original_title?.toLowerCase() || ''
      if (!title.includes(query) && !original.includes(query)) return false
    }

    // Todas las categorías seleccionadas deben cumplirse (AND)
    for (const trait of filters.traits) {
      if ((movie.characteristics?.[trait] || 0) < TRAIT_THRESHOLD) return false
    }

    if (!matchesDecade(movie, filters.decade)) return false

    if (filters.minRating !== 'all') {
      if ((movie.vote_average || 0) < Number(filters.minRating)) return false
    }

    if (filters.platform !== 'all' || filters.availability !== 'all') {
      const list = providerLists(movie, filters.availability)
      if (list.length === 0) return false

      if (filters.platform !== 'all') {
        const found = list.some((provider) =>
          provider.provider_name?.toLowerCase().includes(filters.platform.toLowerCase())
        )
        if (!found) return false
      }
    }

    return true
  })

  return result.sort((a, b) => {
    switch (filters.sort) {
      case 'vote_average':
        return (b.vote_average || 0) - (a.vote_average || 0)
      case 'year_desc':
        return (b.year || 0) - (a.year || 0)
      case 'year_asc':
        return (a.year || 9999) - (b.year || 9999)
      case 'title':
        return (a.title || '').localeCompare(b.title || '', 'es')
      case 'runtime_asc':
        return (a.runtime || 9999) - (b.runtime || 9999)
      default:
        return (b.popularity || 0) - (a.popularity || 0)
    }
  })
}

export function posterUrl(movie, size = 'w500') {
  return movie?.poster_path
    ? `https://image.tmdb.org/t/p/${size}${movie.poster_path}`
    : null
}
