"""Deja SUPABASE_SERVICE_ROLE_KEY bien puesta en .env, sin copiar de una pantalla.

Dos formas de usarlo:

  python3 scripts/set_key.py sbp_...   Token de cuenta: pide la clave a la API de gestión.
  python3 scripts/set_key.py   Sin argumentos: coge del portapapeles lo que haya
                               (clave secreta o JWT) y lo valida antes de escribir.

Nunca imprime la clave: solo confirma qué ha guardado.
"""
import base64, json, pathlib, re, subprocess, sys, urllib.request, urllib.error

PROJECT_REF = "xxdkkihdpzoxgjygblhx"
VAR = "SUPABASE_SERVICE_ROLE_KEY"
ENV = pathlib.Path(__file__).resolve().parent.parent / ".env"


def write(key, descripcion):
    text = ENV.read_text(encoding="utf-8")
    if not re.search(rf"^{VAR}=", text, re.M):
        sys.exit(f"No encuentro la línea {VAR}= en {ENV}")
    ENV.write_text(re.sub(rf"^{VAR}=.*$", f"{VAR}={key}", text, flags=re.M), encoding="utf-8")
    print(f"Guardada en {ENV}: {descripcion} ({len(key)} caracteres)")


def from_management_api(token):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/api-keys",
        headers={"Authorization": f"Bearer {token}", "accept": "application/json"})
    try:
        keys = json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        sys.exit(f"La API de gestión responde {e.code}. Revisa que el token sea válido "
                 f"y tenga acceso al proyecto {PROJECT_REF}.\n{e.read().decode()[:200]}")

    for k in keys:
        if k.get("name") == "service_role" or k.get("type") == "secret":
            return k["api_key"], f"clave '{k.get('name')}' del proyecto {PROJECT_REF}"
    sys.exit("La API no devolvió ninguna clave service_role/secret. "
             "Claves vistas: " + ", ".join(str(k.get("name")) for k in keys))


def validate(key):
    if key.startswith("sb_secret_"):
        return key, "clave secreta (sb_secret_)"
    if key.startswith("eyJ"):
        parts = key.split(".")
        if len(parts) != 3:
            sys.exit(f"Truncada: {len(parts)} tramo(s) en vez de 3. Es lo que se copia "
                     "cuando la clave está enmascarada en el panel.")
        pad = parts[1] + "=" * (-len(parts[1]) % 4)
        claims = json.loads(base64.urlsafe_b64decode(pad))
        if claims.get("role") != "service_role":
            sys.exit(f"El rol de ese JWT es '{claims.get('role')}', no 'service_role'.")
        return key, f"JWT service_role del proyecto {claims.get('ref')}"
    if key.startswith("sb_publishable_"):
        sys.exit("Eso es la clave publicable, la del frontend.")
    sys.exit(f"Formato no reconocido (empieza por {key[:8]!r}).")


arg = sys.argv[1].strip() if len(sys.argv) > 1 else ""
if arg.startswith("sbp_"):
    write(*from_management_api(arg))
else:
    clip = subprocess.run(["pbpaste"], capture_output=True, text=True).stdout.strip().strip("\"'")
    raw = arg or clip
    if not raw:
        sys.exit("Pásame un token sbp_... o copia la clave al portapapeles.")
    if raw.startswith("sbp_"):
        write(*from_management_api(raw))
    else:
        write(*validate(raw))
