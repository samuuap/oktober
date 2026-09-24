import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Users, Calendar, Film, TrendingUp, Trash2, Eye, Shield } from 'lucide-react'

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

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchAdminData()
    }
  }, [userProfile])

  const fetchAdminData = async () => {
    try {
      setLoading(true)

      // Get total users
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      // Get onboarding completed
      const { count: onboardingCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('onboarding_completed', true)

      // Get total calendars
      const { count: calendarCount } = await supabase
        .from('user_calendars')
        .select('*', { count: 'exact', head: true })

      // Get total watched movies
      const { count: watchedCount } = await supabase
        .from('calendar_days')
        .select('*', { count: 'exact', head: true })
        .eq('watched', true)

      // Get total movies in DB
      const { count: movieCount } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })

      // Get user list with details
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, username, role, onboarding_completed, onboarding_completed_at, created_at')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Error fetching users:', usersError)
      }

      // Get calendar counts separately
      const usersWithCalendars = await Promise.all(
        (usersData || []).map(async (user) => {
          const { count } = await supabase
            .from('user_calendars')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.user_id)

          return { ...user, calendarCount: count || 0 }
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
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId) => {
    if (!window.confirm('¿Eliminar este usuario permanentemente?')) return

    try {
      // Delete user profile (cascades to calendars, days, stats)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

      // Refresh data
      await fetchAdminData()
      alert('Usuario eliminado')
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Error eliminando usuario')
    }
  }

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
        <div className="flex items-center gap-4">
          <Shield className="w-10 h-10 text-[#ff5400]" />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">
              Panel Admin
            </h1>
            <p className="text-sm text-gray-400">Métricas y gestión de usuarios</p>
          </div>
        </div>

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
            subtitle={`${Math.round((stats.onboardingCompleted / stats.totalUsers) * 100)}%`}
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
        <div className="bg-[#0d0d10] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Usuarios Registrados</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#161620] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Onboarding</th>
                  <th className="px-4 py-3 text-left">Calendarios</th>
                  <th className="px-4 py-3 text-left">Registro</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-[#161620] transition-colors">
                    <td className="px-4 py-3 text-white font-medium">
                      {user.username || 'Sin username'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        user.role === 'admin'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        user.onboarding_completed
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {user.onboarding_completed ? '✓ Completado' : '⏳ Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {user.calendarCount || 0}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteUser(user.user_id)}
                        disabled={user.role === 'admin'}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
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
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black">{value}</span>
        {subtitle && (
          <span className="text-sm text-gray-400">{subtitle}</span>
        )}
      </div>
    </div>
  )
}
