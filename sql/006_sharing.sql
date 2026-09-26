-- ============================================================
-- COMPARTIR CALENDARIOS: publicar es una decisión, no el defecto
-- ============================================================
--
-- La tabla ya nacía con is_public = TRUE y las políticas public_read
-- puestas, así que todo calendario creado hasta ahora era legible por
-- cualquiera —sus 31 días, lo visto y lo puntuado— sin que su dueño lo
-- hubiera decidido. Además el slug se construía con la parte local del
-- correo, así que publicar filtraba eso.
--
-- Ejecutar en el editor SQL de Supabase.

-- ------------------------------------------------------------
-- 1. Privado por defecto, y retirar lo publicado sin permiso
-- ------------------------------------------------------------

ALTER TABLE user_calendars ALTER COLUMN is_public SET DEFAULT FALSE;

UPDATE user_calendars SET is_public = FALSE;

-- Sacar el correo de los slugs ya creados. En adelante lo construye la
-- aplicación a partir del alias público.
UPDATE user_calendars
SET slug = 'octubre-' || year || '-' || left(id::text, 8);

-- ------------------------------------------------------------
-- 2. La vista de la galería
-- ------------------------------------------------------------
-- Para enseñar de quién es cada calendario hay que leer el alias de otro
-- usuario, y user_profiles solo es legible por su dueño. Abrir esa tabla
-- expondría preferencias, likes y rol.
--
-- La vista lo resuelve al revés: corre con los permisos de su propietario,
-- así que ve lo que necesita, pero solo devuelve las columnas de aquí
-- abajo. Ni user_id, ni preferencias, ni rol.

DROP VIEW IF EXISTS public_calendars;

CREATE VIEW public_calendars AS
SELECT
  c.id,
  c.year,
  c.slug,
  c.title,
  c.updated_at,
  p.username AS author,
  (SELECT count(*) FROM calendar_days d WHERE d.calendar_id = c.id) AS day_count
FROM user_calendars c
JOIN user_profiles p ON p.user_id = c.user_id
WHERE c.is_public = TRUE
  AND p.username IS NOT NULL;

GRANT SELECT ON public_calendars TO anon, authenticated;

-- ------------------------------------------------------------
-- 3. Que el user_id no salga de la aplicación
-- ------------------------------------------------------------
-- Es el UUID de auth. El visitante anónimo no lo necesita: la galería lee
-- de la vista. (El GRANT de tabla implica todas las columnas, así que hay
-- que retirarlo antes de conceder la lista.)

REVOKE SELECT ON user_calendars FROM anon, authenticated;

GRANT SELECT ON user_calendars TO authenticated;
GRANT SELECT (id, year, slug, title, is_public, created_at, updated_at)
  ON user_calendars TO anon;

-- ------------------------------------------------------------
-- 4. Las políticas de calendar_days, sin tocar user_calendars
-- ------------------------------------------------------------
-- Ambas consultaban user_calendars dentro de un EXISTS, y eso exige
-- permiso DE TABLA sobre ella: con el SELECT retirado a anon, leer los
-- días de un calendario publicado fallaba con
-- «permission denied for table user_calendars».
--
-- Ojo además con que la de propietario es FOR ALL, así que también se
-- evalúa en los SELECT y rompía por lo mismo.
--
-- Encapsular la comprobación en funciones SECURITY DEFINER lo arregla:
-- corren con los permisos de su dueño, y auth.uid() sigue devolviendo el
-- del llamante porque sale del JWT de la petición, no del rol.

CREATE OR REPLACE FUNCTION public.calendar_is_public(cal_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM user_calendars WHERE id = cal_id AND is_public = TRUE) $$;

CREATE OR REPLACE FUNCTION public.calendar_is_mine(cal_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM user_calendars WHERE id = cal_id AND user_id = auth.uid()) $$;

GRANT EXECUTE ON FUNCTION public.calendar_is_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calendar_is_mine(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS calendar_days_public_read ON calendar_days;
CREATE POLICY calendar_days_public_read ON calendar_days
  FOR SELECT USING (public.calendar_is_public(calendar_id));

DROP POLICY IF EXISTS calendar_days_owner ON calendar_days;
CREATE POLICY calendar_days_owner ON calendar_days
  FOR ALL USING (public.calendar_is_mine(calendar_id))
  WITH CHECK (public.calendar_is_mine(calendar_id));
