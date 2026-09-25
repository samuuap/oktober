import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Lock, Loader, Skull, RotateCcw, Check, Film } from 'lucide-react'
import { buildChallenge, challengeTypeForDay, CHALLENGE_META } from '../lib/challenges'

const IMG = (path, size = 'w500') => `https://image.tmdb.org/t/p/${size}${path}`

export const ChallengeModal = ({ isOpen, day, year, pool, onClose, onSolved, onOpenDetail }) => {
  const [challenge, setChallenge] = useState(null)
  const [roundIndex, setRoundIndex] = useState(0)
  const [picked, setPicked] = useState(null)
  const [status, setStatus] = useState('playing') // playing | failed | unlocking | revealed | error
  const [attempts, setAttempts] = useState(1)
  const [revealed, setRevealed] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const type = day ? challengeTypeForDay(day.day_number, year) : 'trivia'
  const meta = CHALLENGE_META[type]

  // Al superar un día, el pool de preguntas cambia (deja de excluir esa
  // película). Si `start` dependiera de él, el efecto de abajo se
  // relanzaría y borraría la pantalla de revelación justo al mostrarla.
  // Guardamos los valores en refs para que `start` sea estable.
  const poolRef = useRef(pool)
  const typeRef = useRef(type)

  useEffect(() => { poolRef.current = pool }, [pool])
  useEffect(() => { typeRef.current = type }, [type])

  const start = useCallback(() => {
    setChallenge(buildChallenge(typeRef.current, poolRef.current))
    setRoundIndex(0)
    setPicked(null)
    setStatus('playing')
  }, [])

  // Solo se reinicia al abrir el modal o al cambiar de día
  useEffect(() => {
    if (!isOpen) return
    setAttempts(1)
    setRevealed(null)
    setErrorMessage('')
    start()
  }, [isOpen, day?.day_number, start])

  useEffect(() => {
    if (!isOpen) return
    const handler = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !day) return null

  const round = challenge?.rounds[roundIndex]

  const unlock = async () => {
    setStatus('unlocking')
    try {
      const movie = await onSolved(day.day_number, { challengeType: type, attempts })
      setRevealed(movie)
      setStatus('revealed')
    } catch (err) {
      console.error('Error desbloqueando el día:', err)
      setErrorMessage(err.message || 'No se pudo guardar el desbloqueo')
      setStatus('error')
    }
  }

  const answer = (optionId) => {
    if (picked !== null || status !== 'playing') return
    setPicked(optionId)

    const correct = optionId === round.answerId

    setTimeout(() => {
      if (!correct) {
        setStatus('failed')
        return
      }

      if (roundIndex + 1 < challenge.rounds.length) {
        setRoundIndex((index) => index + 1)
        setPicked(null)
      } else {
        unlock()
      }
    }, 750)
  }

  const retry = () => {
    setAttempts((value) => value + 1)
    start()
  }

  const optionClasses = (optionId) => {
    if (picked === null) {
      return 'border-gray-700 bg-[#14141c] hover:border-[#ff5400] hover:bg-[#1b1b26] text-gray-100'
    }
    if (optionId === round.answerId) {
      return 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
    }
    if (optionId === picked) {
      return 'border-red-500 bg-red-500/15 text-red-200'
    }
    return 'border-gray-800 bg-[#101018] text-gray-500'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/92 backdrop-blur-lg overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl my-auto bg-[#0c0c11] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">

        {/* Ambiente */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#ff5400]/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/70 border border-gray-700 text-gray-400 hover:text-[#ff5400] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera */}
        <div className="relative px-6 pt-7 pb-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ff5400]/10 border border-[#ff5400]/40 flex items-center justify-center text-2xl">
              {meta.emoji}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#ff5400] font-bold">
                Día {day.day_number} · Prueba {attempts > 1 ? `· intento ${attempts}` : ''}
              </p>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">
                {meta.name}
              </h2>
              <p className="text-xs text-gray-500">{meta.tagline}</p>
            </div>
          </div>

          {/* Progreso de rondas */}
          {challenge && status === 'playing' && (
            <div className="flex items-center gap-1.5 mt-5">
              {challenge.rounds.map((item, index) => (
                <div
                  key={item.id}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    index < roundIndex
                      ? 'bg-emerald-500'
                      : index === roundIndex
                        ? 'bg-[#ff5400]'
                        : 'bg-gray-800'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">

          {/* ---------- Sin catálogo suficiente ---------- */}
          {!challenge && status === 'playing' && (
            <div className="text-center space-y-4 py-8">
              <Skull className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm text-gray-400">
                No hay películas suficientes en la base de datos para montar la prueba.
              </p>
              <button
                onClick={unlock}
                className="px-6 py-3 bg-[#ff5400] text-black font-black uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Abrir el día igualmente
              </button>
            </div>
          )}

          {/* ---------- Jugando ---------- */}
          {challenge && status === 'playing' && round && (
            <div className="space-y-5">
              <h3 className="text-base sm:text-lg font-bold text-white text-center leading-snug">
                {round.prompt}
              </h3>

              {round.kind === 'poster' && (
                <div className="flex justify-center">
                  <div className="relative w-48 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-gray-800 bg-black">
                    <img
                      src={IMG(round.posterPath)}
                      alt="Póster misterioso"
                      className="w-full h-full object-cover scale-110"
                      style={{ filter: `blur(${picked ? 0 : round.blur}px) grayscale(${picked ? 0 : 0.35})` }}
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                </div>
              )}

              {round.kind === 'synopsis' && (
                <blockquote className="text-sm text-gray-300 leading-relaxed bg-black/50 border-l-2 border-[#ff5400] rounded-r-xl p-4 italic">
                  {round.text}
                </blockquote>
              )}

              {round.kind === 'duel' ? (
                <div className="grid grid-cols-2 gap-4">
                  {round.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => answer(option.id)}
                      disabled={picked !== null}
                      className={`group rounded-2xl border-2 overflow-hidden transition-all cursor-pointer disabled:cursor-default ${optionClasses(option.id)}`}
                    >
                      <div className="aspect-[2/3] bg-black overflow-hidden">
                        {option.posterPath && (
                          <img
                            src={IMG(option.posterPath)}
                            alt={option.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                      </div>
                      <p className="text-xs font-bold p-3 text-center line-clamp-2">
                        {option.label}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {round.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => answer(option.id)}
                      disabled={picked !== null}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer disabled:cursor-default ${optionClasses(option.id)}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------- Fallo ---------- */}
          {status === 'failed' && (
            <div className="text-center space-y-5 py-6 animate-shake">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/40">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-wider text-white">
                  La puerta se cierra
                </h3>
                <p className="text-sm text-gray-400">
                  Has fallado. El día {day.day_number} sigue sellado… pero puedes volver a intentarlo con otras preguntas.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-3 border-2 border-gray-700 text-gray-300 text-sm font-bold uppercase tracking-wider rounded-xl hover:border-gray-600 transition-all cursor-pointer"
                >
                  Salir
                </button>
                <button
                  onClick={retry}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff5400] hover:bg-[#ff6a1a] text-black text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* ---------- Abriendo ---------- */}
          {status === 'unlocking' && (
            <div className="text-center space-y-4 py-12">
              <Loader className="w-10 h-10 text-[#ff5400] animate-spin mx-auto" />
              <p className="text-sm font-bold uppercase tracking-widest text-[#ff5400] animate-pulse">
                Abriendo el día {day.day_number}…
              </p>
            </div>
          )}

          {/* ---------- Error al guardar ---------- */}
          {status === 'error' && (
            <div className="text-center space-y-4 py-8">
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 px-4 py-3 rounded-xl">
                {errorMessage}
              </p>
              <button
                onClick={unlock}
                className="px-6 py-3 bg-[#ff5400] text-black font-black uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* ---------- Revelación ---------- */}
          {status === 'revealed' && (
            <div className="space-y-5 animate-reveal">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/40 px-4 py-1.5 rounded-full">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                    Día {day.day_number} desbloqueado
                  </span>
                </div>
              </div>

              {revealed ? (
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start bg-black/40 border border-gray-800 rounded-2xl p-5">
                  {revealed.poster_path && (
                    <img
                      src={IMG(revealed.poster_path)}
                      alt={revealed.title}
                      className="w-32 sm:w-36 rounded-xl border border-gray-700 shadow-xl flex-shrink-0"
                    />
                  )}
                  <div className="space-y-2 text-center sm:text-left">
                    {day.theme && (
                      <span className="inline-block bg-[#ff5400]/15 border border-[#ff5400]/40 text-[#ff5400] text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
                        {day.theme}
                      </span>
                    )}
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                      {revealed.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {[revealed.year, revealed.runtime ? `${revealed.runtime} min` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {day.note && (
                      <p className="text-sm text-gray-400 italic leading-relaxed pt-1">
                        “{day.note}”
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center">
                  Día abierto, pero no hay película asignada todavía.
                </p>
              )}

              <div className="flex gap-3">
                {revealed && (
                  <button
                    onClick={() => { onOpenDetail?.(revealed); onClose() }}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-[#ff5400] hover:bg-[#ff6a1a] text-black text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    <Film className="w-4 h-4" />
                    Ver ficha completa
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-3 border-2 border-gray-700 text-gray-300 text-sm font-bold uppercase tracking-wider rounded-xl hover:border-gray-600 transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
