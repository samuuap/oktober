# PLAN: Calendario Octubre + Recomendador Personal

## RESUMEN DECISIONES

**Calendario Oficial:**
- 31 películas curadas manualmente (editorial)
- Único para todos usuarios
- Solo lectura (no interactivo)
- Referencia películas 2024

**Calendario Personal:**
- Usuario crea después onboarding
- Generado IA según perfil + editable manualmente
- Compartible vía URL pública única
- Tracking: checkbox vista, rating 1-5, stats globales

**Onboarding:**
- Opcional en registro (skippable)
- Método híbrido: 3 preguntas → 15 películas filtradas → usuario elige 3+
- Guarda perfil en Supabase
- Requerido para crear calendario personal

## ARQUITECTURA BASE DE DATOS

### Nuevas Tablas Supabase

```sql
-- 1. Calendario oficial (31 películas editoriales)
CREATE TABLE official_calendar (
  id SERIAL PRIMARY KEY,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 31),
  tmdb_id INT REFERENCES movies(tmdb_id), -- NULL permitido (admin asigna después)
  theme TEXT, -- "Intro suave", "Slasher clásico", etc
  note TEXT, -- Nota editorial opcional
  year INT NOT NULL DEFAULT 2024, -- 2024, 2025 (para múltiples años)
  UNIQUE(day_number, year)
);

-- 2. Perfiles usuario (preferencias onboarding)
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL, -- Para slug calendarios
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  preference_scores JSONB, -- {terror: 8, gore: 3, slasher: 7, ...}
  liked_movie_ids INT[], -- Array tmdb_ids favoritas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Calendarios personales (1 por usuario por año)
CREATE TABLE user_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL DEFAULT 2024,
  slug TEXT UNIQUE NOT NULL, -- URL: /calendar/username-octubre-2024
  title TEXT NOT NULL, -- "Mi Octubre 2024"
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year) -- Solo 1 calendario por usuario por año
);

-- 4. Días calendario personal (31 entradas por calendario)
CREATE TABLE calendar_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES user_calendars(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 31),
  tmdb_id INT NOT NULL REFERENCES movies(tmdb_id),
  watched BOOLEAN DEFAULT FALSE,
  rating INT CHECK (rating >= 1 AND rating <= 5), -- NULL si no visto
  watched_at TIMESTAMPTZ,
  UNIQUE(calendar_id, day_number)
);

-- 5. Stats globales usuario (agregados)
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_watched INT DEFAULT 0,
  total_minutes INT DEFAULT 0,
  current_streak INT DEFAULT 0, -- días consecutivos
  longest_streak INT DEFAULT 0,
  last_watched_date DATE,
  genre_counts JSONB DEFAULT '{}', -- {slasher: 5, gore: 3, ...}
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_user_calendars_user ON user_calendars(user_id);
CREATE INDEX idx_user_calendars_slug ON user_calendars(slug);
CREATE INDEX idx_user_calendars_year ON user_calendars(year);
CREATE INDEX idx_calendar_days_calendar ON calendar_days(calendar_id);
CREATE INDEX idx_official_calendar_year ON official_calendar(year);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Trigger: auto-actualizar user_stats al cambiar calendar_days.watched
CREATE OR REPLACE FUNCTION update_user_stats_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_runtime INT;
  v_genre TEXT;
BEGIN
  -- Obtener user_id del calendario
  SELECT user_id INTO v_user_id
  FROM user_calendars
  WHERE id = NEW.calendar_id;
  
  -- Si marca como visto (watched = true)
  IF NEW.watched = TRUE AND (OLD.watched IS NULL OR OLD.watched = FALSE) THEN
    -- Obtener runtime y género dominante película
    SELECT runtime INTO v_runtime
    FROM movies
    WHERE tmdb_id = NEW.tmdb_id;
    
    -- Actualizar stats
    INSERT INTO user_stats (user_id, total_watched, total_minutes, last_watched_date, updated_at)
    VALUES (v_user_id, 1, COALESCE(v_runtime, 0), CURRENT_DATE, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_watched = user_stats.total_watched + 1,
      total_minutes = user_stats.total_minutes + COALESCE(v_runtime, 0),
      last_watched_date = CURRENT_DATE,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_days_watched_trigger
AFTER INSERT OR UPDATE OF watched ON calendar_days
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_trigger();
```

### Row Level Security (RLS)

