import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { OnboardingStep1 } from './OnboardingStep1'
import { OnboardingStep2 } from './OnboardingStep2'
import { OnboardingStep3 } from './OnboardingStep3'

// Accesible en cualquier momento desde el menú de usuario: la
// primera vez define el perfil, después sirve para retocarlo.
export const OnboardingModal = ({ isOpen, onClose, onComplete }) => {
  const { userProfile, hasCompletedOnboarding } = useAuth()
  const [step, setStep] = useState(1)
  const [data, setData] = useState({ preferences: null, likedMovies: [] })

  // Cada apertura empieza limpia, partiendo del perfil guardado
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setData({ preferences: null, likedMovies: [] })
    }
  }, [isOpen])

  if (!isOpen) return null

  const isEditing = hasCompletedOnboarding

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0a0a0d] border border-gray-800 rounded-2xl shadow-2xl">

        {/* Cabecera */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 sm:p-6 bg-[#0a0a0d]/95 backdrop-blur-sm border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] font-bold text-[#ff5400] uppercase tracking-[0.2em]">
                {isEditing ? 'Actualiza tus gustos' : 'Cuéntanos tus gustos'}
              </p>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Paso {step} de 3
              </span>
            </div>

            <div className="w-24 sm:w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ff5400] transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && !isEditing && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Saltar
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 md:p-8">
          {step === 1 && (
            <OnboardingStep1
              initialPreferences={userProfile?.preference_scores}
              onNext={({ preferences }) => {
                setData((prev) => ({ ...prev, preferences }))
                setStep(2)
              }}
            />
          )}

          {step === 2 && (
            <OnboardingStep2
              preferences={data.preferences}
              initialLiked={userProfile?.liked_movie_ids}
              onNext={({ likedMovies }) => {
                setData((prev) => ({ ...prev, likedMovies }))
                setStep(3)
              }}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <OnboardingStep3
              preferences={data.preferences}
              likedMovies={data.likedMovies}
              onBack={() => setStep(2)}
              onComplete={() => { onComplete?.(); onClose() }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
