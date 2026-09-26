import os
import sys
import time
from datetime import date

import requests
from dotenv import load_dotenv
from supabase import create_client

# ============================================================
# CONFIGURACIÓN
# ============================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Faltan credenciales Supabase en .env")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Solo hace falta para rescatar películas que no están en el catálogo
# (el importador únicamente trajo género Terror con +1000 votos).
TMDB_TOKEN = os.getenv("TMDB_TOKEN")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
WATCH_PROVIDER_COUNTRY = "ES"

# ============================================================
# CALENDARIO OFICIAL OKTOBER
# ============================================================

# El año se pasa por argumento:  python populate_official_calendar.py 2026
# Por defecto se publica el del año en curso, que es el que busca la web.
TARGET_YEAR = int(sys.argv[1]) if len(sys.argv) > 1 else date.today().year

# 31 películas curadas manualmente para octubre de 2026.
# Progresión: sustos accesibles → crueldad → infección → autor →
# estrenos del año → respiro final la noche de Halloween.
#
# `theme` es lo ÚNICO que se ve en la puerta sellada ("Pista: ..."),
# así que sugiere sin cantar el título y se queda corto (cabe en una línea).
# `note` es editorial interna: no se pinta en ningún sitio.

CALENDAR = [
    # Días 1-6: entrada. Sustos, casa encantada y found footage.
    {"day": 1,  "tmdb_id": 1430077, "title": "Hokum (2026)",
     "theme": "Posada irlandesa",    "note": "Hokum - un escritor de terror y las cenizas de sus padres"},
    {"day": 2,  "tmdb_id": 23827,   "title": "Paranormal Activity (2007)",
     "theme": "Found footage",       "note": "Paranormal Activity - la cámara fija del dormitorio"},
    {"day": 3,  "tmdb_id": 21208,   "title": "La huérfana (2009)",
     "theme": "Thriller doméstico",  "note": "Orphan - el giro más sucio del cine de adopción"},
    {"day": 4,  "tmdb_id": 333371,  "title": "Calle Cloverfield 10 (2016)",
     "theme": "Encierro",            "note": "10 Cloverfield Lane - búnker, paranoia y Goodman"},
    {"day": 5,  "tmdb_id": 1138194, "title": "Heretic (2024)",
     "theme": "Fe a prueba",         "note": "Heretic - Hugh Grant como el anfitrión equivocado"},
    {"day": 6,  "tmdb_id": 80280,   "title": "REC 3: Génesis (2012)",
     "theme": "Banquete de bodas",   "note": "[REC]³ Génesis - la saga sale del portal y se va de boda"},

    # Días 7-12: el bloque duro. Crueldad, trampas y carne.
    {"day": 7,  "tmdb_id": 381283,  "title": "Madre! (2017)",
     "theme": "Alegoría",            "note": "mother! - Aronofsky y la casa que no deja de llenarse"},
    {"day": 8,  "tmdb_id": 10234,   "title": "Funny Games (1997)",
     "theme": "Home invasion",       "note": "Funny Games - Haneke: violencia sin coartada para el espectador"},
    {"day": 9,  "tmdb_id": 1010755, "title": "Los extraños: Capítulo 3 (2026)",
     "theme": "Máscaras",            "note": "The Strangers: Chapter 3 - cierre de la nueva trilogía"},
    {"day": 10, "tmdb_id": 951491,  "title": "Saw X (2023)",
     "theme": "Venganza",            "note": "Saw X - Kramer en México, la mejor de la saga moderna"},
    {"day": 11, "tmdb_id": 9539,    "title": "Mártires (2008)",
     "theme": "Extremo francés",     "note": "Martyrs - la cumbre del New French Extremity. Aviso: dura"},
    {"day": 12, "tmdb_id": 933260,  "title": "La sustancia (2024)",
     "theme": "Body horror",         "note": "The Substance - otra versión de ti, mejor en todo"},

    # Días 13-18: de lo sobrenatural a la infección.
    {"day": 13, "tmdb_id": 36647,   "title": "Blade (1998)",
     "theme": "Acción vampírica",    "note": "Blade - respiro de adrenalina a mitad de mes"},
    {"day": 14, "tmdb_id": 493922,  "title": "Hereditary (2018)",
     "theme": "Duelo familiar",      "note": "Hereditary - Ari Aster y la herencia que no se elige"},
    {"day": 15, "tmdb_id": 1480387, "title": "Undertone (2026)",
     "theme": "Podcast paranormal",  "note": "Undertone: Frecuencia maldita - cintas que no deberían sonar"},
    {"day": 16, "tmdb_id": 1576,    "title": "Resident Evil (2002)",
     "theme": "Survival horror",     "note": "Resident Evil - la Colmena y el traje rojo"},
    {"day": 17, "tmdb_id": 72190,   "title": "Guerra Mundial Z (2013)",
     "theme": "Zombis",              "note": "World War Z - la epidemia a escala de blockbuster"},
    {"day": 18, "tmdb_id": 1198984, "title": "We Bury the Dead (2026)",
     "theme": "Experimento militar", "note": "We Bury the Dead - en TMDB en español: En tierra de muertos"},

    # Días 19-23: autor y atmósfera. Menos sangre, más inquietud.
    {"day": 19, "tmdb_id": 576845,  "title": "Última noche en el Soho (2021)",
     "theme": "Fantasmas del pasado","note": "Last Night in Soho - Edgar Wright y el Londres de los 60"},
    {"day": 20, "tmdb_id": 1291595, "title": "Insidious: Fuera del más allá (2026)",
     "theme": "Viaje astral",        "note": "Insidious: Out of the Further - la saga vuelve a lo sobrenatural"},
    {"day": 21, "tmdb_id": 949423,  "title": "Pearl (2022)",
     "theme": "Technicolor",         "note": "Pearl - Mia Goth y el monólogo final"},
    {"day": 22, "tmdb_id": 399366,  "title": "El secreto de Marrowbone (2017)",
     "theme": "Gótico español",      "note": "Marrowbone - casa heredada y secreto familiar"},
    {"day": 23, "tmdb_id": 1100782, "title": "Smile 2 (2024)",
     "theme": "Estrella del pop",    "note": "Smile 2 - la maldición se contagia en plena gira"},

    # Días 24-30: la recta final con los estrenos recientes.
    {"day": 24, "tmdb_id": 574475,  "title": "Destino final: Lazos de sangre (2025)",
     "theme": "Accidentes",          "note": "Final Destination Bloodlines - la muerte cobra la deuda"},
    {"day": 25, "tmdb_id": 1100988, "title": "28 años después (2025)",
     "theme": "Infectados",          "note": "28 Years Later - Boyle vuelve a la isla"},
    {"day": 26, "tmdb_id": 1083381, "title": "Backrooms (2026)",
     "theme": "Espacios liminales",  "note": "Backrooms - pasillos infinitos, terror liminal"},
    {"day": 27, "tmdb_id": 1212763, "title": "Posesión infernal: En llamas (2026)",
     "theme": "Libro maldito",       "note": "Evil Dead Burn - nueva entrega del Necronomicón"},
    {"day": 28, "tmdb_id": 1304313, "title": "La momia de Lee Cronin (2026)",
     "theme": "Maldición antigua",   "note": "Lee Cronin's The Mummy - el director de Evil Dead Rise"},
    {"day": 29, "tmdb_id": 1339713, "title": "Obsession (2026)",
     "theme": "Hechizo",             "note": "Obsession - el amor platónico como maldición"},
    {"day": 30, "tmdb_id": 1233413, "title": "Los pecadores (2025)",
     "theme": "Blues y sangre",      "note": "Sinners - Coogler y el Misisipi de 1932"},

    # Día 31: la noche. Se baja el pulso y se cierra el mes en fiesta.
    {"day": 31, "tmdb_id": 9479,    "title": "Pesadilla antes de Navidad (1993)",
     "theme": "Stop-motion",         "note": "The Nightmare Before Christmas - el puente entre las dos fiestas"},
]

