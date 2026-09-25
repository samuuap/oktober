import React from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import {
  TRAITS,
  DECADES,
  RATINGS,
  SORTS,
  AVAILABILITY,
  emptyFilters,
  isFiltering
} from '../lib/movieFilters'

// Barra de filtros compartida: se usa en Explorar y dentro del
// buscador que permite cambiar películas del calendario personal.
export const MovieFilters = ({ filters, setFilters, platforms, resultCount, compact = false }) => {
  const update = (patch) => setFilters({ ...filters, ...patch })

  const toggleTrait = (traitId) => {
    const active = filters.traits.includes(traitId)
    update({
      traits: active
        ? filters.traits.filter((id) => id !== traitId)
        : [...filters.traits, traitId]
    })
  }

  const selectClass =
    'bg-[#181822] border border-gray-800 text-xs text-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#ff5400] cursor-pointer'

  return (
    <div className={`space-y-3 ${compact ? '' : 'bg-[#12121a] p-4 rounded-2xl border border-gray-800/80'}`}>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={filters.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder="Buscar por título…"
          className="w-full bg-[#181822] border border-gray-800 focus:border-[#ff5400] text-white text-sm rounded-xl pl-10 pr-9 py-2.5 outline-none transition-all placeholder:text-gray-600"
        />
        {filters.query && (
          <button
            onClick={() => update({ query: '' })}
            className="absolute right-3 top-3 text-gray-500 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Categorías de la IA */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mr-1">
          <SlidersHorizontal className="w-3 h-3" /> Categorías
        </span>
        {TRAITS.map((trait) => {
          const active = filters.traits.includes(trait.id)
          return (
            <button
              key={trait.id}
              onClick={() => toggleTrait(trait.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${
                active
                  ? 'bg-[#ff5400] text-black border-[#ff5400] shadow-[0_0_12px_rgba(255,84,0,0.35)]'
                  : 'bg-[#181822] text-gray-300 border-gray-800 hover:text-white hover:border-gray-600'
              }`}
            >
              {trait.emoji} {trait.label}
            </button>
          )
        })}
      </div>

      {/* Selectores */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filters.platform}
          onChange={(event) => update({ platform: event.target.value })}
          className={selectClass}
        >
          <option value="all">📺 Todas las plataformas</option>
          {platforms.map((platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.label} ({platform.count})
            </option>
          ))}
        </select>

        <select
          value={filters.availability}
          onChange={(event) => update({ availability: event.target.value })}
          className={selectClass}
        >
          {AVAILABILITY.map((option) => (
            <option key={option.id} value={option.id}>💳 {option.label}</option>
          ))}
        </select>

        <select
          value={filters.decade}
          onChange={(event) => update({ decade: event.target.value })}
          className={selectClass}
        >
          {DECADES.map((option) => (
            <option key={option.id} value={option.id}>📅 {option.label}</option>
          ))}
        </select>

        <select
          value={filters.minRating}
          onChange={(event) => update({ minRating: event.target.value })}
          className={selectClass}
        >
          {RATINGS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>

        <select
          value={filters.sort}
          onChange={(event) => update({ sort: event.target.value })}
          className={selectClass}
        >
          {SORTS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>

        {isFiltering(filters) && (
          <button
            onClick={() => setFilters({ ...emptyFilters, sort: filters.sort })}
            className="text-[11px] font-bold uppercase tracking-wider text-[#ff5400] hover:underline cursor-pointer px-2"
          >
            Limpiar
          </button>
        )}

        {typeof resultCount === 'number' && (
          <span className="ml-auto text-[11px] font-semibold text-gray-400 bg-[#181822] border border-gray-800 px-3 py-1.5 rounded-full">
            {resultCount} {resultCount === 1 ? 'película' : 'películas'}
          </span>
        )}
      </div>
    </div>
  )
}
