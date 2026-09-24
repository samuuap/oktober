import os
import json
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

# ============================================================
# CALENDARIO OFICIAL OKTOBER 2024
# ============================================================

# 31 películas curadas manualmente para octubre 2024
# Progresión: suave → medio → intenso hacia Halloween

CALENDAR_2024 = [
    # Días 1-10: Intro suave, clásicos accesibles
    {"day": 1, "tmdb_id": 4488, "theme": "Intro suave", "note": "Friday the 13th - Clásico slasher para arrancar"},
    {"day": 2, "tmdb_id": 539, "theme": "Tensión", "note": "Psycho - Hitchcock maestro del suspense"},
    {"day": 3, "tmdb_id": 694, "theme": "Supernatural", "note": "The Shining - Kubrick icónico"},
    {"day": 4, "tmdb_id": 745, "theme": "Terror italiano", "note": "Suspiria (1977) - Giallo colorido"},
    {"day": 5, "tmdb_id": 346, "theme": "Found footage", "note": "The Blair Witch Project - Pionero"},
    {"day": 6, "tmdb_id": 4995, "theme": "J-Horror", "note": "Ringu - Terror japonés"},
    {"day": 7, "tmdb_id": 4348, "theme": "Vampiros", "note": "Let the Right One In - Poético"},
    {"day": 8, "tmdb_id": 2667, "theme": "Zombies", "note": "28 Days Later - Infectados rápidos"},
    {"day": 9, "tmdb_id": 482, "theme": "Slasher", "note": "A Nightmare on Elm Street - Freddy Krueger"},
    {"day": 10, "tmdb_id": 424, "theme": "Scream meta", "note": "Scream - Horror con humor"},

    # Días 11-20: Escalando intensidad, horror moderno
    {"day": 11, "tmdb_id": 340666, "theme": "Sobrenatural", "note": "The Conjuring - James Wan"},
    {"day": 12, "tmdb_id": 138843, "theme": "Posesión", "note": "The Conjuring 2 - Valak"},
    {"day": 13, "tmdb_id": 270303, "theme": "Paranormal", "note": "Insidious - Viaje astral"},
    {"day": 14, "tmdb_id": 126125, "theme": "Terror familiar", "note": "Sinister - Snuff films"},
    {"day": 15, "tmdb_id": 332562, "theme": "Moderno", "note": "A Quiet Place - Silencio tenso"},
    {"day": 16, "tmdb_id": 419430, "theme": "Folclore", "note": "Get Out - Terror social"},
    {"day": 17, "tmdb_id": 530385, "theme": "Cult", "note": "Midsommar - Horror diurno"},
    {"day": 18, "tmdb_id": 423108, "theme": "Hereditario", "note": "Hereditary - Trauma familiar"},
    {"day": 19, "tmdb_id": 760104, "theme": "Folk horror", "note": "X - Ti West slasher"},
    {"day": 20, "tmdb_id": 646385, "theme": "Scream sequel", "note": "Scream (2022) - Requel"},

    # Días 21-31: Máxima intensidad hacia Halloween
    {"day": 21, "tmdb_id": 454626, "theme": "Sonic terror", "note": "Smile - Entidad maldita"},
    {"day": 22, "tmdb_id": 663712, "theme": "Slasher extremo", "note": "Terrifier 2 - Art the Clown"},
    {"day": 23, "tmdb_id": 630586, "theme": "Gore", "note": "The Sadness - Virus rabia extremo"},
    {"day": 24, "tmdb_id": 419704, "theme": "Meta horror", "note": "Last Night in Soho - Psych twist"},
    {"day": 25, "tmdb_id": 632632, "theme": "Body horror", "note": "The Substance - Demi Moore"},
    {"day": 26, "tmdb_id": 758323, "theme": "Survival", "note": "The Pope's Exorcist - Russell Crowe"},
    {"day": 27, "tmdb_id": 938614, "theme": "Slasher", "note": "Scream VI - NYC matanza"},
    {"day": 28, "tmdb_id": 646097, "theme": "Evil", "note": "Evil Dead Rise - Cronenberg vibes"},
    {"day": 29, "tmdb_id": 807172, "theme": "Posesión", "note": "The Exorcist: Believer"},
    {"day": 30, "tmdb_id": 285, "theme": "Clásico", "note": "Halloween (1978) - Noche previa"},
    {"day": 31, "tmdb_id": 346, "theme": "Halloween night", "note": "Trick 'r Treat - Antología perfecta"}
]

# ============================================================
# POBLAR CALENDARIO
# ============================================================

def populate_calendar():
    print("=" * 60)
    print("OKTOBER - POBLANDO CALENDARIO OFICIAL 2024")
    print("=" * 60)

    for entry in CALENDAR_2024:
        try:
            # Verificar que película existe en DB
            movie_check = (
                supabase
                .table("movies")
                .select("tmdb_id, title")
                .eq("tmdb_id", entry["tmdb_id"])
                .execute()
            )

            if not movie_check.data:
                print(f"⚠️  Día {entry['day']}: Película TMDB {entry['tmdb_id']} no encontrada en DB")
                continue

            movie_title = movie_check.data[0].get("title", "?")

            # Insertar/actualizar en calendario oficial
            result = (
                supabase
                .table("official_calendar")
                .upsert({
                    "day_number": entry["day"],
                    "tmdb_id": entry["tmdb_id"],
                    "theme": entry.get("theme"),
                    "note": entry.get("note"),
                    "year": 2024
                })
                .execute()
            )

            print(f"✅ Día {entry['day']:2d}: {movie_title} ({entry['theme']})")

        except Exception as error:
            print(f"❌ Error día {entry['day']}: {error}")

    print("\n" + "=" * 60)
    print("[OK] CALENDARIO OFICIAL 2024 POBLADO")
    print("=" * 60)

if __name__ == "__main__":
    populate_calendar()
