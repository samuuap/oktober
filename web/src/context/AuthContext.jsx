import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('oktober_watchlist')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setUserProfile(null)
      return
    }

    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching profile:', error)
      }

      setUserProfile(data || null)
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Sync watchlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('oktober_watchlist', JSON.stringify(watchlist))
    } catch (e) {
      console.error('Error saving watchlist:', e)
    }
  }, [watchlist])

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
    return data
  }

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signUpWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const toggleWatchlist = (tmdbId) => {
    setWatchlist((prev) => {
      if (prev.includes(tmdbId)) {
        return prev.filter((id) => id !== tmdbId)
      } else {
        return [...prev, tmdbId]
      }
    })
  }

  const isWatchlisted = (tmdbId) => {
    return watchlist.includes(tmdbId)
  }

  const saveUserProfile = async (profileData) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    setUserProfile(data)
    return data
  }

  const hasCompletedOnboarding = userProfile?.onboarding_completed || false

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userProfile,
        profileLoading,
        hasCompletedOnboarding,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        watchlist,
        toggleWatchlist,
        isWatchlisted,
        saveUserProfile,
        refreshProfile: () => fetchUserProfile(user?.id)
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

