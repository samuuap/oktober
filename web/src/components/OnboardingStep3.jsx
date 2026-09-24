import React, { useState } from 'react'
import { CheckCircle, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const OnboardingStep3 = ({ preferences, likedMovies, onBack, onComplete }) => {
  const { saveUserProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    setLoading(true)

    try {
      await saveUserProfile({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        preference_scores: preferences,
        liked_movie_ids: likedMovies
      })

      onComplete()
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Resumen preferencias
  const getPreferenceSummary = () => {
    const items = []

    if (preferences.gore >= 7) items.push('🩸 Gore intenso')
    else if (preferences.gore <= 3) items.push('🎭 Gore mínimo')

    if (preferences.psicologico >= 7) items.push('🧠 Terror psicológico')
    if (preferences.slasher >= 7) items.push('🔪 Slasher')
    if (preferences.jump_scares >= 7) items.push('⚡ Jump scares')
    else if (preferences.jump_scares <= 3) items.push('🌫️ Tensión atmosférica')

    return items
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/40">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-wider text-white">
          ¡Perfil Listo!
        </h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Tu perfil de terror está configurado. Ahora puedes crear tu calendario personalizado.
        </p>
      </div>

      {/* Summary */}
      <div className="space-y-3 bg-[#0d0d10] p-6 rounded-2xl border border-gray-800">
        <h3 className="text-sm font-bold text-white">Tu Perfil de Terror</h3>

        <div className="flex flex-wrap gap-2">
          {getPreferenceSummary().map((item, idx) => (
            <span
              key={idx}
              className="inline-block bg-[#ff5400]/10 border border-[#ff5400]/40 text-[#ff5400] text-xs font-bold px-3 py-1.5 rounded-full"
            >
              {item}
            </span>
          ))}
        </div>

        <p className="text-xs text-gray-500 pt-2">
          {likedMovies.length} películas seleccionadas como favoritas
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl">
        <p className="text-xs text-blue-400 leading-relaxed">
          💡 Usaremos estas preferencias para generar tu calendario personalizado de 31 películas para octubre. Podrás editarlo después.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 px-3 py-2 rounded-lg text-center">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-6 py-3 border-2 border-gray-700 text-gray-300 font-bold uppercase tracking-wider rounded-xl hover:border-gray-600 transition-all disabled:opacity-50"
        >
          ← Volver
        </button>

        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex-1 py-3 px-6 font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
            loading
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-[#ff5400] hover:bg-[#ff6a1a] text-black shadow-lg hover:shadow-[0_0_30px_rgba(255,84,0,0.4)]'
          }`}
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar y Continuar'
          )}
        </button>
      </div>
    </div>
  )
}