```sql
-- user_profiles: usuario solo ve/edita su propio perfil
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_profiles_policy ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

-- user_calendars: usuario crea/edita solo suyos, todos leen públicos
ALTER TABLE user_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_calendars_owner ON user_calendars
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_calendars_public_read ON user_calendars
  FOR SELECT USING (is_public = TRUE);

-- calendar_days: owner edita, todos leen si calendario público
ALTER TABLE calendar_days ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY user_stats_policy ON user_stats
  FOR ALL USING (auth.uid() = user_id);

-- official_calendar: todos leen, nadie escribe (admin manual)
ALTER TABLE official_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY official_calendar_read ON official_calendar
  FOR SELECT TO authenticated, anon USING (TRUE);
```

## COMPONENTES NUEVOS

### 1. Onboarding Flow

**Archivos:**
- `web/src/components/OnboardingModal.jsx` - Modal full-screen
- `web/src/components/OnboardingStep1.jsx` - 3 preguntas
- `web/src/components/OnboardingStep2.jsx` - 15 películas grid
- `web/src/components/OnboardingStep3.jsx` - Confirmación + generar perfil

**OnboardingStep1 - 3 preguntas:**
1. "¿Qué nivel de gore toleras?" → Slider 0-10
2. "¿Prefieres terror psicológico o físico?" → Radio: Psicológico / Físico / Ambos
3. "¿Te gustan los jump scares?" → Radio: Sí / No / Indiferente

Convertir respuestas a preference_scores:
```javascript
{
  gore: respuesta1,
  slasher: respuesta2 === 'Físico' ? 8 : 3,
  psicologico: respuesta2 === 'Psicológico' ? 8 : 3,
  jump_scares: respuesta3 === 'Sí' ? 8 : 2,
  // Defaults neutros para resto
  terror: 7, tension: 7, sobrenatural: 5, body_horror: 5, atmosfera: 7, humor: 3
}
```

**OnboardingStep2 - Selección películas:**
- Filtrar 15 películas según respuestas Step1
- Usuario marca mínimo 3 favoritas (checkbox/heart)
- Guardar tmdb_ids en `liked_movie_ids`

**OnboardingStep3:**
- Mostrar resumen perfil
- Botón "Guardar y continuar"
- INSERT user_profiles Supabase
- Redirigir a "Crear mi calendario"

### 2. Calendario Oficial

**Archivos:**
- `web/src/pages/OfficialCalendar.jsx` - Vista grid 31 días
- `web/src/components/CalendarDayCard.jsx` - Card día individual

**OfficialCalendar.jsx:**
```jsx
- Fetch official_calendar WHERE year = 2024
- Grid 7 columnas (semana) x 5 filas
- Cada día muestra:
  - Número día
  - Poster película
  - Título
  - Theme/nota editorial
  - Click → abre MovieDetailModal
- Hero section: "Calendario Oficial OKTOBER 2024"
```

### 3. Generador Calendario Personal

**Archivos:**
- `web/src/pages/MyCalendar.jsx` - Dashboard calendario usuario
- `web/src/components/GenerateCalendarButton.jsx` - Botón generar
- `web/src/lib/calendarGenerator.js` - Lógica algoritmo

**Algoritmo generación (calendarGenerator.js):**

MOVED TO EDGE FUNCTION - Ver supabase/functions/generate-calendar/index.ts

Lógica:
- Edge Function recibe userId
- Fetch user_profiles preference_scores
- Fetch todas películas DB
- Calcula match scores
- Genera 31 películas con progresión exponencial intensidad:
  - Días 1-15: suave (matchScore * 0.4-0.6)
  - Días 16-25: medio (matchScore * 0.6-0.8)
  - Días 26-31: intenso (matchScore * 0.8-1.0)
- Diversidad: evita mismo subgénero seguido
- Retorna array 31 películas ordenadas

**MyCalendar.jsx:**
- Si usuario no tiene calendario: mostrar "Generar mi calendario"
- Al generar:
  1. Llama algoritmo
  2. INSERT user_calendars (genera slug único)
  3. INSERT 31 calendar_days
  4. Redirige a vista editable
- Si ya tiene calendario: muestra grid editable
  - Cada día: poster, watched checkbox, rating stars
  - Click película: modal detalles
  - Botón "Cambiar película": abre modal búsqueda
  - Drag & drop para reordenar (opcional v2)

### 4. Compartir Calendario

**Archivos:**
- `web/src/pages/SharedCalendar.jsx` - Vista pública `/calendar/:slug`

**SharedCalendar.jsx:**
- Fetch calendar por slug
- Vista solo lectura (grid similar MyCalendar)
- Mostrar autor, título calendario
- Botón "Copiar link"
- Botón "Fork este calendario" (crea copia para usuario logueado)

### 5. Stats Dashboard

**Archivos:**
- `web/src/components/StatsWidget.jsx` - Widget stats en MyCalendar

**Mostrar:**
- X/31 películas vistas
- Total minutos
- Racha actual días consecutivos
- Gráfico géneros más vistos (bar chart simple)
- Actualizar al marcar watched/rating

