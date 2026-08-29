# Vercel 404 And Railway Deploy

## Why Vercel Shows 404

This project is a Vinext/Vite fullstack app. `npm run build` creates a `dist/` build, and `npm run start` runs `vinext start` to serve SSR, API routes and static files.

Vercel does not run this project correctly as a plain static site or as a Next.js app. If Vercel guesses an output directory such as `dist/client`, the SSR/API runtime is skipped and the result can be:

```text
404: NOT_FOUND
Code: NOT_FOUND
```

This is not fixed by adding more environment variables.

## Use Railway Now

Deploy from GitHub:

```text
Railway -> New Project -> Deploy from GitHub -> OnikArt/fasadof
```

Settings:

```text
Root Directory: /
Build Command: npm ci && npm run build
Start Command: npm run start
Healthcheck Path: /health
```

`railway.json` already contains these values.

Do not add `PORT` manually unless Railway support asks for it. Railway injects `PORT`, and the app should listen on that value.

## Required Railway Variables

Copy values from `.env.example`:

```env
NEXT_PUBLIC_SITE_URL=https://your-production-domain.ru
NEXT_PUBLIC_YANDEX_METRIKA_ID=
NEXT_PUBLIC_CHAT2DESK_WIDGET_TOKEN=
NEXT_PUBLIC_CHAT2DESK_URL=https://livechatv2.chat2desk.com
NEXT_PUBLIC_CHAT2DESK_SOCKET_URL=wss://livechatv2.chat2desk.com/widget_ws_new
NEXT_PUBLIC_CHAT2DESK_STATIC_DOMAIN=https://storage.chat2desk.com/
AI_PROVIDER=gigachat
GIGACHAT_AUTH_KEY=
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat
GIGACHAT_BASE_URL=https://api.giga.chat
GIGACHAT_AUTH_URL=
GIGACHAT_TIMEOUT_MS=12000
MANAGER_WAIT_TIMEOUT_MS=300000
ADMIN_EMAIL=
ADMIN_NAME=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
```

## Database Note

The current production database path is Cloudflare D1 via binding `DB`. Railway can run the app, but it does not provide the D1 binding. For persistent leads/products/support data on Railway, add a separate database adapter first. Without that adapter, use the existing Cloudflare/Sites deployment for D1-backed production.

## If Vercel Is Required Later

Vinext can target Vercel through Nitro, but that is an architecture change:

```text
npm install nitro
add nitro() to vite.config.ts
Build Command: vite build
Output Directory: .output
```

Before doing this, decide how to replace or bridge the Cloudflare D1 `DB` binding on Vercel.
