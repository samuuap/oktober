import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { X, Mail, Lock, Sparkles, Skull, Eye, EyeOff } from 'lucide-react'

export const AuthModal = ({ isOpen, onClose, onOpenOnboarding }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, saveUserProfile } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al iniciar sesión con Google')
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage('')

    try {
      if (isLogin) {
        await signInWithEmail(email, password)
        onClose()
      } else {
        // Validations for signup
        if (!username.trim()) {
          setError('El nombre de usuario es requerido')
          setLoading(false)
          return
        }

        if (username.length < 3 || username.length > 20) {
          setError('El nombre de usuario debe tener entre 3 y 20 caracteres')
          setLoading(false)
          return
        }

        const usernameRegex = /^[a-zA-Z0-9_-]+$/
        if (!usernameRegex.test(username)) {
          setError('Solo letras, números, guiones y guiones bajos')
          setLoading(false)
          return
        }

        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres')
          setLoading(false)
          return
        }

        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden')
          setLoading(false)
          return
        }

        // Signup
        const { user } = await signUpWithEmail(email, password)

        // Create basic profile with username
        try {
          await saveUserProfile({
            username: username.toLowerCase(),
            onboarding_completed: false
          })
        } catch (profileErr) {
          if (profileErr.message?.includes('duplicate') || profileErr.code === '23505') {
            setError('Este nombre de usuario ya está en uso')
            setLoading(false)
            return
          }
        }

        setSuccessMessage('¡Cuenta creada! Ahora configura tus preferencias.')
        setTimeout(() => {
          onClose()
          onOpenOnboarding?.()
        }, 1500)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error en la autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Halloween Modal Card */}
      <div className="relative w-full max-w-md bg-[#121218] border border-gray-700 rounded-2xl p-7 shadow-2xl text-gray-100 overflow-hidden">

        {/* Background ambient */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#ff5400]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-[#ff5400] transition-colors rounded-full hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#ff5400]/10 border border-[#ff5400]/30 text-[#ff5400] mb-3">
            <Skull className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-wider text-white uppercase font-sans">
            {isLogin ? 'Acceso al Santuario' : 'Únete al Aquelarre'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {isLogin
              ? 'Guarda tus películas favoritas y personaliza tu noche de Halloween'
              : 'Regístrate para crear tu lista del terror personalizada'}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
            {isLogin ? 'Inicia sesión' : 'Crea tu cuenta'}
          </span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username field (signup only) */}
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Nombre de Usuario
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="tu-nombre"
                  maxLength={20}
                  className="w-full bg-[#181822] border border-gray-700/80 focus:border-[#ff5400] focus:ring-1 focus:ring-[#ff5400] text-white text-sm rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-gray-600"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                3-20 caracteres, solo letras, números, guiones y guiones bajos
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full bg-[#181822] border border-gray-700/80 focus:border-[#ff5400] focus:ring-1 focus:ring-[#ff5400] text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder:text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-[#181822] border border-gray-700/80 focus:border-[#ff5400] focus:ring-1 focus:ring-[#ff5400] text-white text-sm rounded-xl pl-10 pr-10 py-2.5 outline-none transition-all placeholder:text-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!isLogin && (
              <p className="text-[10px] text-gray-500 mt-1">
                Mínimo 6 caracteres
              </p>
            )}
          </div>

          {/* Confirm password (signup only) */}
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#181822] border border-gray-700/80 focus:border-[#ff5400] focus:ring-1 focus:ring-[#ff5400] text-white text-sm rounded-xl pl-10 pr-10 py-2.5 outline-none transition-all placeholder:text-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none cursor-pointer"
                  title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#ff5400] to-[#e11d48] text-white font-bold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isLogin ? 'Entrar al Terror' : 'Crear Cuenta'}</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="mt-6 text-center text-xs text-gray-400">
          {isLogin ? (
            <p>
              ¿Aún no tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(null); }}
                className="text-[#ff5400] font-semibold hover:underline cursor-pointer ml-1"
              >
                Regístrate gratis
              </button>
            </p>
          ) : (
            <p>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(null); }}
                className="text-[#ff5400] font-semibold hover:underline cursor-pointer ml-1"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  )
}

