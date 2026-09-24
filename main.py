import os
import time
import requests

from dotenv import load_dotenv
from supabase import create_client


# =========================================
# CONFIG
# =========================================

load_dotenv()

TMDB_TOKEN = os.getenv("TMDB_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not TMDB_TOKEN:
    raise ValueError("Falta TMDB_TOKEN")

if not SUPABASE_URL:
    raise ValueError("Falta SUPABASE_URL")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Falta SUPABASE_SERVICE_ROLE_KEY")


supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
)


TMDB_BASE_URL = "https://api.themoviedb.org/3"

HEADERS = {
    "Authorization": f"Bearer {TMDB_TOKEN}",
    "accept": "application/json"
}


# Género Horror en TMDB
HORROR_GENRE_ID = 27


# =========================================
# TMDB REQUEST
# =========================================

def tmdb_get(endpoint, params=None):

    url = f"{TMDB_BASE_URL}{endpoint}"

    response = requests.get(
        url,
        headers=HEADERS,
        params=params,
        timeout=30
    )

    response.raise_for_status()

    return response.json()


# =========================================
# OBTENER PELÍCULAS
# =========================================

def get_horror_movies(page):

    params = {
        "language": "es-ES",
        "sort_by": "popularity.desc",

        "with_genres": HORROR_GENRE_ID,

        # Evitamos películas con muy pocos votos
        "vote_count.gte": 50,

        "include_adult": "false",
        "include_video": "false",

        "page": page
    }

    return tmdb_get(
        "/discover/movie",
        params
    )


# =========================================
# OBTENER DETALLES
# =========================================

def get_movie_details(tmdb_id):

    return tmdb_get(
        f"/movie/{tmdb_id}",
        {
            "language": "es-ES"
        }
    )


# =========================================
# TRANSFORMAR DATOS
# =========================================

def transform_movie(movie):

    release_date = movie.get("release_date")

    year = None

    if release_date:
        try:
            year = int(release_date[:4])
        except ValueError:
            pass

    genres = [
        {
            "id": genre["id"],
            "name": genre["name"]
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

        "original_language": movie.get("original_language"),

        "genres": genres,

        "popularity": movie.get("popularity"),
        "vote_average": movie.get("vote_average"),
        "vote_count": movie.get("vote_count")
    }


# =========================================
# GUARDAR EN SUPABASE
# =========================================

def save_movie(movie):

    result = (
        supabase
        .table("movies")
        .upsert(
            movie,
            on_conflict="tmdb_id"
        )
        .execute()
    )

    return result


# =========================================
# IMPORTADOR
# =========================================

def import_movies(max_pages=20):

    total = 0

    for page in range(1, max_pages + 1):

        print(f"\n📥 Página {page}/{max_pages}")

        data = get_horror_movies(page)

        movies = data.get("results", [])

        if not movies:
            print("No quedan películas.")
            break

        for movie in movies:

            tmdb_id = movie["id"]

            try:

                print(
                    f"🎬 {movie.get('title')} "
                    f"(TMDB: {tmdb_id})"
                )

                details = get_movie_details(tmdb_id)

                movie_data = transform_movie(details)

                save_movie(movie_data)

                total += 1

                # Pequeña pausa para no bombardear la API
                time.sleep(0.1)

            except Exception as error:

                print(
                    f"❌ Error con {tmdb_id}: {error}"
                )

        print(
            f"✅ Página terminada. "
            f"Películas procesadas: {total}"
        )

    print("\n================================")
    print(f"🎃 IMPORTACIÓN TERMINADA")
    print(f"Películas procesadas: {total}")
    print("================================")


# =========================================
# MAIN
# =========================================

if __name__ == "__main__":

    import_movies(
        max_pages=20
    )