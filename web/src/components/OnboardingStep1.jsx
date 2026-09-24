import React, { useState } from 'react'
import { Skull, Droplet, Brain, Zap, TrendingUp, Ghost, Swords, Film } from 'lucide-react'

export const OnboardingStep1 = ({ onNext }) => {
  const [preferences, setPreferences] = useState({
    gore: 5,
    slasher: 5,
    psicologico: 5,
    jump_scares: 5,
    terror: 5,
    tension: 5,
    sobrenatural: 5,
    body_horror: 5,
    atmosfera: 5,
    humor: 3,
    popularity: 7  // Preferencia por películas populares vs oscuras
  })

  const handleSliderChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: parseInt(value)
    }))
  }

  const handleSubmit = () => {
    onNext({ preferences })
  }

  const sliders = [
    {
      key: 'gore',
      label: 'Gore / Sangre',
      icon: Droplet,
      color: 'rose',
      description: 'Violencia gráfica y explícita'
    },
    {
      key: 'slasher',
      label: 'Slasher',
      icon: Swords,
      color: 'red',
      description: 'Asesinos en serie, cuchillos, matanzas'
    },
    {
      key: 'psicologico',
      label: 'Terror Psicológico',
      icon: Brain,
      color: 'purple',
      description: 'Miedo mental, confusión, paranoia'
    },
    {
      key: 'jump_scares',
      label: 'Jump Scares',
      icon: Zap,
      color: 'yellow',
      description: 'Sustos repentinos'
    },
    {
      key: 'terror',
      label: 'Nivel Terror General',
      icon: Skull,
      color: 'orange',
      description: 'Intensidad global de miedo'
    },
    {
      key: 'tension',
      label: 'Tensión / Suspense',
      icon: Ghost,
      color: 'blue',
      description: 'Atmósfera inquietante, anticipación'
    },
    {
      key: 'sobrenatural',
      label: 'Sobrenatural',
      icon: Ghost,
      color: 'cyan',
      description: 'Fantasmas, demonios, posesiones'
    },
    {
      key: 'body_horror',
      label: 'Body Horror',
      icon: Skull,
      color: 'pink',
      description: 'Transformaciones corporales grotescas'
    },
    {
      key: 'atmosfera',
      label: 'Atmósfera',
      icon: Film,
      color: 'indigo',
      description: 'Cine atmosférico, slow burn'
    },
    {
      key: 'humor',
      label: 'Humor Negro',
      icon: Skull,
      color: 'green',
      description: 'Comedia mezclada con terror'
    },
    {
      key: 'popularity',
      label: 'Popularidad',
      icon: TrendingUp,
      color: 'amber',
      description: 'Clásicos conocidos vs joyas oscuras'
    }
  ]

  const getColorClasses = (color) => {
    const colors = {
      rose: 'accent-rose-500',
      red: 'accent-red-500',
      purple: 'accent-purple-500',
      yellow: 'accent-yellow-500',
      orange: 'accent-orange-500',
      blue: 'accent-blue-500',
      cyan: 'accent-cyan-500',
      pink: 'accent-pink-500',
      indigo: 'accent-indigo-500',
      green: 'accent-green-500',
      amber: 'accent-amber-500'
    }
    return colors[color] || 'accent-gray-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ff5400]/10 border-2 border-[#ff5400]/40">
          <Skull className="w-8 h-8 text-[#ff5400]" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-wider text-white">
          Personaliza Tu Terror
        </h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Ajusta cada característica según tus preferencias. Cuanto más preciso, mejor será tu calendario.
        </p>
      </div>

      {/* Sliders Grid */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {sliders.map((slider) => {
          const Icon = slider.icon
          const value = preferences[slider.key]

          return (
            <div key={slider.key} className="bg-[#0d0d10] p-5 rounded-xl border border-gray-800">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <Icon className={`w-5 h-5 text-${slider.color}-500`} />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">
                      {slider.label}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {slider.description}
                    </p>
                  </div>
                </div>
                <span className={`text-lg font-black text-${slider.color}-500 min-w-[3rem] text-right`}>
                  {value}/10
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={value}
                  onChange={(e) => handleSliderChange(slider.key, e.target.value)}
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${getColorClasses(slider.color)}`}
                />

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Nada</span>
                  <span className="text-gray-600">
                    {value === 0 && "Desactivado"}
                    {value > 0 && value <= 3 && "Poco"}
                    {value > 3 && value <= 6 && "Moderado"}
                    {value > 6 && value <= 8 && "Alto"}
                    {value > 8 && "Extremo"}
                  </span>
                  <span>Máximo</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Preset Buttons */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
        <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">
          Tipo de Calendario
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPreferences({
              ...preferences,
              popularity: 9
            })}
            className={`p-4 rounded-xl border-2 transition-all ${
              preferences.popularity >= 8
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="text-center space-y-2">
              <TrendingUp className="w-6 h-6 mx-auto text-amber-400" />
              <h4 className="text-sm font-bold text-white">Clásicos Conocidos</h4>
              <p className="text-xs text-gray-400">
                Películas populares y aclamadas que todos reconocen
              </p>
            </div>
          </button>

          <button
            onClick={() => setPreferences({
              ...preferences,
              popularity: 3
            })}
            className={`p-4 rounded-xl border-2 transition-all ${
              preferences.popularity <= 4
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="text-center space-y-2">
              <Ghost className="w-6 h-6 mx-auto text-purple-400" />
              <h4 className="text-sm font-bold text-white">Joyas Ocultas</h4>
              <p className="text-xs text-gray-400">
                Descubre películas menos conocidas pero increíbles
              </p>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center pt-2">
          O ajusta el slider "Popularidad" manualmente arriba
        </p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">
          Perfiles Rápidos
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setPreferences({
              gore: 9, slasher: 9, psicologico: 4, jump_scares: 7, terror: 9,
              tension: 6, sobrenatural: 5, body_horror: 8, atmosfera: 5, humor: 2, popularity: 6
            })}
            className="py-2 px-3 bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-all"
          >
            Gore Extremo
          </button>

          <button
            onClick={() => setPreferences({
              gore: 3, slasher: 3, psicologico: 9, jump_scares: 2, terror: 8,
              tension: 9, sobrenatural: 7, body_horror: 4, atmosfera: 9, humor: 2, popularity: 7
            })}
            className="py-2 px-3 bg-purple-500/10 border border-purple-500/40 text-purple-400 text-xs font-bold rounded-lg hover:bg-purple-500/20 transition-all"
          >
            Psicológico
          </button>

          <button
            onClick={() => setPreferences({
              gore: 5, slasher: 6, psicologico: 5, jump_scares: 5, terror: 7,
              tension: 6, sobrenatural: 6, body_horror: 5, atmosfera: 6, humor: 4, popularity: 8
            })}
            className="py-2 px-3 bg-gray-500/10 border border-gray-500/40 text-gray-400 text-xs font-bold rounded-lg hover:bg-gray-500/20 transition-all"
          >
            Balanceado
          </button>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleSubmit}
        className="w-full py-4 px-6 bg-[#ff5400] hover:bg-[#ff6a1a] text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-lg"
      >
        Continuar →
      </button>
    </div>
  )
}
