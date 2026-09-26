import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Repeat, Volume2, VolumeX, Music, ChevronDown } from 'lucide-react'

// Para añadir más pistas basta con dejar el fichero en public/audio y
// sumar una entrada aquí: los controles de anterior/siguiente ya cuentan
// con que la lista crezca.
const TRACKS = [
  { id: 'ambiente', title: 'Ambiente de Halloween', src: '/audio/ambiente.m4a' }
]

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export const AmbientPlayer = () => {
  const audioRef = useRef(null)

  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(true)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const track = TRACKS[index]

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = muted ? 0 : volume
  }, [volume, muted])

  // Al cambiar de pista seguimos sonando si ya estábamos sonando.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.load()
    if (playing) audio.play().catch(() => setPlaying(false))
    // `playing` fuera de las dependencias a propósito: aquí solo interesa
    // reaccionar al cambio de pista.
  }, [index])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    try {
      await audio.play()
      setPlaying(true)
    } catch {
      // El navegador bloquea la reproducción sin gesto previo del usuario.
      setPlaying(false)
    }
  }

  const step = (delta) => setIndex((i) => (i + delta + TRACKS.length) % TRACKS.length)

  const onEnded = () => {
    if (loop) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => setPlaying(false))
      return
    }
    if (TRACKS.length > 1) step(1)
    else setPlaying(false)
  }

  const seek = (event) => {
    const value = Number(event.target.value)
    audioRef.current.currentTime = value
    setTime(value)
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <audio
        ref={audioRef}
        src={track.src}
        preload="none"
        onTimeUpdate={(e) => setTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={onEnded}
      />

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          title="Sonido ambiente"
          className={`w-12 h-12 rounded-full border flex items-center justify-center shadow-lg transition-all cursor-pointer ${
            playing
              ? 'bg-[#ff5400] border-[#ff5400] text-black'
              : 'bg-[#0d0d14]/95 border-gray-700 text-gray-400 hover:text-[#ff5400] hover:border-[#ff5400]/60'
          }`}
        >
          <Music className={`w-5 h-5 ${playing ? 'animate-pulse' : ''}`} />
        </button>
      ) : (
        <div className="w-[290px] bg-[#0d0d14]/97 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 space-y-3 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#ff5400]">
                Sonido ambiente
              </p>
              <p className="text-xs font-bold text-white truncate">{track.title}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="shrink-0 p-1 rounded-lg text-gray-500 hover:text-[#ff5400] transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={time}
              onChange={seek}
              className="w-full h-1 accent-[#ff5400] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-gray-600">
              <span>{formatTime(time)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => step(-1)}
              disabled={TRACKS.length < 2}
              title="Anterior"
              className="p-2 text-gray-400 hover:text-[#ff5400] disabled:opacity-30 disabled:hover:text-gray-400 transition-colors cursor-pointer disabled:cursor-default"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={toggle}
              title={playing ? 'Pausar' : 'Reproducir'}
              className="w-11 h-11 rounded-full bg-[#ff5400] hover:bg-[#ff6a1a] text-black flex items-center justify-center transition-colors cursor-pointer"
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              onClick={() => step(1)}
              disabled={TRACKS.length < 2}
              title="Siguiente"
              className="p-2 text-gray-400 hover:text-[#ff5400] disabled:opacity-30 disabled:hover:text-gray-400 transition-colors cursor-pointer disabled:cursor-default"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => setLoop((v) => !v)}
              title={loop ? 'Repetición activada' : 'Repetición desactivada'}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                loop ? 'text-[#ff5400]' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted((v) => !v)}
              title={muted ? 'Quitar silencio' : 'Silenciar'}
              className="p-1 text-gray-500 hover:text-[#ff5400] transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false) }}
              className="flex-1 h-1 accent-[#ff5400] cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  )
}
