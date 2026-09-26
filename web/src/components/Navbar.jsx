import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Search, Heart, User, LogOut, Skull, Menu, X, SlidersHorizontal } from 'lucide-react'

export const Navbar = ({
  view,
  setView,
  searchQuery,
  onSearch,
  onOpenAuth,
  onOpenWatchlist,
  onOpenOnboarding
}) => {
  const { user, signOut, watchlist, userProfile } = useAuth()
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { id: 'official', label: 'Calendario Oficial 🎃' },
    { id: 'mine', label: 'Mi Calendario', requireAuth: true },
    { id: 'explore', label: 'Explorar' },
    { id: 'inspiration', label: 'Inspiración' },
    { id: 'admin', label: 'Admin', requireAdmin: true }
  ]

  const visibleLinks = navLinks.filter((link) => {
    if (link.requireAuth && !user) return false
    if (link.requireAdmin && userProfile?.role !== 'admin') return false
    return true
  })

  const linkClasses = (id) =>
    `px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
      view === id
        ? 'text-[#ff5400] bg-[#ff5400]/10 border border-[#ff5400]/40 shadow-[0_0_10px_rgba(255,84,0,0.2)]'
        : 'text-gray-300 hover:text-white hover:bg-white/5'
    }`

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#09090c]/90 backdrop-blur-md border-b border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <button
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setView('official')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff5400] to-[#e11d48] flex items-center justify-center shadow-[0_0_20px_rgba(255,84,0,0.5)]">
              <Skull className="w-6 h-6 text-black" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase font-sans leading-none">
                OKT<span className="text-[#ff5400]">OBER</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#ff5400]/80 font-bold mt-0.5">
                31 noches, 31 puertas
              </span>
            </div>
          </button>

          {/* Navegación */}
          <div className="hidden lg:flex items-center space-x-1">
            {visibleLinks.map((link) => (
              <button key={link.id} onClick={() => setView(link.id)} className={linkClasses(link.id)}>
                {link.label}
              </button>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3">

            <div className="relative hidden md:block w-44 xl:w-56">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Buscar película…"
                className="w-full bg-[#16161f] border border-gray-700/70 focus:border-[#ff5400] text-white text-xs rounded-full pl-9 pr-3 py-2 outline-none transition-all placeholder:text-gray-500"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearch('')}
                  className="absolute right-3 top-2 text-gray-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={onOpenWatchlist}
              className="relative p-2 rounded-xl bg-[#16161f] border border-gray-800 text-gray-300 hover:text-[#ff5400] hover:border-[#ff5400]/50 transition-all cursor-pointer"
              title="Mi lista"
            >
              <Heart className="w-5 h-5" />
              {watchlist.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#ff5400] text-black text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  {watchlist.length}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[#16161f] border border-[#ff5400]/40 text-white text-xs font-semibold hover:border-[#ff5400] transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[#ff5400] text-black font-black flex items-center justify-center text-xs uppercase">
                    {(userProfile?.username || user.email || 'U')[0]}
                  </div>
                  <span className="hidden sm:inline max-w-[110px] truncate">
                    {userProfile?.username || user.email?.split('@')[0]}
                  </span>
                </button>

                {userDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#16161f] border border-gray-700 shadow-2xl p-2 z-50 animate-fadeIn">
                      <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-400">
                        Conectado como:
                        <p className="font-semibold text-white truncate">{user.email}</p>
                      </div>

                      <button
                        onClick={() => { onOpenOnboarding(); setUserDropdownOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-[#ff5400] hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-left"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Mis gustos de terror</span>
                      </button>

                      <button
                        onClick={() => { onOpenWatchlist(); setUserDropdownOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-[#ff5400] hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-left"
                      >
                        <Heart className="w-4 h-4" />
                        <span>Mi lista ({watchlist.length})</span>
                      </button>

                      <button
                        onClick={() => { signOut(); setUserDropdownOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-[#ff5400] to-[#e11d48] text-white text-xs font-extrabold uppercase tracking-wider hover:brightness-110 shadow-[0_0_15px_rgba(255,84,0,0.4)] transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Entrar</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0e0e14] border-b border-gray-800 px-4 py-4 space-y-2 animate-fadeIn">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Buscar película…"
              className="w-full bg-[#16161f] border border-gray-700 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none"
            />
          </div>

          {visibleLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => { setView(link.id); setMobileMenuOpen(false) }}
              className={`w-full text-left ${linkClasses(link.id)}`}
            >
              {link.label}
            </button>
          ))}

          {user && (
            <button
              onClick={() => { onOpenOnboarding(); setMobileMenuOpen(false) }}
              className="w-full text-left px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white cursor-pointer"
            >
              Mis gustos de terror
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
