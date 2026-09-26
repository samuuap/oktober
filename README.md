# 🎃 Oktober

Un calendario de adviento para octubre. Treinta y una puertas selladas, una por
cada noche del mes: detrás de cada una hay una película de terror, y solo se
abre para quien supere la prueba que la guarda.

Junto al calendario oficial, cada usuario puede generarse uno paralelo a su
medida a partir de sus preferencias.

---

## Cómo funciona

**Calendario oficial.** Treinta y una películas elegidas a mano. Las películas
selladas no se envían siquiera al navegador: el frontend solo pide los datos de
los días ya superados. De la puerta cerrada únicamente se ve el número, el tipo
de prueba y una pista temática.

**Las pruebas.** Se generan solas a partir del catálogo, así que no se agotan ni
se quedan obsoletas. El tipo es fijo por día —todo el mundo se enfrenta al mismo
reto el día 7— pero las preguntas se re-sortean en cada intento, de modo que
reintentar no consista en memorizar.

| Prueba | Nombre | En qué consiste |
|---|---|---|
| `trivia` | 🕯️ Interrogatorio | Tres preguntas, ningún fallo |
| `poster` | 🌫️ Entre sombras | Reconocer el póster tras la niebla |
| `synopsis` | 📻 Psicofonía | Una sinopsis censurada: adivinar de quién habla |
| `duel` | ⚖️ Balanza de sangre | Cara a cara entre dos películas |

**Calendario personal.** El onboarding puntúa tus gustos en las mismas diez
categorías con que está etiquetado el catálogo, y `calendarGenerator.js` arma
treinta y un días a tu medida.

---

## Stack

- **Frontend** — React 19, Vite 8, Tailwind 4, lucide-react
- **Backend** — Supabase (Postgres + Auth + RLS)
- **Datos** — TMDB, en español (`es-ES`), con plataformas de España
- **Análisis** — DeepSeek (`deepseek-chat`), vía SDK de OpenAI apuntado a su API
- **Despliegue** — Vercel

---

## Estructura

```
scripts/     Python: importar de TMDB, etiquetar con IA, publicar el calendario
sql/         Migraciones numeradas, en orden de ejecución
supabase/    Edge functions
web/         Frontend (Vite + React)
  src/components/   piezas reutilizables y modales
  src/pages/        una por pestaña de la barra
  src/lib/          lógica sin interfaz: filtros, pruebas, generador
  src/context/      sesión y perfil
```

## Puesta en marcha

### 1. Variables de entorno

Dos ficheros, ninguno de los dos se commitea.

`.env` en la raíz, para los scripts de Python:

```bash
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=   # Settings → API Keys → service_role
TMDB_TOKEN=                  # TMDB → Ajustes → API → Token de acceso de lectura
DEEPSEEK_API_KEY=            # platform.deepseek.com/api_keys
```

La `service_role` es un JWT de unos 200 caracteres con tres tramos separados por
puntos, o bien una `sb_secret_…`. En el panel aparece enmascarada: hay que
revelarla o usar el botón de copiar, porque seleccionarla a mano corta en el
primer punto y se acaba pegando solo la cabecera. Si eso pasa, Supabase
responde `401 Invalid API key`. Hay un atajo para no equivocarse:

```bash
python3 scripts/set_key.py sbp_<token>   # la pide a la API de gestión
python3 scripts/set_key.py               # o la coge del portapapeles, validándola
```

`web/.env`, para el frontend:

```bash
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Aquí **solo** la clave publicable. Todo lo que entre en este fichero acaba
dentro del bundle que se descarga el navegador.

### 2. Base de datos

En el editor SQL de Supabase, por este orden:

```
sql/001_calendars.sql       tablas, índices y políticas base
sql/002_unlocks.sql         calendar_unlocks + columna role
sql/003_admin_role.sql      marcar tu usuario como admin
sql/004_security.sql        cerrar la escritura pública
sql/005_admin_lockdown.sql  que nadie se nombre admin a sí mismo
sql/006_sharing.sql         publicar calendarios, y que sea opcional
```

Van numerados y se ejecutan en orden. Son idempotentes: relanzarlos no rompe
nada.

Para reiniciar el sellado de todo el mundo y empezar octubre de cero:

```sql
DELETE FROM calendar_unlocks;              -- o ... WHERE year = 2026
```

### 3. Backend

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

.venv/bin/python scripts/import_movies.py       # catálogo desde TMDB
.venv/bin/python scripts/retry_errors.py        # reintentar las que fallaran
.venv/bin/python scripts/analyze_movies.py      # etiquetado con DeepSeek
.venv/bin/python scripts/populate_official_calendar.py 2026
```

