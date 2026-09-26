import json
import logging
import os
import random
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from supabase import create_client


# ============================================================
# CONFIGURACIÓN
# ============================================================

load_dotenv()

TMDB_TOKEN = os.getenv("TMDB_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not TMDB_TOKEN:
    raise RuntimeError("Falta TMDB_TOKEN en .env")

if not SUPABASE_URL:
    raise RuntimeError("Falta SUPABASE_URL en .env")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Falta SUPABASE_SERVICE_ROLE_KEY en .env")


# TMDB
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Horror = 27
HORROR_GENRE_ID = 27

# Nuestro filtro principal
MIN_VOTE_COUNT = 1000

# Número máximo de páginas que queremos importar
MAX_PAGES = 100

# Archivo donde guardamos el progreso
PROGRESS_FILE = Path("import_progress.json")

# Archivo de errores
ERROR_FILE = Path("import_errors.json")

# Reintentos
MAX_RETRIES = 5

# Reintentos para Supabase
SUPABASE_MAX_RETRIES = 3

# Espera mínima entre requests
REQUEST_DELAY = 0.15


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("movie-importer")


# ============================================================
# CLIENTES
# ============================================================

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
)

TMDB_HEADERS = {
    "Authorization": f"Bearer {TMDB_TOKEN}",
    "accept": "application/json"
}


# ============================================================
# ESTADO
# ============================================================

def _empty_progress():
    """Estructura de progreso vacía."""

    return {
        "last_completed_page": 0,
        "processed": 0,
        "saved": 0,
        "current_page_done_ids": [],
        "failed": []
    }


def load_progress():
    """
    Carga el progreso anterior.
    Si no existe, empieza desde la página 1.

    current_page_done_ids: lista de tmdb_ids ya procesados
    en la página actual (incompleta). Permite retomar
    a mitad de página sin repetir requests a TMDB.
    """

    if not PROGRESS_FILE.exists():
        return _empty_progress()

    try:
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            progress = json.load(f)

        # Migración: si viene de una versión anterior
        # sin current_page_done_ids, lo añadimos.
        if "current_page_done_ids" not in progress:
            progress["current_page_done_ids"] = []

        return progress

    except Exception:
        logger.warning(
            "No se pudo leer el archivo de progreso. "
            "Comenzamos desde cero."
        )

        return _empty_progress()


def save_progress(progress):

    temp_file = PROGRESS_FILE.with_suffix(".tmp")

    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(
            progress,
            f,
            indent=2,
            ensure_ascii=False
        )

    # Escritura atómica
    temp_file.replace(PROGRESS_FILE)


# ============================================================
# ERRORES
# ============================================================

