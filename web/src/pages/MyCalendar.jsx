import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Calendar, Loader, Sparkles, Edit3, Save, X } from 'lucide-react'

export const MyCalendar = ({ onSelectMovie }) => {
  const { user, userProfile, hasCompletedOnboarding } = useAuth()
  const [calendar, setCalendar] = useState(null)
  const [calendarDays, setCalendarDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      fetchMyCalendar()
    }
  }, [user])

  const fetchMyCalendar = async () => {
    try {
      setLoading(true)

      // Fetch user's calendar for 2024
      const { data: calendarData, error: calError } = await supabase
        .from('user_calendars')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', 2024)
        .single()

      if (calError && calError.code !== 'PGRST116') {
        throw calError
      }

      if (calendarData) {
        setCalendar(calendarData)

        // Fetch calendar days with movie data
        const { data: daysData, error: daysError } = await supabase
          .from('calendar_days')
          .select(`
            *,
            movies:tmdb_id (
              tmdb_id,
              title,
              poster_path,
              vote_average,
              year
            )
          `)
          .eq('calendar_id', calendarData.id)
          .order('day_number', { ascending: true })

        if (daysError) throw daysError

        setCalendarDays(daysData || [])
      }
    } catch (err) {
      console.error('Error fetching calendar:', err)
      setError('Error cargando calendario')
    } finally {
      setLoading(false)
    }
  }

  const generateCalendar = async () => {
    if (!hasCompletedOnboarding) {
      setError('Completa el onboarding primero')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      // Call Edge Function to generate calendar
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/generate-calendar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error generando calendario')
      }

      // Create calendar in DB
      const slug = `${userProfile.username}-octubre-2024`

      const { data: newCalendar, error: calError } = await supabase
        .from('user_calendars')
        .insert({
          user_id: user.id,
          year: 2024,
          slug: slug,
          title: 'Mi Octubre 2024',
          is_public: true
        })
        .select()
        .single()

      if (calError) throw calError

      // Insert 31 days
      const days = result.calendar.map(day => ({
        calendar_id: newCalendar.id,
        day_number: day.day_number,
        tmdb_id: day.tmdb_id,
        watched: false
      }))

      const { error: daysError } = await supabase
        .from('calendar_days')
        .insert(days)

      if (daysError) throw daysError

      // Reload calendar
      await fetchMyCalendar()
    } catch (err) {
      console.error('Error generating calendar:', err)
      setError(err.message || 'Error generando calendario')
    } finally {
      setGenerating(false)
    }
  }

  const toggleWatched = async (dayId, currentWatched) => {
    try {
      const { error } = await supabase
        .from('calendar_days')
        .update({
          watched: !currentWatched,
          watched_at: !currentWatched ? new Date().toISOString() : null
        })
        .eq('id', dayId)

      if (error) throw error

      // Update local state
      setCalendarDays(prev =>
        prev.map(day =>
          day.id === dayId
            ? { ...day, watched: !currentWatched, watched_at: !currentWatched ? new Date().toISOString() : null }
            : day
        )
      )
    } catch (err) {
      console.error('Error updating watched:', err)
    }
  }

  const updateRating = async (dayId, rating) => {
    try {
      const { error } = await supabase
        .from('calendar_days')
        .update({ rating })
        .eq('id', dayId)

      if (error) throw error

      // Update local state
      setCalendarDays(prev =>
        prev.map(day =>
          day.id === dayId
            ? { ...day, rating }
            : day
        )
      )
    } catch (err) {
      console.error('Error updating rating:', err)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Inicia sesión para crear tu calendario</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 text-[#ff5400] animate-spin" />
      </div>
    )
  }

  // No calendar yet - show generate
  if (!calendar) {
    return (
      <div className="min-h-screen bg-[#09090c] py-16">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#ff5400]/10 border-2 border-[#ff5400]/40">
            <Calendar className="w-10 h-10 text-[#ff5400]" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-black uppercase tracking-wider text-white">
              Tu Calendario Personal
            </h1>
            <p className="text-base text-gray-400 max-w-lg mx-auto">
              Genera un calendario de 31 películas personalizado según tus gustos. Progresión de intensidad ideal para octubre.
            </p>
          </div>

          {!hasCompletedOnboarding ? (
            <div className="bg-amber-500/10 border border-amber-500/40 p-6 rounded-xl">
              <p className="text-amber-400 text-sm">
                ⚠️ Completa el onboarding primero para generar tu calendario personalizado
              </p>
            </div>
          ) : (
            <button
              onClick={generateCalendar}
              disabled={generating}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#ff5400] hover:bg-[#ff6a1a] text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-lg disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generar Mi Calendario
                </>
              )}
            </button>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show calendar grid
  return (
    <div className="min-h-screen bg-[#09090c] py-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black uppercase tracking-wider text-white">
            {calendar.title}
          </h1>
          <p className="text-sm text-gray-400">
            Tu calendario personalizado · {calendarDays.filter(d => d.watched).length}/31 vistas
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {calendarDays.map((day) => {
            const movie = day.movies

            return (
              <CalendarDayCard
                key={day.id}
                day={day}
                movie={movie}
                onToggleWatched={() => toggleWatched(day.id, day.watched)}
                onUpdateRating={(rating) => updateRating(day.id, rating)}
                onSelectMovie={() => onSelectMovie?.(movie)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Calendar Day Card Component
const CalendarDayCard = ({ day, movie, onToggleWatched, onUpdateRating, onSelectMovie }) => {
  const posterUrl = movie?.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=500&q=80'

  return (
    <div className="group relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-gray-800 hover:border-[#ff5400] transition-all">
      {/* Day Number Badge */}
      <div className="absolute top-2 left-2 z-20 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-[#ff5400]/60">
        <span className="text-sm font-black text-[#ff5400]">
          {day.day_number}
        </span>
      </div>

      {/* Watched Badge */}
      {day.watched && (
        <div className="absolute top-2 right-2 z-20 bg-green-500 p-1.5 rounded-lg">
          <span className="text-xs">✓</span>
        </div>
      )}

      {/* Poster */}
      <button onClick={onSelectMovie} className="w-full h-full">
        <img
          src={posterUrl}
          alt={movie?.title || `Día ${day.day_number}`}
          className="w-full h-full object-cover"
        />
      </button>

      {/* Overlay with controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 p-3 space-y-2">
        <h3 className="text-xs font-bold text-white line-clamp-2">
          {movie?.title || 'TBD'}
        </h3>

        {/* Watched checkbox */}
        <button
          onClick={onToggleWatched}
          className={`w-full py-1.5 text-xs font-bold rounded transition-all ${
            day.watched
              ? 'bg-green-500 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {day.watched ? 'Vista' : 'Marcar vista'}
        </button>

        {/* Rating stars */}
        {day.watched && (
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => onUpdateRating(star)}
                className="text-lg transition-transform hover:scale-125"
              >
                {star <= (day.rating || 0) ? '⭐' : '☆'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
