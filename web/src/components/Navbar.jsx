import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Search, Heart, User, LogOut, Skull, Flame, Menu, X, Shield } from 'lucide-react'

export const Navbar = ({
  onOpenAuth,
  onOpenWatchlist,
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory
}) => {
  const { user, signOut, watchlist, userProfile } = useAuth()
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { id: 'all', label: 'Inicio' },
    { id: 'calendar', label: 'Calendario Oficial 🎃' },
    { id: 'my-calendar', label: 'Mi Calendario', requireAuth: true },
    { id: 'admin', label: 'Admin', requireAdmin: true },
    { id: 'top10', label: 'Top 10 Screams' },
    { id: 'slasher', label: 'Slashers 🔪' },
    { id: 'gore', label: 'Gore & Sangre 🩸' },
    { id: 'sobrenatural', label: 'Sobrenatural 👻' },
    { id: 'psicologico', label: 'Psicológico 🧠' }
  ]

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#09090c]/90 backdrop-blur-md border-b border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveCategory('all')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff5400] to-[#e11d48] flex items-center justify-center shadow-[0_0_20px_rgba(255,84,0,0.5)]">
              <Skull className="w-6 h-6 text-black" />
            </div>
            <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase font-sans">
                OKT<span className="text-[#ff5400]">OBER</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#ff5400]/80 font-bold -mt-1">
                Halloween Vault
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveCategory(link.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeCategory === link.id
                    ? 'text-[#ff5400] bg-[#ff5400]/10 border border-[#ff5400]/40 shadow-[0_0_10px_rgba(255,84,0,0.2)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right Actions: Search + Watchlist + User Profile */}
          <div className="flex items-center gap-3">
            
            {/* Search Bar */}
            <div className="relative hidden md:block w-48 xl:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar película..."
                className="w-full bg-[#16161f] border border-gray-700/70 focus:border-[#ff5400] text-white text-xs rounded-full pl-9 pr-3 py-2 outline-none transition-all placeholder:text-gray-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Watchlist Counter Button */}
            <button
              onClick={onOpenWatchlist}
              className="relative p-2 rounded-xl bg-[#16161f] border border-gray-800 text-gray-300 hover:text-[#ff5400] hover:border-[#ff5400]/50 transition-all cursor-pointer"
              title="Mi Lista de Halloween"
            >
              <Heart className="w-5 h-5" />
              {watchlist.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#ff5400] text-black text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  {watchlist.length}
                </span>
              )}
            </button>

            {/* User Auth / Profile */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[#16161f] border border-[#ff5400]/40 text-white text-xs font-semibold hover:border-[#ff5400] transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[#ff5400] text-black font-black flex items-center justify-center text-xs uppercase">
                    {user.email ? user.email[0] : 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[110px] truncate">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                </button>

                {/* Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#16161f] border border-gray-700 shadow-2xl p-2 z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-400">
                      Conectado como:
                      <p className="font-semibold text-white truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        onOpenWatchlist()
                        setUserDropdownOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-[#ff5400] hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <Heart className="w-4 h-4" />
                      <span>Mi Lista ({watchlist.length})</span>
                    </button>
                    <button
                      onClick={() => {
                        signOut()
                        setUserDropdownOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
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

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0e0e14] border-b border-gray-800 px-4 py-4 space-y-2 animate-fadeIn">
          {/* Mobile Search */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar película..."
              className="w-full bg-[#16161f] border border-gray-700 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none"
            />
          </div>

          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setActiveCategory(link.id)
                setMobileMenuOpen(false)
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeCategory === link.id
                  ? 'text-[#ff5400] bg-[#ff5400]/10 border border-[#ff5400]/40'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}

