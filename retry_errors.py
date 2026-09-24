"""
retry_errors.py

Lee import_errors.json y reintenta procesar las películas
que fallaron durante la importación principal.

Uso:
    python retry_errors.py
"""

import json
import logging
import time
from pathlib import Path

from import_movies import (
    ERROR_FILE,
    get_movie_details,
    load_errors,
    logger,
    process_movie,
    save_errors,
    save_movie,
    transform_movie,
    MIN_VOTE_COUNT,
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)


# ============================================================
# REINTENTAR ERRORES
# ============================================================

def retry_errors():

    errors = load_errors()

    if not errors:
        logger.info("🎉 No hay errores pendientes.")
        return

    total = len(errors)
    recovered = 0
    still_failed = []

    logger.info(
        "========================================"
    )

    logger.info(
        f"🔄 REINTENTANDO {total} PELÍCULAS FALLIDAS"
    )

    logger.info(
        "========================================"
    )

    for i, entry in enumerate(errors, 1):

        tmdb_id = entry["tmdb_id"]
        title = entry.get("title", f"TMDB {tmdb_id}")
        prev_error = entry.get("error", "desconocido")

        logger.info(
            f"\n[{i}/{total}] Reintentando: {title} "
            f"(TMDB {tmdb_id})"
        )

        logger.info(
            f"  Error anterior: {prev_error}"
        )

        try:

            # Construimos un dict mínimo compatible
            # con process_movie
            movie_stub = {
                "id": tmdb_id,
                "title": title
            }

            saved = process_movie(movie_stub)

            if saved:
                logger.info(
                    f"✅ Recuperada: {title}"
                )
                recovered += 1

            else:
                logger.info(
                    f"⏭️ Descartada por filtros: {title}"
                )
                # No la dejamos como error,
                # fue descartada legítimamente
                recovered += 1

        except Exception as error:

            logger.error(
                f"❌ Sigue fallando: {title} — {error}"
            )

            still_failed.append({
                "tmdb_id": tmdb_id,
                "title": title,
                "error": str(error),
                "previous_error": prev_error,
                "timestamp": time.time()
            })

    # ----------------------------------------
    # Actualizar archivo de errores
    # ----------------------------------------

    save_errors(still_failed)

    logger.info(
        "\n========================================"
    )

    logger.info(
        "🔄 REINTENTO TERMINADO"
    )

    logger.info(
        f"Recuperadas: {recovered}/{total}"
    )

    if still_failed:
        logger.info(
            f"⚠️ Siguen fallando: {len(still_failed)}"
        )

        logger.info(
            f"Errores actualizados en: {ERROR_FILE}"
        )

    else:
        logger.info(
            "🎉 Todas las películas recuperadas. "
            "Archivo de errores limpio."
        )

    logger.info(
        "========================================"
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    retry_errors()

