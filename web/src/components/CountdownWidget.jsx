import React, { useState, useEffect } from 'react'
import { countdownTarget } from '../lib/calendarDates'
import { Flame } from 'lucide-react'

export const CountdownWidget = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  // Antes de octubre mira al día 1, que es cuando arranca el calendario;
  // ya dentro del mes, a la noche de Halloween. Las fechas se calculan en
  // hora de Madrid, igual que el desbloqueo de las puertas.
  const [target, setTarget] = useState(() => countdownTarget())

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const current = countdownTarget(now)

      // Solo cambia al saltar de "falta para el 1 de octubre" a "falta para
      // Halloween". Reemplazar el objeto cada segundo no aportaba nada.
      setTarget((previous) =>
        previous.kind === current.kind && previous.year === current.year ? previous : current
      )

      const difference = current.date.getTime() - now.getTime()

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [])

  // Format with leading zero
  const pad = (num) => String(num).padStart(2, '0')

  return (
    <div className="relative w-full max-w-2xl mx-auto my-8 px-4">
      {/* Outer Glow Box Inspired directly by Image 2 */}
      <div className="relative overflow-hidden rounded-3xl border border-[#ff5400] bg-[#121218]/90 backdrop-blur-xl p-6 sm:p-8 shadow-lg">

        {/* Content */}
        <div className="text-center relative z-10 mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-widest text-[#ff5400] uppercase font-sans flex items-center justify-center gap-2">
            <Flame className="w-6 h-6 text-[#ff5400]" />
            <span>{target.kind === 'start' ? 'EMPIEZA OKTOBER' : 'COUNTDOWN TO HALLOWEEN'}</span>
            <Flame className="w-6 h-6 text-[#ff5400]" />
          </h2>
          <p className="text-xs text-orange-200/60 uppercase tracking-widest mt-1">
            {target.kind === 'start'
              ? 'Las 31 puertas se abren, una cada noche'
              : 'Cada segundo te acerca a la noche de las brujas'}
          </p>
        </div>

        {/* 4 Time Digit Cards */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 relative z-10 max-w-lg mx-auto">
          
          {/* Days */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-black/60 border border-[#ff5400]/70 shadow-[0_0_15px_rgba(255,84,0,0.2)]">
            <span className="text-2xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {pad(timeLeft.days)}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#ff5400] uppercase tracking-wider mt-1">
              DÍAS
            </span>
          </div>

          {/* Hours */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-black/60 border border-[#ff5400]/70 shadow-[0_0_15px_rgba(255,84,0,0.2)]">
            <span className="text-2xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {pad(timeLeft.hours)}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#ff5400] uppercase tracking-wider mt-1">
              HORAS
            </span>
          </div>

          {/* Minutes */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-black/60 border border-[#ff5400]/70 shadow-[0_0_15px_rgba(255,84,0,0.2)]">
            <span className="text-2xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {pad(timeLeft.minutes)}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#ff5400] uppercase tracking-wider mt-1">
              MINUTOS
            </span>
          </div>

          {/* Seconds */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-black/60 border border-[#ff5400]/70">
            <span className="text-2xl sm:text-4xl font-black text-[#ff5400] font-mono tracking-tight">
              {pad(timeLeft.seconds)}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#ff5400] uppercase tracking-wider mt-1">
              SEGUNDOS
            </span>
          </div>

        </div>

        {/* Pie */}
        <div className="text-center mt-6 relative z-10 flex items-center justify-center gap-4">
          <span className="text-sm font-medium text-gray-400 tracking-wide">
            {target.kind === 'start'
              ? `1 de Octubre de ${target.year} • Arranca OKTOBER`
              : '31 de Octubre • La Noche Más Oscura'}
          </span>
        </div>

      </div>
    </div>
  )
}

