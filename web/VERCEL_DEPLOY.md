# Vercel Deploy Instructions

## Environment Variables Required

Add in Vercel Dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://xxdkkihdpzoxgjygblhx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZGtraWhkcHpveGdqeWdibGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzMzQ5MjcsImV4cCI6MjA1MTkxMDkyN30.4p2xS8o5kPXAW8vW-s7YkNL0HJwlbPXxFo7kCO0YXLg
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