**Actualización stats (trigger o función):**
```javascript
async function updateUserStats(userId, movieId, watched, rating) {
  // 1. Fetch movie.runtime, genres
  // 2. Update user_stats:
  //    - total_watched += 1
  //    - total_minutes += runtime
  //    - Calcular streak (si watched_at hoy o ayer, +1, sino reset)
  //    - Incrementar genre_counts[genre]
}
```

## RUTAS NUEVAS

```
/onboarding          → OnboardingModal (modal o página)
/calendar/official   → OfficialCalendar.jsx
/calendar/mine       → MyCalendar.jsx
/calendar/:slug      → SharedCalendar.jsx
```

Agregar a Navbar:
- "Calendario Oficial" link
- "Mi Calendario" link (requiere login)

## FLUJO USUARIO COMPLETO

1. **Nuevo usuario registra cuenta**
   - AuthModal muestra prompt: "¿Configurar preferencias ahora?" (skippable)
   - Si acepta → OnboardingModal
   - Si skip → puede hacerlo después desde perfil

2. **Usuario explora sitio**
   - Ve calendario oficial (solo lectura)
   - Explora películas

3. **Usuario completa onboarding**
   - 3 preguntas → 15 películas → elige 3+
   - Perfil guardado Supabase

4. **Usuario crea calendario personal**
   - Click "Crear mi calendario" (requiere onboarding)
   - Algoritmo genera 31 películas
   - Usuario puede editar días manualmente

5. **Usuario usa calendario mes octubre**
   - Marca películas vistas
   - Deja ratings
   - Ve stats acumuladas

6. **Usuario comparte calendario**
   - Botón "Compartir" genera link único
   - Otros ven calendario modo lectura
   - Pueden fork si tienen cuenta

## CAMBIOS CÓDIGO EXISTENTE

**AuthContext.jsx:**
- Agregar `userProfile` state (fetch de user_profiles)
- Agregar `hasCompletedOnboarding` computed
- Método `updateProfile(preferences)` para guardar onboarding

**App.jsx:**
- No cambios mayores
- Agregar routes calendarios (si usa router, sino crear)

**Navbar.jsx:**
- Agregar links "Calendario Oficial" y "Mi Calendario"

## SCRIPTS PYTHON NUEVOS

**populate_official_calendar.py:**
```python
# Script admin para poblar oficial_calendar
# Lee JSON con 31 tmdb_ids curados manualmente
# Inserta en Supabase

import json
from supabase import create_client

CALENDAR_2024 = [
    {"day": 1, "tmdb_id": 1234, "theme": "Intro suave", "note": "..."},
    {"day": 2, "tmdb_id": 5678, "theme": "..."},
    # ... 31 días
]

supabase = create_client(URL, SERVICE_KEY)

for entry in CALENDAR_2024:
    supabase.table('official_calendar').upsert({
        **entry,
        'year': 2024
    }).execute()
```

## ORDEN IMPLEMENTACIÓN

### Fase 1: Base Datos (1 sesión)
1. Crear tablas Supabase (SQL migrations)
2. Configurar RLS policies
3. Test manual inserts

### Fase 2: Onboarding (2 sesiones)
1. OnboardingModal + 3 steps
2. Guardar user_profiles
3. Integrar AuthContext

### Fase 3: Calendario Oficial (1 sesión)
1. populate_official_calendar.py script
2. OfficialCalendar.jsx página
3. CalendarDayCard componente

### Fase 4: Generador Personal (2 sesiones)
1. calendarGenerator.js algoritmo
2. MyCalendar.jsx con generar
3. Edición manual días

### Fase 5: Tracking + Stats (1 sesión)
1. Watched checkbox logic
2. Rating modal
3. StatsWidget cálculos

### Fase 6: Compartir (1 sesión)
1. SharedCalendar.jsx
2. Botón compartir + copy link
3. Fork calendario

**Total estimado: 8 sesiones desarrollo**

## RIESGOS Y CONSIDERACIONES

**Performance:**
- Algoritmo generación puede tardar con 1000+ películas
- Precalcular match scores en background (opcional)
- Cachear calendarios generados

**UX:**
- Onboarding debe ser rápido (<2 min)
- Permitir skip y volver después
- Mobile responsive calendarios (grid adaptivo)

**Datos:**
- Calendario oficial debe curarse manualmente cada año
- Considerar versionado (oficial_calendar.year)

**Futuro:**
- Sistema recomendación mejora con ratings
- Machine learning sobre gustos comunidad
- Badges/achievements (viste 31/31, maratón gore, etc)
- Calendario compartido editable colaborativo
