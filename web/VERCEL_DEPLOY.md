# Vercel Deploy Instructions

## Environment Variables Required

Add in Vercel Dashboard → Settings → Environment Variables.
Solo la clave publicable: acaba dentro del bundle del navegador, así que
la `service_role` no puede entrar aquí bajo ningún concepto.

```
VITE_SUPABASE_URL=https://xxdkkihdpzoxgjygblhx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_c1FHcswe1AdzbTvQRegMrw_hyuQAm-b
```

## Deploy Commands

### Option 1: Vercel CLI
```bash
cd web
npm run build
vercel --prod
```

### Option 2: Git Integration
1. Push to GitHub
2. Import project in Vercel Dashboard
3. Connect repository
4. Add environment variables
5. Deploy automatically

## Build Settings (Auto-detected)

- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Custom Domain (Optional)

After deploy, add custom domain:
1. Vercel Dashboard → Project Settings → Domains
2. Add: `oktober.tudominio.com`
3. Configure DNS records as instructed