def load_errors():

    if not ERROR_FILE.exists():
        return []

    try:
        with open(ERROR_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    except Exception:
        return []


def save_errors(errors):

    with open(ERROR_FILE, "w", encoding="utf-8") as f:
        json.dump(
            errors,
            f,
            indent=2,
            ensure_ascii=False
        )


def register_error(tmdb_id, title, error):

    errors = load_errors()

    errors.append({
        "tmdb_id": tmdb_id,
        "title": title,
        "error": str(error),
        "timestamp": time.time()
    })

    save_errors(errors)


# ============================================================
# REQUEST A TMDB
# ============================================================

def tmdb_request(endpoint, params=None):

    url = f"{TMDB_BASE_URL}{endpoint}"

    for attempt in range(1, MAX_RETRIES + 1):

        try:

            response = requests.get(
                url,
                headers=TMDB_HEADERS,
                params=params,
                timeout=30
            )

            # ------------------------------
            # RATE LIMIT
            # ------------------------------

            if response.status_code == 429:

                retry_after = response.headers.get(
                    "Retry-After"
                )

                if retry_after:
                    wait = float(retry_after)
                else:
                    wait = min(
                        60,
                        2 ** attempt
                    )

                logger.warning(
                    f"TMDB respondió 429. "
                    f"Esperando {wait:.1f}s..."
                )

                time.sleep(wait)
                continue

            # ------------------------------
            # ERRORES TEMPORALES
            # ------------------------------

            if response.status_code in (
                500,
                502,
                503,
                504
            ):

                wait = min(
                    60,
                    (2 ** attempt) + random.random()
                )

                logger.warning(
                    f"Error temporal {response.status_code}. "
                    f"Reintentando en {wait:.1f}s..."
                )

                time.sleep(wait)
                continue

            # ------------------------------
            # OTROS ERRORES
            # ------------------------------

            response.raise_for_status()

            time.sleep(REQUEST_DELAY)

            return response.json()

        except requests.RequestException as error:

            if attempt >= MAX_RETRIES:
                raise

            wait = min(
                60,
                (2 ** attempt) + random.random()
            )

            logger.warning(
                f"Error de red: {error}. "
                f"Reintentando en {wait:.1f}s..."
            )

            time.sleep(wait)

    raise RuntimeError(
        f"No se pudo obtener {endpoint}"
    )


# ============================================================
# DESCUBRIR PELÍCULAS
# ============================================================

def get_horror_movies(page):

    params = {
        "language": "es-ES",

        "sort_by": "popularity.desc",

        "with_genres": HORROR_GENRE_ID,

        "vote_count.gte": MIN_VOTE_COUNT,

        "include_adult": "false",

        "include_video": "false",

        "page": page
    }

    return tmdb_request(
        "/discover/movie",
        params
    )


# ============================================================
# DETALLES
# ============================================================

def get_movie_details(tmdb_id):

    return tmdb_request(
        f"/movie/{tmdb_id}",
        {
            "language": "es-ES"
        }
    )


# ============================================================
# PROVIDERS (PLATAFORMAS)
# ============================================================

WATCH_PROVIDER_COUNTRY = "ES"


def get_watch_providers(tmdb_id):
    """
    Obtiene las plataformas donde está disponible
    la película en España (ES).

    Devuelve un dict con flatrate, rent y buy.
    Si no hay datos para ES, devuelve listas vacías.
    """

    data = tmdb_request(
        f"/movie/{tmdb_id}/watch/providers"
    )

    country_data = (
        data
        .get("results", {})
        .get(WATCH_PROVIDER_COUNTRY, {})
    )

    def extract_providers(category):
        return [
            {
                "provider_id": p.get("provider_id"),
                "provider_name": p.get("provider_name"),
                "logo_path": p.get("logo_path")
            }
            for p in country_data.get(category, [])
        ]

    return {
        "flatrate": extract_providers("flatrate"),
        "rent": extract_providers("rent"),
        "buy": extract_providers("buy")
    }


# ============================================================
# TRANSFORMACIÓN
# ============================================================

def transform_movie(movie, watch_providers=None):

    release_date = movie.get("release_date")

    year = None

    if release_date:
        try:
            year = int(release_date[:4])
        except (ValueError, TypeError):
            year = None

    genres = [
        {
            "id": genre.get("id"),
            "name": genre.get("name")
        }
        for genre in movie.get("genres", [])
    ]

    return {
        "tmdb_id": movie["id"],

        "title": movie.get("title"),
        "original_title": movie.get("original_title"),

        "overview": movie.get("overview"),

        "release_date": release_date or None,
        "year": year,

        "runtime": movie.get("runtime"),

        "poster_path": movie.get("poster_path"),
        "backdrop_path": movie.get("backdrop_path"),

        "original_language": movie.get(
            "original_language"
        ),

        "genres": genres,

        "watch_providers": watch_providers or {
            "flatrate": [],
            "rent": [],
            "buy": []
        },

        "popularity": movie.get("popularity"),
        "vote_average": movie.get("vote_average"),
        "vote_count": movie.get("vote_count")
    }


# ============================================================
# GUARDAR EN SUPABASE (CON REINTENTOS)
# ============================================================

def save_movie(movie):
    """
    Guarda una película en Supabase con reintentos
    y backoff exponencial.
    """

    for attempt in range(1, SUPABASE_MAX_RETRIES + 1):

        try:

            (
                supabase
                .table("movies")
                .upsert(
                    movie,
                    on_conflict="tmdb_id"
                )
                .execute()
            )

            return

        except Exception as error:

            if attempt >= SUPABASE_MAX_RETRIES:
                raise

            wait = min(
                30,
                (2 ** attempt) + random.random()
            )

            logger.warning(
                f"Error guardando en Supabase "
                f"(intento {attempt}/{SUPABASE_MAX_RETRIES}): "
                f"{error}. Reintentando en {wait:.1f}s..."
            )

            time.sleep(wait)


# ============================================================
# PROCESAR UNA PELÍCULA
# ============================================================

def process_movie(movie):

    tmdb_id = movie["id"]

    title = movie.get(
        "title",
        "Sin título"
    )

    logger.info(
        f"Procesando: {title} "
        f"(TMDB {tmdb_id})"
    )

    details = get_movie_details(tmdb_id)

    # ----------------------------------------
    # VALIDACIONES EXTRA
    # ----------------------------------------

    if details.get("adult"):
        logger.info(
            f"Descartada por contenido adulto: {title}"
        )
        return False

    if details.get("video"):
        logger.info(
            f"Descartada por ser vídeo: {title}"
        )
        return False

    if not details.get("release_date"):
        logger.info(
            f"Descartada por no tener fecha: {title}"
        )
        return False

    if details.get("vote_count", 0) < MIN_VOTE_COUNT:
        logger.info(
            f"Descartada por pocos votos: {title}"
        )
        return False

    # ----------------------------------------
    # PROVIDERS
    # ----------------------------------------

    watch_providers = get_watch_providers(tmdb_id)

    # ----------------------------------------
    # GUARDAR
    # ----------------------------------------

    movie_data = transform_movie(
        details,
        watch_providers
    )

    save_movie(movie_data)

    logger.info(
        f"✅ Guardada: {title}"
    )

    return True


# ============================================================
# IMPORTADOR PRINCIPAL
# ============================================================

def import_movies():

    progress = load_progress()

    start_page = (
        progress["last_completed_page"] + 1
    )

    # IDs ya procesados en la página incompleta anterior
    done_ids = set(
        progress.get("current_page_done_ids", [])
    )

    logger.info(
        "========================================"
    )

    logger.info(
        "🎃 IMPORTADOR DE PELÍCULAS DE TERROR"
    )

    logger.info(
        f"Página inicial: {start_page}"
    )

    logger.info(
        f"Página máxima: {MAX_PAGES}"
    )

    logger.info(
        f"Mínimo de votos: {MIN_VOTE_COUNT}"
    )

    if done_ids:
        logger.info(
            f"Retomando página {start_page} — "
            f"{len(done_ids)} películas ya procesadas, "
            f"se omitirán"
        )

    logger.info(
        "========================================"
    )

    for page in range(
        start_page,
        MAX_PAGES + 1
    ):

        logger.info(
            f"\n📥 Descargando página {page}"
        )

        try:

            data = get_horror_movies(page)

        except Exception as error:

            logger.error(
                f"No se pudo descargar "
                f"la página {page}: {error}"
            )

            logger.error(
                "El progreso se ha conservado. "
                "Puedes volver a ejecutar el script."
            )

            return

        movies = data.get(
            "results",
            []
        )

        total_pages = data.get(
            "total_pages",
            0
        )

        logger.info(
            f"Películas encontradas: {len(movies)}"
        )

        logger.info(
            f"Total páginas disponibles: {total_pages}"
        )

        if not movies:

            logger.info(
                "No hay más películas."
            )

            break

        for movie in movies:

            tmdb_id = movie["id"]
            title = movie.get("title", "Sin título")

            # ----------------------------------
            # SALTAR SI YA PROCESADA EN ESTA
            # PÁGINA (reanudación mid-page)
            # ----------------------------------

            if tmdb_id in done_ids:
                logger.info(
                    f"⏭️ Ya procesada: {title} "
                    f"(TMDB {tmdb_id}), saltando"
                )
                continue

            try:

                progress["processed"] += 1

                saved = process_movie(
                    movie
                )

                if saved:
                    progress["saved"] += 1

                # Marcar como procesada en esta página
                done_ids.add(tmdb_id)
                progress["current_page_done_ids"] = list(
                    done_ids
                )

                # Guardamos progreso tras cada película
                save_progress(progress)

            except KeyboardInterrupt:

                logger.warning(
                    "\n⏸️ Importación detenida por el usuario."
                )

                save_progress(progress)

                logger.info(
                    "Progreso guardado. "
                    "Puedes continuar ejecutando el script."
                )

                return

            except Exception as error:

                logger.error(
                    f"❌ Error con "
                    f"{title} "
                    f"({tmdb_id}): {error}"
                )

                register_error(
                    tmdb_id,
                    title,
                    error
                )

                # Marcar como procesada (con error)
                # para no reintentar en loop infinito.
                # El reintento se hace con retry_errors.py.
                done_ids.add(tmdb_id)
                progress["current_page_done_ids"] = list(
                    done_ids
                )

                save_progress(progress)

                # Continuamos con la siguiente
                continue

        # ------------------------------------
        # Página terminada
        # ------------------------------------

        progress["last_completed_page"] = page

        # Limpiar IDs de la página completada
        done_ids.clear()
        progress["current_page_done_ids"] = []

        save_progress(progress)

        logger.info(
            f"✅ Página {page} completada."
        )

        logger.info(
            f"Procesadas: {progress['processed']}"
        )

        logger.info(
            f"Guardadas: {progress['saved']}"
        )

    logger.info(
        "\n========================================"
    )

    logger.info(
        "🎃 IMPORTACIÓN TERMINADA"
    )

    logger.info(
        f"Procesadas: {progress['processed']}"
    )

    logger.info(
        f"Guardadas: {progress['saved']}"
    )

    errors = load_errors()

    if errors:
        logger.info(
            f"⚠️ {len(errors)} errores registrados en: "
            f"{ERROR_FILE}"
        )

        logger.info(
            "Ejecuta 'python retry_errors.py' para "
            "reintentar las películas fallidas."
        )

    else:
        logger.info(
            "🎉 Sin errores."
        )

    logger.info(
        "========================================"
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    import_movies()
