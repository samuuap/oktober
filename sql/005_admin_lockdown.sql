-- ============================================================
-- ADMIN: que el rol no se lo pueda dar uno mismo
-- ============================================================
--
-- La visión de admin depende de user_profiles.role, y la política de esa
-- tabla es FOR ALL USING (auth.uid() = user_id): cada usuario puede
-- escribir su propia fila. Como `role` es una columna más, cualquiera
-- registrado podía ponerse 'admin' con una sola llamada a la API.
--
-- RLS decide a qué FILAS llegas; los privilegios de columna, qué CAMPOS
-- puedes tocar dentro de ellas. Aquí hace falta lo segundo.
--
-- OJO: no basta con `REVOKE UPDATE (role)`. Si existe un GRANT a nivel de
-- tabla —y Supabase lo crea por defecto— ese grant implica TODAS las
-- columnas y el revoke de una sola se acepta sin error pero no cambia
-- nada. Hay que retirar el de tabla y reconceder la lista explícita.
--
-- Ejecutar en el editor SQL de Supabase.

REVOKE INSERT, UPDATE ON user_profiles FROM anon, authenticated;

GRANT INSERT (user_id, username, onboarding_completed, onboarding_completed_at,
              preference_scores, liked_movie_ids, created_at, updated_at),
      UPDATE (user_id, username, onboarding_completed, onboarding_completed_at,
              preference_scores, liked_movie_ids, created_at, updated_at)
  ON user_profiles TO anon, authenticated;

-- Comprobación: esto debe devolver cero filas.
--   select grantee, privilege_type from information_schema.column_privileges
--   where table_name='user_profiles' and column_name='role'
--     and grantee in ('anon','authenticated')
--     and privilege_type in ('INSERT','UPDATE');

-- El rol solo se cambia ya con service_role. Para nombrar admin por correo:
--
--   UPDATE user_profiles SET role = 'admin'
--   WHERE user_id = (SELECT id FROM auth.users
--                    WHERE lower(email) = lower('alguien@ejemplo.com'));
--
-- Y para retirárselo al resto:
--
--   UPDATE user_profiles SET role = 'user'
--   WHERE user_id IS DISTINCT FROM (SELECT id FROM auth.users
--                                   WHERE lower(email) = lower('alguien@ejemplo.com'));
