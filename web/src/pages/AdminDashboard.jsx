import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  Users,
  Calendar,
  Film,
  Trash2,
  Eye,
  Shield,
  Mail,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  X
} from 'lucide-react'

export const AdminDashboard = () => {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    onboardingCompleted: 0,
    totalCalendars: 0,
    totalWatched: 0,
    totalMovies: 0
  })
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [migrationMissing, setMigrationMissing] = useState(false)

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchAdminData()
    }
  }, [userProfile])

  const fetchAdminData = async () => {
    try {
      setLoading(true)

      // 1. Estadísticas generales
      const { count: watchedCount } = await supabase
        .from('calendar_days')
        .select('*', { count: 'exact', head: true })
        .eq('watched', true)

      const { count: movieCount } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })

      // 2. Intentar obtener la lista completa con correos mediante la función RPC segura
      const { data: rpcUsers, error: rpcError } = await supabase.rpc('get_admin_users')

      if (!rpcError && rpcUsers) {
        setMigrationMissing(false)
        const totalU = rpcUsers.length
        const onbDone = rpcUsers.filter((u) => u.onboarding_completed).length
        const totalCals = rpcUsers.reduce((sum, u) => sum + Number(u.calendar_count || 0), 0)

        setStats({
          totalUsers: totalU,
          onboardingCompleted: onbDone,
          totalCalendars: totalCals,
          totalWatched: watchedCount || 0,
          totalMovies: movieCount || 0
        })

        setUsers(
          rpcUsers.map((u) => ({
            ...u,
            calendarCount: Number(u.calendar_count || 0)
          }))
        )
      } else {
        // Fallback si la función RPC aún no está creada en Supabase
        console.warn('RPC get_admin_users no disponible, usando fallback user_profiles:', rpcError)
        setMigrationMissing(true)

        const { count: userCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })

        const { count: onboardingCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('onboarding_completed', true)

        const { count: calendarCount } = await supabase
          .from('user_calendars')
          .select('*', { count: 'exact', head: true })

        const { data: usersData } = await supabase
          .from('user_profiles')
          .select('user_id, username, role, onboarding_completed, onboarding_completed_at, created_at')
          .order('created_at', { ascending: false })

        const usersWithCalendars = await Promise.all(
          (usersData || []).map(async (u) => {
            const { count } = await supabase
              .from('user_calendars')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', u.user_id)

            return { ...u, email: null, calendarCount: count || 0 }
          })
        )

        setStats({
          totalUsers: userCount || 0,
          onboardingCompleted: onboardingCount || 0,
          totalCalendars: calendarCount || 0,
          totalWatched: watchedCount || 0,
          totalMovies: movieCount || 0
        })

        setUsers(usersWithCalendars || [])
      }
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId, userIdentifier) => {
    if (
      !window.confirm(
        `¿Eliminar al usuario "${userIdentifier || userId}" permanentemente? Se eliminarán también sus calendarios y registros asociados.`
      )
    ) {
      return
    }

    try {
      // Intentar primero con la función RPC de admin
      const { error: rpcError } = await supabase.rpc('delete_user_by_admin', {
        target_user_id: userId
      })

      if (rpcError) {
        // Fallback eliminando su perfil
        const { error } = await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userId)

        if (error) throw error
      }

      await fetchAdminData()
      alert('Usuario eliminado con éxito.')
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Error eliminando usuario: ' + (err.message || 'Error desconocido'))
    }
  }

  // Filtrado de usuarios por búsqueda
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter((u) => {
      const matchUsername = u.username && u.username.toLowerCase().includes(q)
      const matchEmail = u.email && u.email.toLowerCase().includes(q)
      const matchRole = u.role && u.role.toLowerCase().includes(q)
      return matchUsername || matchEmail || matchRole
    })
  }, [users, search])

  if (userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acceso Denegado</h1>
          <p className="text-gray-400">No tienes permisos de administrador</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#ff5400]/30 border-t-[#ff5400] rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090c] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ff5400]/15 border border-[#ff5400]/40 flex items-center justify-center">
              <Shield className="w-7 h-7 text-[#ff5400]" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-wider text-white">
                Panel Admin
              </h1>
              <p className="text-sm text-gray-400">Métricas y gestión de usuarios registrados</p>
            </div>
          </div>

          <button
            onClick={fetchAdminData}
            className="px-4 py-2 bg-[#161620] hover:bg-[#20202c] border border-gray-700 text-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Actualizar datos
          </button>
        </div>

        {/* Aviso de migración SQL si no está creada la función */}
        {migrationMissing && (
          <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-200">
                Para ver los correos electrónicos de los usuarios:
              </p>
              <p className="text-gray-300">
                Supabase protege los correos dentro del esquema privado <code className="text-amber-300 font-mono">auth.users</code>.
                Para que el panel de administración pueda mostrarlos de forma segura, ejecuta el archivo{' '}
                <code className="text-white font-mono bg-black/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                  sql/007_admin_users.sql
                </code>{' '}
                en el editor SQL de Supabase.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={Users}
            label="Total Usuarios"
            value={stats.totalUsers}
            color="blue"
          />
          <StatCard
            icon={Users}
            label="Onboarding Completo"
            value={stats.onboardingCompleted}
            color="green"
            subtitle={stats.totalUsers > 0 ? `${Math.round((stats.onboardingCompleted / stats.totalUsers) * 100)}%` : '0%'}
          />
          <StatCard
            icon={Calendar}
            label="Calendarios Creados"
            value={stats.totalCalendars}
            color="purple"
          />
          <StatCard
            icon={Eye}
            label="Películas Vistas"
            value={stats.totalWatched}
            color="orange"
          />
          <StatCard
            icon={Film}
            label="Total Películas DB"
            value={stats.totalMovies}
            color="pink"
          />
        </div>

        {/* Users Table */}
        <div className="bg-[#0d0d10] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">Usuarios Registrados</h2>
              <span className="bg-[#ff5400]/20 text-[#ff5400] text-xs font-black px-2.5 py-0.5 rounded-full border border-[#ff5400]/40">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
              </span>
            </div>

            {/* Buscador de usuarios */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por alias, email o rol…"
                className="w-full bg-[#161620] border border-gray-700/80 focus:border-[#ff5400] text-white text-xs rounded-xl pl-9 pr-8 py-2 outline-none transition-all placeholder:text-gray-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2 text-gray-500 hover:text-white"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#14141c] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3.5 text-left">Usuario / Alias</th>
                  <th className="px-4 py-3.5 text-left">Correo Electrónico</th>
                  <th className="px-4 py-3.5 text-left">Rol</th>
                  <th className="px-4 py-3.5 text-left">Onboarding</th>
                  <th className="px-4 py-3.5 text-left">Calendarios</th>
                  <th className="px-4 py-3.5 text-left">Último Acceso</th>
                  <th className="px-4 py-3.5 text-left">Registro</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      {search ? 'No se encontraron usuarios con ese filtro' : 'No hay usuarios registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-[#14141e] transition-colors">
                      {/* Alias / Usuario */}
                      <td className="px-4 py-3 text-white font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff5400]/30 to-purple-600/30 border border-[#ff5400]/40 flex items-center justify-center font-black text-xs text-[#ff5400] uppercase shrink-0">
                            {(user.username || user.email || 'U')[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-xs truncate">
                              {user.username ? `@${user.username}` : <span className="text-gray-500 italic">Sin alias</span>}
                            </p>
                            <p className="text-[10px] text-gray-600 font-mono truncate" title={user.user_id}>
                              {user.user_id?.slice(0, 8)}…
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Correo Electrónico */}
                      <td className="px-4 py-3">
                        {user.email ? (
                          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
                            <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <a
                              href={`mailto:${user.email}`}
                              className="hover:text-[#ff5400] transition-colors truncate max-w-[200px]"
                              title={user.email}
                            >
                              {user.email}
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 italic">
                            Requiere sql/007_admin_users.sql
                          </span>
                        )}
                      </td>

                      {/* Rol */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            user.role === 'admin'
                              ? 'bg-rose-500/15 border border-rose-500/40 text-rose-400'
                              : 'bg-gray-800 border border-gray-700 text-gray-300'
                          }`}
                        >
                          {user.role === 'admin' && <Shield className="w-3 h-3" />}
                          {user.role || 'user'}
                        </span>
                      </td>

                      {/* Onboarding */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            user.onboarding_completed
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {user.onboarding_completed ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              <span>Completo</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Pendiente</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Calendarios */}
                      <td className="px-4 py-3 text-gray-300 font-semibold text-xs">
                        {user.calendarCount || 0}
                      </td>

                      {/* Último Acceso */}
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '—'}
                      </td>

                      {/* Fecha de Registro */}
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '—'}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteUser(user.user_id, user.username || user.email)}
                          disabled={user.role === 'admin'}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                          title={user.role === 'admin' ? 'No puedes eliminar un admin' : 'Eliminar usuario'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color, subtitle }) => {
  const colors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    green: 'text-green-400 bg-green-500/10 border-green-500/30',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    pink: 'text-pink-400 bg-pink-500/10 border-pink-500/30'
  }

  return (
    <div className={`p-5 rounded-2xl border ${colors[color]} backdrop-blur-sm`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-white">{value}</span>
        {subtitle && (
          <span className="text-xs font-semibold text-gray-400">({subtitle})</span>
        )}
      </div>
    </div>
  )
}
