import React from 'react'
import { Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react'

export const FilterBar = ({
  selectedTrait,
  setSelectedTrait,
  selectedPlatform,
  setSelectedPlatform,
  sortBy,
  setSortBy
}) => {
  const traitFilters = [
    { id: 'all', label: 'Todo el Terror' },
    { id: 'slasher', label: '🔪 Slasher' },
    { id: 'gore', label: '🩸 Puro Gore' },
    { id: 'sobrenatural', label: '👻 Sobrenatural' },
    { id: 'psicologico', label: '🧠 Psicológico' },
    { id: 'tension', label: '⚡ Tensión' },
    { id: 'jump_scares', label: '😱 Jump Scares' },
    { id: 'body_horror', label: '🫀 Body Horror' },
  ]

  const platforms = [
    { id: 'all', label: 'Todas las plataformas' },
    { id: 'Netflix', label: 'Netflix' },
    { id: 'Amazon Prime Video', label: 'Prime Video' },
    { id: 'Apple TV', label: 'Apple TV' },
    { id: 'Movistar Plus+', label: 'Movistar+' },
    { id: 'Filmin', label: 'Filmin' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8 space-y-4">
      
      {/* Top Filter Chips */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-[#12121a] p-4 rounded-2xl border border-gray-800/80">
        
        {/* Characteristics Filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 hidden sm:inline mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Género IA:
          </span>
          {traitFilters.map((trait) => (
            <button
              key={trait.id}
              onClick={() => setSelectedTrait(trait.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedTrait === trait.id
                  ? 'bg-[#ff5400] text-black shadow-[0_0_12px_rgba(255,84,0,0.4)]'
                  : 'bg-[#181822] text-gray-300 hover:text-white hover:bg-[#202030] border border-gray-800'
              }`}
            >
              {trait.label}
            </button>
          ))}
        </div>

        {/* Right Sort & Platform selectors */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          
          {/* Platform Selector in Spain */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-[#181822] border border-gray-800 text-xs text-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#ff5400] cursor-pointer"
          >
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                📺 {p.label}
              </option>
            ))}
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#181822] border border-gray-800 text-xs text-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#ff5400] cursor-pointer"
          >
            <option value="popularity">🔥 Más Populares</option>
            <option value="vote_average">⭐ Mejor Valoradas</option>
            <option value="year_desc">📅 Más Recientes</option>
            <option value="year_asc">📼 Clásicos del Terror</option>
            <option value="gore">🩸 Más Sangrientas (Gore)</option>
            <option value="slasher">🔪 Más Slasher</option>
          </select>

        </div>

      </div>

    </div>
  )
}

