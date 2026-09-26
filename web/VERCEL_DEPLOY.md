# Desplegar en Vercel

El frontend vive en `web/`, no en la raíz del repositorio. Ese es el único
punto donde suele fallar el despliegue: hay que decírselo a Vercel.

## 1. Importar el repositorio

Vercel → **Add New… → Project** → elige `samuuap/oktober`.

En la pantalla de configuración, antes de desplegar:

| Ajuste | Valor |
|---|---|
| **Root Directory** | `web` ← **imprescindible** |
| Framework Preset | Vite (se detecta solo) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

El resto lo resuelve `web/vercel.json`, que además cachea los assets un año:
llevan hash en el nombre, así que un despliegue nuevo invalida solo lo que
cambia.

## 2. Variables de entorno

En **Settings → Environment Variables**, para Production, Preview y Development:

```
VITE_SUPABASE_URL=https://xxdkkihdpzoxgjygblhx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_c1FHcswe1AdzbTvQRegMrw_hyuQAm-b
```

Solo la clave publicable. Todo lo que entre aquí acaba dentro del bundle que
descarga el navegador: una `service_role` ahí sería regalar la base de datos.
Lo que protege los datos son las políticas RLS, no el secreto de esta clave.

## 3. Desplegar

Con la integración de Git, cada push a `main` despliega solo y cada rama abre
una preview.

Desde el terminal, como alternativa:

```bash
npx vercel link      # una sola vez, preguntará el Root Directory
npx vercel --prod
```

## 4. Sobre el acceso

No hace falta tocar nada en Supabase. El registro es solo correo y contraseña,
sin redirección de por medio: `AuthModal` crea la cuenta y abre el onboarding
en el acto.

Ojo con dos cosas relacionadas, para cuando toque:

- En `AuthContext` hay un `signInWithGoogle` y en `AuthModal` un
  `handleGoogleSignIn`, pero **ningún botón los llama** y el proveedor está
  deshabilitado en Supabase (`provider is not enabled`). Es código muerto.
- Si algún día activas la confirmación por correo, o habilitas un proveedor
  externo, entonces sí tendrás que rellenar **Authentication → URL
  Configuration** con la URL de producción: el enlace del correo se construye
  a partir del *Site URL* y, sin eso, apuntaría a `localhost`.

## Dominio propio (opcional)

Settings → Domains → añadir, y configurar los DNS que indique.
