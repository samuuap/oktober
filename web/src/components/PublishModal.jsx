import React, { useState, useEffect } from 'react'
import { X, Globe, Lock, Loader, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// Un alias público no puede salir del correo: el slug viaja en la URL y
// se ve en la galería. Se lo pedimos al usuario la primera vez que publica.
const ALIAS_RE = /^[a-zA-Z0-9_-]{3,20}$/

function slugify(alias, year) {
  const base = alias
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base}-octubre-${year}`
}

export const PublishModal = ({ isOpen, calendar, onClose, onChanged }) => {
  const { user, userProfile, refreshProfile } = useAuth()

  const [alias, setAlias] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setAlias(userProfile?.username || '')
      setError(null)
    }
  }, [isOpen, userProfile?.username])

  if (!isOpen || !calendar) return null

  const isPublic = calendar.is_public

  const publish = async () => {
    const clean = alias.trim()

    if (!ALIAS_RE.test(clean)) {
      setError('El alias necesita entre 3 y 20 caracteres, sin espacios ni acentos.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      // El alias solo se guarda si cambió: así republicar no choca
      // contra su propio UNIQUE.
      if (clean !== userProfile?.username) {
        const { error: aliasError } = await supabase
          .from('user_profiles')
          .update({ username: clean })
          .eq('user_id', user.id)

        if (aliasError) {
          if (aliasError.code === '23505') {
            setError('Ese alias ya está cogido. Prueba con otro.')
            return
          }
          throw aliasError
        }
        await refreshProfile()
      }

      const { error: pubError } = await supabase
        .from('user_calendars')
        .update({ is_public: true, slug: slugify(clean, calendar.year) })
        .eq('id', calendar.id)

      if (pubError) {
        if (pubError.code === '23505') {
          setError('Ya hay un calendario publicado con ese nombre para este año.')
          return
        }
        throw pubError
      }

      await onChanged()
      onClose()
    } catch (err) {
      console.error('Error publicando el calendario:', err)
      setError(err.message || 'No se pudo publicar')
    } finally {
      setBusy(false)
    }
  }

  const unpublish = async () => {
    setBusy(true)
    setError(null)
    try {
      const { error: hideError } = await supabase
        .from('user_calendars')
        .update({ is_public: false })
        .eq('id', calendar.id)

      if (hideError) throw hideError

      await onChanged()
      onClose()
    } catch (err) {
      console.error('Error retirando el calendario:', err)
      setError(err.message || 'No se pudo retirar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0d0d14] border border-gray-800 rounded-2xl p-6 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/70 border border-gray-700 text-gray-400 hover:text-[#ff5400] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#ff5400]/10 border border-[#ff5400]/40 flex items-center justify-center">
            {isPublic ? <Globe className="w-5 h-5 text-[#ff5400]" /> : <Lock className="w-5 h-5 text-[#ff5400]" />}
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              {isPublic ? 'Calendario publicado' : 'Publicar calendario'}
            </h2>
            <p className="text-xs text-gray-500">
              {isPublic ? 'Cualquiera puede verlo desde Inspiración' : 'Solo tú lo ves ahora mismo'}
            </p>
          </div>
        </div>

        {isPublic ? (
          <>
            <div className="text-sm text-gray-400 space-y-2 leading-relaxed">
              <p>
                Aparece en Inspiración como <span className="text-white font-bold">{userProfile?.username}</span>,
                con sus 31 películas a la vista.
              </p>
              <p className="text-xs text-gray-600">
                Lo que puntúes y marques como visto también se ve. Tu correo no, en ningún caso.
              </p>
            </div>

            <button
              onClick={unpublish}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#16161f] border border-gray-800 text-gray-300 text-xs font-black uppercase tracking-wider rounded-xl hover:border-red-500/60 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Dejar de compartir
            </button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500">
                Con qué nombre quieres aparecer
              </label>
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="cazador-nocturno"
                maxLength={20}
                className="w-full px-4 py-3 bg-[#16161f] border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:border-[#ff5400] focus:outline-none"
              />
              <p className="text-xs text-gray-600 leading-relaxed">
                Es lo único tuyo que se muestra. Entre 3 y 20 caracteres, sin espacios ni acentos.
                Nunca usamos tu correo.
              </p>
            </div>

            <div className="text-xs text-gray-500 bg-[#16161f] border border-gray-800 rounded-xl px-4 py-3 space-y-1">
              <p className="font-bold text-gray-400">Se verá:</p>
              <p>Tu alias, el título del calendario y las 31 películas, con tus notas y lo que lleves visto.</p>
            </div>

            {error && (
              <p className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/40 px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </p>
            )}

            <button
              onClick={publish}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#ff5400] hover:bg-[#ff6a1a] text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Publicar
            </button>
          </>
        )}

        {isPublic && error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 px-4 py-3 rounded-xl">{error}</p>
        )}
      </div>
    </div>
  )
}
