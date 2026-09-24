import React, { useState } from 'react'
import { X } from 'lucide-react'
import { OnboardingStep1 } from './OnboardingStep1'
import { OnboardingStep2 } from './OnboardingStep2'
import { OnboardingStep3 } from './OnboardingStep3'

export const OnboardingModal = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    preferences: null,
    likedMovies: []
  })

  if (!isOpen) return null

  const handleStep1Next = ({ preferences }) => {
    setData(prev => ({ ...prev, preferences }))
    setStep(2)
  }

  const handleStep2Next = ({ likedMovies }) => {
    setData(prev => ({ ...prev, likedMovies }))
    setStep(3)
  }

  const handleComplete = () => {
    onComplete?.()
    onClose()
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0a0d] border border-gray-800 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-[#0a0a0d]/95 backdrop-blur-sm border-b border-gray-800">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Paso {step} de 3
            </span>

            {/* Progress Bar */}
            <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ff5400] transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors"
              >
                Saltar
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {step === 1 && (
            <OnboardingStep1 onNext={handleStep1Next} />
          )}

          {step === 2 && (
            <OnboardingStep2
              preferences={data.preferences}
              onNext={handleStep2Next}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <OnboardingStep3
              preferences={data.preferences}
              likedMovies={data.likedMovies}
              onBack={() => setStep(2)}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>
    </div>
  )
}
