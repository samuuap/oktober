-- ============================================================
-- OKTOBER: Calendarios + Recomendador Personal
-- Migration: Tablas nuevas + RLS + Triggers
-- ============================================================

-- 1. Calendario oficial (31 películas editoriales)
CREATE TABLE IF NOT EXISTS official_calendar (
  id SERIAL PRIMARY KEY,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 31),
  tmdb_id INT REFERENCES movies(tmdb_id),
  theme TEXT,
  note TEXT,
  year INT NOT NULL DEFAULT 2024,
  UNIQUE(day_number, year)
);

-- 2. Perfiles usuario (preferencias onboarding)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  preference_scores JSONB,
  liked_movie_ids INT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Calendarios personales (1 por usuario por año)
CREATE TABLE IF NOT EXISTS user_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL DEFAULT 2024,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- 4. Días calendario personal
CREATE TABLE IF NOT EXISTS calendar_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES user_calendars(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 31),
  tmdb_id INT NOT NULL REFERENCES movies(tmdb_id),
  watched BOOLEAN DEFAULT FALSE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  watched_at TIMESTAMPTZ,
  UNIQUE(calendar_id, day_number)
);

-- 5. Stats globales usuario
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_watched INT DEFAULT 0,
  total_minutes INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_watched_date DATE,
  genre_counts JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_calendars_user ON user_calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendars_slug ON user_calendars(slug);
CREATE INDEX IF NOT EXISTS idx_user_calendars_year ON user_calendars(year);
CREATE INDEX IF NOT EXISTS idx_calendar_days_calendar ON calendar_days(calendar_id);
CREATE INDEX IF NOT EXISTS idx_official_calendar_year ON official_calendar(year);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- official_calendar: todos leen, nadie escribe (admin manual)
ALTER TABLE official_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS official_calendar_read ON official_calendar;
CREATE POLICY official_calendar_read ON official_calendar
  FOR SELECT USING (TRUE);

-- user_profiles: usuario solo ve/edita su propio perfil
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_profiles_policy ON user_profiles;
CREATE POLICY user_profiles_policy ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

-- user_calendars: usuario crea/edita solo suyos, todos leen públicos
ALTER TABLE user_calendars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_calendars_owner ON user_calendars;
DROP POLICY IF EXISTS user_calendars_public_read ON user_calendars;
CREATE POLICY user_calendars_owner ON user_calendars
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_calendars_public_read ON user_calendars
  FOR SELECT USING (is_public = TRUE);

-- calendar_days: owner edita, todos leen si calendario público
ALTER TABLE calendar_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS calendar_days_owner ON calendar_days;
DROP POLICY IF EXISTS calendar_days_public_read ON calendar_days;
CREATE POLICY calendar_days_owner ON calendar_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_calendars
      WHERE id = calendar_days.calendar_id
      AND user_id = auth.uid()
    )
  );
CREATE POLICY calendar_days_public_read ON calendar_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_calendars
      WHERE id = calendar_days.calendar_id
      AND is_public = TRUE
    )
  );

-- user_stats: usuario solo ve sus stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_stats_policy ON user_stats;
CREATE POLICY user_stats_policy ON user_stats
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Auto-actualizar user_stats al marcar watched
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_stats_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_runtime INT;
  v_chars JSONB;
  v_dominant_genre TEXT;
  v_max_score INT;
BEGIN
  -- Obtener user_id del calendario
  SELECT user_id INTO v_user_id
  FROM user_calendars
  WHERE id = NEW.calendar_id;

  -- Si marca como visto (watched = true)
  IF NEW.watched = TRUE AND (OLD.watched IS NULL OR OLD.watched = FALSE) THEN
    -- Obtener runtime y características película
    SELECT runtime, characteristics INTO v_runtime, v_chars
    FROM movies
    WHERE tmdb_id = NEW.tmdb_id;

    -- Calcular género dominante (característica con score más alto)
    IF v_chars IS NOT NULL THEN
      SELECT key INTO v_dominant_genre
      FROM jsonb_each_text(v_chars)
      ORDER BY value::int DESC
      LIMIT 1;
    END IF;

    -- Actualizar stats
    INSERT INTO user_stats (user_id, total_watched, total_minutes, last_watched_date, genre_counts, updated_at)
    VALUES (
      v_user_id,
      1,
      COALESCE(v_runtime, 0),
      CURRENT_DATE,
      CASE WHEN v_dominant_genre IS NOT NULL
        THEN jsonb_build_object(v_dominant_genre, 1)
        ELSE '{}'::jsonb
      END,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_watched = user_stats.total_watched + 1,
      total_minutes = user_stats.total_minutes + COALESCE(v_runtime, 0),
      last_watched_date = CURRENT_DATE,
      genre_counts = CASE
        WHEN v_dominant_genre IS NOT NULL THEN
          jsonb_set(
            user_stats.genre_counts,
            ARRAY[v_dominant_genre],
            to_jsonb(COALESCE((user_stats.genre_counts->>v_dominant_genre)::int, 0) + 1)
          )
        ELSE user_stats.genre_counts
      END,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendar_days_watched_trigger ON calendar_days;
CREATE TRIGGER calendar_days_watched_trigger
AFTER INSERT OR UPDATE OF watched ON calendar_days
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_trigger();

-- ============================================================
-- DONE
-- ============================================================
