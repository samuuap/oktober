import json
import logging
import os
import random
import time

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client


# ============================================================
# CONFIGURACIÓN
# ============================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

if not SUPABASE_URL:
    raise RuntimeError("Falta SUPABASE_URL en .env")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Falta SUPABASE_SERVICE_ROLE_KEY en .env")

if not DEEPSEEK_API_KEY:
    raise RuntimeError("Falta DEEPSEEK_API_KEY en .env")


# Tamaño del lote
BATCH_SIZE = 10

# Reintentos para la IA
AI_MAX_RETRIES = 3

# Reintentos para Supabase
SUPABASE_MAX_RETRIES = 3

# Modelo de DeepSeek
DEEPSEEK_MODEL = "deepseek-chat"

# Categorías que queremos puntuar
CATEGORIES = [
    "terror",
    "gore",
    "tension",
    "humor",
    "sobrenatural",
    "slasher",
    "psicologico",
    "body_horror",
    "jump_scares",
    "atmosfera",
]


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("movie-analyzer")


# ============================================================
# CLIENTES
# ============================================================

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
)

deepseek = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = f"""Eres un experto en cine de terror con conocimiento enciclopédico.

Tu tarea es analizar películas de terror y puntuar cada una del 0 al 10 en estas categorías:

{', '.join(CATEGORIES)}

Reglas:
- Puntúa SOLO con números enteros del 0 al 10.
- 0 = la categoría no aplica en absoluto.
- 10 = nivel máximo en esa categoría.
- Basa tu análisis en el conocimiento real de la película, no solo en la sinopsis.
- Si no conoces una película, usa la sinopsis como referencia.
- Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones.
- El JSON debe usar los tmdb_id como claves (strings)."""


# ============================================================
# OBTENER PELÍCULAS SIN ANALIZAR
# ============================================================

def get_unanalyzed_movies():
    """
    Obtiene todas las películas que aún no tienen
    el campo characteristics.
    """

    all_movies = []
    page_size = 1000
    start = 0

    while True:

        response = (
            supabase
            .table("movies")
            .select("tmdb_id, title, original_title, overview")
            .is_("characteristics", "null")
            .range(start, start + page_size - 1)
            .execute()
        )

        batch = response.data

        if not batch:
            break

        all_movies.extend(batch)
        start += page_size

        if len(batch) < page_size:
            break

    return all_movies


# ============================================================
# CONSTRUIR PROMPT DEL LOTE
# ============================================================

def build_batch_prompt(movies):
    """
    Construye el prompt con las películas del lote.
    """

    lines = ["Analiza estas películas:\n"]

    for i, movie in enumerate(movies, 1):

        tmdb_id = movie["tmdb_id"]
        title = movie.get("title") or movie.get("original_title") or "Sin título"
        overview = movie.get("overview") or "Sin sinopsis disponible."

        # Truncar sinopsis muy largas para ahorrar tokens
        if len(overview) > 300:
            overview = overview[:297] + "..."

        lines.append(
            f'{i}. [ID: {tmdb_id}] "{title}" — {overview}'
        )

    categories_str = ", ".join(CATEGORIES)

    lines.append(
        f"\nResponde con JSON. Claves: los tmdb_id como strings. "
        f"Valores: objeto con {{{categories_str}}}. "
        f"Ejemplo: {{\"12345\": {{\"terror\": 8, \"gore\": 3, ...}}}}"
    )

    return "\n".join(lines)


# ============================================================
# LLAMAR A DEEPSEEK
# ============================================================

def analyze_batch(movies):
    """
    Envía un lote de películas a DeepSeek y devuelve
    el dict de puntuaciones.
    """

    prompt = build_batch_prompt(movies)

    for attempt in range(1, AI_MAX_RETRIES + 1):

        try:

            response = deepseek.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=2000,
                response_format={
                    "type": "json_object"
                }
            )

            raw = response.choices[0].message.content.strip()

            # Parsear JSON
            result = json.loads(raw)

            # Validar estructura
            validated = validate_result(
                result,
                movies
            )

            return validated

        except json.JSONDecodeError as error:

            logger.warning(
                f"JSON inválido de DeepSeek "
                f"(intento {attempt}/{AI_MAX_RETRIES}): "
                f"{error}"
            )

            if attempt >= AI_MAX_RETRIES:
                raise

        except Exception as error:

            if attempt >= AI_MAX_RETRIES:
                raise

            wait = min(
                30,
                (2 ** attempt) + random.random()
            )

            logger.warning(
                f"Error en DeepSeek "
                f"(intento {attempt}/{AI_MAX_RETRIES}): "
                f"{error}. Reintentando en {wait:.1f}s..."
            )

            time.sleep(wait)

    raise RuntimeError(
        "No se pudo obtener respuesta de DeepSeek"
    )


# ============================================================
# VALIDACIÓN
# ============================================================

