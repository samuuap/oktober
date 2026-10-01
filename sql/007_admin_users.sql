-- ============================================================
-- ADMIN: Gestión de usuarios registrados (correos, alias y métricas)
-- ============================================================
--
-- Por seguridad y privacidad, Supabase guarda los correos en el esquema
-- privado `auth.users`, el cual no es accesible directamente desde el
-- frontend mediante la API de PostgREST.
--
-- Esta migración añade dos funciones con SECURITY DEFINER que se ejecutan
-- con permisos de base de datos, pero validando estrictamente que el usuario
-- que las invoca tenga el rol 'admin' en `user_profiles`.
--
-- Ejecutar en el editor SQL de Supabase.

-- ------------------------------------------------------------
-- 1. Función para listar todos los usuarios con alias y correos
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  username TEXT,
  role TEXT,
  onboarding_completed BOOLEAN,
  calendar_count BIGINT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Comprobar estrictamente si quien llama tiene rol de administrador
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren privilegios de administrador.';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::TEXT AS email,
    p.username,
    COALESCE(p.role, 'user') AS role,
    COALESCE(p.onboarding_completed, FALSE) AS onboarding_completed,
    COUNT(c.id) AS calendar_count,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN user_profiles p ON p.user_id = u.id
  LEFT JOIN user_calendars c ON c.user_id = u.id
  GROUP BY u.id, u.email, p.username, p.role, p.onboarding_completed, u.created_at, u.last_sign_in_at
  ORDER BY u.created_at DESC;
END;
$$;

-- Restringir ejecución
REVOKE ALL ON FUNCTION get_admin_users() FROM public;
GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;


-- ------------------------------------------------------------
-- 2. Función para eliminar un usuario por completo (solo admin)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Comprobar si quien llama es admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren privilegios de administrador.';
  END IF;

  -- Impedir que un admin se elimine a sí mismo por error
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta de administrador.';
  END IF;

  -- Al borrar de auth.users, el ON DELETE CASCADE se encarga de borrar
  -- user_profiles, user_calendars, calendar_days, calendar_unlocks, etc.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Restringir ejecución
REVOKE ALL ON FUNCTION delete_user_by_admin(UUID) FROM public;
GRANT EXECUTE ON FUNCTION delete_user_by_admin(UUID) TO authenticated;
