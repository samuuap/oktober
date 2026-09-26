-- ============================================================
-- OKTOBER: Desbloqueo del calendario oficial por pruebas
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- Un registro por día superado y usuario.
CREATE TABLE IF NOT EXISTS calendar_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 31),
  challenge_type TEXT,
  attempts INT NOT NULL DEFAULT 1,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, year, day_number)
);

CREATE INDEX IF NOT EXISTS idx_calendar_unlocks_user_year
  ON calendar_unlocks(user_id, year);

-- Cada usuario solo ve y escribe sus propios desbloqueos.
ALTER TABLE calendar_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_unlocks_owner ON calendar_unlocks;
CREATE POLICY calendar_unlocks_owner ON calendar_unlocks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Ajustes sobre tablas existentes
-- ============================================================

-- El calendario oficial se lee sin estar logueado (las puertas
-- selladas no traen datos de película, así que no se destripa nada).
ALTER TABLE official_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS official_calendar_read ON official_calendar;
CREATE POLICY official_calendar_read ON official_calendar
  FOR SELECT USING (TRUE);

-- El dashboard de admin espera user_profiles.role (ver add_admin_role.sql)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- ============================================================
-- DONE
-- ============================================================