# ============================================================
# RESCATE DE PELÍCULAS FUERA DE CATÁLOGO
# ============================================================

# official_calendar.tmdb_id tiene FK a movies(tmdb_id): si la película no
# está en la tabla, el día se quedaría sin puerta. Le pasa al 31 (Pesadilla
# antes de Navidad no es género Terror, así que el importador la saltó).


def tmdb_get(endpoint, params=None):
    response = requests.get(
        f"{TMDB_BASE_URL}{endpoint}",
        headers={
            "Authorization": f"Bearer {TMDB_TOKEN}",
            "accept": "application/json"
        },
        params=params or {},
        timeout=20
    )
    response.raise_for_status()
    time.sleep(0.15)
    return response.json()


def fetch_watch_providers(tmdb_id):
    """Plataformas en España. Mismo formato que import_movies.py."""

    country = (
        tmdb_get(f"/movie/{tmdb_id}/watch/providers")
        .get("results", {})
        .get(WATCH_PROVIDER_COUNTRY, {})
    )

    def extract(category):
        return [
            {
                "provider_id": provider.get("provider_id"),
                "provider_name": provider.get("provider_name"),
                "logo_path": provider.get("logo_path")
            }
            for provider in country.get(category, [])
        ]

    return {
        "flatrate": extract("flatrate"),
        "rent": extract("rent"),
        "buy": extract("buy")
    }


