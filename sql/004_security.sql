-- ============================================================
-- SEGURIDAD: cerrar la escritura pública sobre movies
-- ============================================================
--
-- La clave publicable viaja dentro del bundle del frontend y el repo es
-- público: hay que darla por conocida. Lo único que separa a un visitante
-- de la base de datos son las políticas RLS.
--
-- El agujero no era falta de RLS —estaba activada— sino esta política:
--
--     "Service role puede todo"  ALL  TO public  USING (true)
--
-- El nombre engaña. En Postgres, `public` significa *todos los roles*,
-- así que concedía insertar, editar y borrar películas a cualquiera con
-- la clave pública. service_role no necesita ninguna política: se salta
-- RLS por definición, y por eso los scripts siguen funcionando sin ella.
--
-- Ejecutar en el editor SQL de Supabase.

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- El agujero.
DROP POLICY IF EXISTS "Service role puede todo" ON movies;

-- Dos políticas de lectura hacían lo mismo; dejamos una.
DROP POLICY IF EXISTS "Movies are publicly readable" ON movies;
DROP POLICY IF EXISTS movies_read ON movies;

CREATE POLICY movies_read ON movies
  FOR SELECT USING (TRUE);

-- official_calendar: mismo criterio. Idempotente.
ALTER TABLE official_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS official_calendar_read ON official_calendar;
CREATE POLICY official_calendar_read ON official_calendar
  FOR SELECT USING (TRUE);

-- Al no declarar políticas de INSERT/UPDATE/DELETE, esas operaciones
-- quedan denegadas para anon y authenticated. Es lo que se busca.