Lánzalos desde la raíz: ahí es donde buscan el `.env` y donde dejan el estado
de progreso.

### 4. Frontend

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

---

## Los scripts

| Script | Qué hace |
|---|---|
| `import_movies.py` | Importa de TMDB el género Terror con más de 1000 votos, hasta 100 páginas. Reanudable: guarda el avance en `import_progress.json` y los fallos en `import_errors.json`. |
| `retry_errors.py` | Reintenta lo que quedó en `import_errors.json`. |
| `analyze_movies.py` | Manda a DeepSeek las películas sin `characteristics` y guarda sus diez puntuaciones. Trabaja en lotes de diez y solo toca las pendientes. |
| `populate_official_calendar.py` | Publica los treinta y un días del calendario oficial. Recibe el año por argumento; por defecto, el en curso. Si alguna película no está en el catálogo, la trae de TMDB antes de sellar la puerta. |
| `set_key.py` | Deja `SUPABASE_SERVICE_ROLE_KEY` bien puesta en `.env`, validándola antes. |

Las diez categorías del etiquetado: `terror`, `gore`, `tension`, `humor`,
`sobrenatural`, `slasher`, `psicologico`, `body_horror`, `jump_scares`,
`atmosfera`, de 0 a 10.

---

## Base de datos

| Tabla | Contenido |
|---|---|
| `movies` | Catálogo. Datos de TMDB más el `characteristics` de la IA. |
| `official_calendar` | Los 31 días, con `UNIQUE(day_number, year)`. |
| `calendar_unlocks` | Qué día ha abierto cada usuario, con qué prueba y en cuántos intentos. |
| `user_profiles` | Perfil, preferencias del onboarding y rol. |
| `user_calendars` · `calendar_days` | Calendarios personales y sus días. |
| `user_stats` | Estadísticas por usuario. |

### Seguridad

La clave publicable viaja dentro del bundle y este repo es público: hay que
darla por conocida. Lo único que separa a un visitante de la base de datos son
las políticas RLS, así que la regla es simple —**ninguna tabla debe aceptar
escrituras con la clave pública**—.

`movies` y `official_calendar` son de lectura para todos y de escritura para
nadie: los scripts entran con `service_role`, que se salta RLS por definición y
no necesita ninguna política. Las tablas de usuario se filtran por
`auth.uid() = user_id`.

Cuidado con el nombre de las políticas, que no obliga a nada. En este proyecto
hubo una llamada `"Service role puede todo"` que en realidad estaba concedida al
rol `public` con `USING (true)`: en Postgres `public` significa *todos los
roles*, de modo que cualquiera con la clave pública podía insertar, editar y
borrar películas. La RLS estaba activada y aun así la tabla estaba abierta. Lo
cierra `supabase_migration_security.sql`.

Con el rol de admin pasaba algo parecido. La visión de admin sale de
`user_profiles.role`, y la política de esa tabla deja a cada usuario escribir su
propia fila: como `role` es una columna más, cualquiera registrado podía
nombrarse admin con una llamada. RLS decide a qué *filas* llegas; hace falta
además decidir qué *columnas*, y eso son privilegios de columna.

Ahí hay una trampa que conviene conocer: `REVOKE UPDATE (role)` a secas no sirve
de nada si existe un `GRANT UPDATE` a nivel de tabla —y Supabase lo crea por
defecto—. El grant de tabla implica todas las columnas, así que el revoke de una
sola se acepta sin error y no cambia nada. Hay que retirar el de tabla y
reconceder la lista explícita de columnas.

Para comprobar cómo está una tabla, lo fiable no es leer la configuración sino
intentar escribir en ella con la clave pública: `42501` es que RLS lo frena,
cualquier error de constraint significa que pasó. Y para las columnas, mirar
`information_schema.column_privileges`, no el `GRANT` que uno cree haber puesto.

---

## Créditos

Datos de [TMDB](https://www.themoviedb.org/) · análisis con
[DeepSeek](https://www.deepseek.com/) · [Supabase](https://supabase.com/)

Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.