def import_missing_movie(tmdb_id):
    """Trae una película suelta de TMDB y la mete en `movies`."""

    if not TMDB_TOKEN:
        raise RuntimeError(
            "no está en el catálogo y falta TMDB_TOKEN en .env para traerla"
        )

    movie = tmdb_get(f"/movie/{tmdb_id}", {"language": "es-ES"})

    release_date = movie.get("release_date") or None
    try:
        year = int(release_date[:4]) if release_date else None
    except (ValueError, TypeError):
        year = None

    supabase.table("movies").upsert(
        {
            "tmdb_id": movie["id"],
            "title": movie.get("title"),
            "original_title": movie.get("original_title"),
            "overview": movie.get("overview"),
            "release_date": release_date,
            "year": year,
            "runtime": movie.get("runtime"),
            "poster_path": movie.get("poster_path"),
            "backdrop_path": movie.get("backdrop_path"),
            "original_language": movie.get("original_language"),
            "genres": [
                {"id": genre.get("id"), "name": genre.get("name")}
                for genre in movie.get("genres", [])
            ],
            "watch_providers": fetch_watch_providers(tmdb_id),
            "popularity": movie.get("popularity"),
            "vote_average": movie.get("vote_average"),
            "vote_count": movie.get("vote_count")
        },
        on_conflict="tmdb_id"
    ).execute()

    return movie.get("title")


# ============================================================
# POBLAR CALENDARIO
# ============================================================

def populate_calendar():
    print("=" * 60)
    print(f"OKTOBER - POBLANDO CALENDARIO OFICIAL {TARGET_YEAR}")
    print("=" * 60)

    errors = 0

    for entry in CALENDAR:
        try:
            # Verificar que película existe en DB
            movie_check = (
                supabase
                .table("movies")
                .select("tmdb_id, title")
                .eq("tmdb_id", entry["tmdb_id"])
                .execute()
            )

            if movie_check.data:
                movie_title = movie_check.data[0].get("title", "?")
            else:
                # Fuera de catálogo: la traemos antes de sellar la puerta,
                # si no la FK de official_calendar rechazaría el día.
                movie_title = import_missing_movie(entry["tmdb_id"]) or entry["title"]
                print(f"   ↳ importada de TMDB: {movie_title}")

            # Insertar/actualizar en calendario oficial
            (
                supabase
                .table("official_calendar")
                .upsert(
                    {
                        "day_number": entry["day"],
                        "tmdb_id": entry["tmdb_id"],
                        "theme": entry.get("theme"),
                        "note": entry.get("note"),
                        "year": TARGET_YEAR
                    },
                    # Sin esto, relanzar el script choca con UNIQUE(day_number, year)
                    on_conflict="day_number,year"
                )
                .execute()
            )

            print(f"✅ Día {entry['day']:2d}: {movie_title} ({entry['theme']})")

        except Exception as error:
            errors += 1
            print(f"❌ Día {entry['day']:2d} ({entry['title']}): {error}")

    print("\n" + "=" * 60)
    if errors:
        print(f"[!] CALENDARIO {TARGET_YEAR}: {31 - errors}/31 días publicados, {errors} con error")
    else:
        print(f"[OK] CALENDARIO OFICIAL {TARGET_YEAR} POBLADO - 31/31 días")
    print("=" * 60)


if __name__ == "__main__":
    populate_calendar()