def validate_result(result, movies):
    """
    Valida que el resultado contenga los tmdb_id esperados
    y que los valores estén entre 0 y 10.

    Devuelve solo los entries válidos.
    """

    validated = {}

    expected_ids = {
        str(m["tmdb_id"]) for m in movies
    }

    for tmdb_id_str, scores in result.items():

        # Normalizar: DeepSeek a veces devuelve int keys
        tmdb_id_str = str(tmdb_id_str)

        if tmdb_id_str not in expected_ids:
            logger.warning(
                f"ID inesperado en respuesta: {tmdb_id_str}"
            )
            continue

        if not isinstance(scores, dict):
            logger.warning(
                f"Puntuaciones inválidas para {tmdb_id_str}"
            )
            continue

        # Validar cada categoría
        clean_scores = {}
        valid = True

        for category in CATEGORIES:

            value = scores.get(category)

            if value is None:
                logger.warning(
                    f"Falta categoría '{category}' "
                    f"para {tmdb_id_str}"
                )
                valid = False
                break

            # Intentar convertir a int
            try:
                value = int(value)
            except (ValueError, TypeError):
                logger.warning(
                    f"Valor inválido para "
                    f"'{category}' en {tmdb_id_str}: {value}"
                )
                valid = False
                break

            # Clamp entre 0 y 10
            value = max(0, min(10, value))

            clean_scores[category] = value

        if valid:
            validated[tmdb_id_str] = clean_scores

    # Avisar de IDs que faltan
    missing = expected_ids - set(validated.keys())

    if missing:
        logger.warning(
            f"Películas sin respuesta válida: {missing}"
        )

    return validated


# ============================================================
# GUARDAR CARACTERÍSTICAS EN SUPABASE
# ============================================================

def save_characteristics(tmdb_id, characteristics):
    """
    Actualiza el campo characteristics de una película
    en Supabase, con reintentos.
    """

    for attempt in range(1, SUPABASE_MAX_RETRIES + 1):

        try:

            (
                supabase
                .table("movies")
                .update({
                    "characteristics": characteristics
                })
                .eq("tmdb_id", tmdb_id)
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
# ANALIZADOR PRINCIPAL
# ============================================================

def analyze_movies():

    logger.info(
        "========================================"
    )

    logger.info(
        "🎃 ANALIZADOR DE PELÍCULAS DE TERROR"
    )

    logger.info(
        f"Modelo: {DEEPSEEK_MODEL}"
    )

    logger.info(
        f"Tamaño de lote: {BATCH_SIZE}"
    )

    logger.info(
        f"Categorías: {', '.join(CATEGORIES)}"
    )

    logger.info(
        "========================================"
    )

    # ----------------------------------------
    # Obtener películas pendientes
    # ----------------------------------------

    movies = get_unanalyzed_movies()

    if not movies:
        logger.info(
            "🎉 Todas las películas ya están analizadas."
        )
        return

    logger.info(
        f"Películas pendientes: {len(movies)}"
    )

    total_batches = (
        (len(movies) + BATCH_SIZE - 1) // BATCH_SIZE
    )

    logger.info(
        f"Lotes necesarios: {total_batches}"
    )

    # ----------------------------------------
    # Procesar en lotes
    # ----------------------------------------

    total_saved = 0
    total_errors = 0

    for batch_num in range(total_batches):

        start = batch_num * BATCH_SIZE
        end = start + BATCH_SIZE

        batch = movies[start:end]

        titles = [
            m.get("title", "?") for m in batch
        ]

        logger.info(
            f"\n📦 Lote {batch_num + 1}/{total_batches} "
            f"({len(batch)} películas)"
        )

        logger.info(
            f"   {', '.join(titles)}"
        )

        try:

            results = analyze_batch(batch)

        except Exception as error:

            logger.error(
                f"❌ Error analizando lote "
                f"{batch_num + 1}: {error}"
            )

            total_errors += len(batch)
            continue

        # Guardar cada resultado
        for movie in batch:

            tmdb_id = movie["tmdb_id"]
            title = movie.get("title", "?")
            tmdb_id_str = str(tmdb_id)

            if tmdb_id_str not in results:

                logger.warning(
                    f"⚠️ Sin resultado para: "
                    f"{title} ({tmdb_id})"
                )

                total_errors += 1
                continue

            try:

                characteristics = results[tmdb_id_str]

                save_characteristics(
                    tmdb_id,
                    characteristics
                )

                logger.info(
                    f"   ✅ {title}: "
                    f"{json.dumps(characteristics)}"
                )

                total_saved += 1

            except Exception as error:

                logger.error(
                    f"   ❌ Error guardando {title}: "
                    f"{error}"
                )

                total_errors += 1

        logger.info(
            f"✅ Lote {batch_num + 1} completado. "
            f"Guardadas: {total_saved} | "
            f"Errores: {total_errors}"
        )

    # ----------------------------------------
    # Resumen final
    # ----------------------------------------

    logger.info(
        "\n========================================"
    )

    logger.info(
        "🎃 ANÁLISIS TERMINADO"
    )

    logger.info(
        f"Total analizadas: {total_saved}"
    )

    logger.info(
        f"Total errores: {total_errors}"
    )

    if total_errors > 0:
        logger.info(
            "Puedes volver a ejecutar el script "
            "para reintentar las fallidas."
        )

    logger.info(
        "========================================"
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    analyze_movies()

