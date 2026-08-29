# ФасадоФ

Production-oriented site for the Russian brand «ФасадоФ»: furniture fronts, countertops, catalogue pages, lead forms, SEO, attribution, GigaChat-powered support chat, manager takeover and VK lead notifications.

## Stack

- React 19
- TypeScript
- Vite / vinext
- Cloudflare Worker-compatible runtime through Sites
- Drizzle schema for D1-compatible persistence

## Local Start

```bash
npm install
npm run dev
```

The local runner reads `.env` before starting vinext.

## Build And Preview

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

## Deploy

The current production target is a fullstack Vinext service, so deploy the GitHub repository to Railway or the existing Cloudflare/Sites worker environment.

For Railway:

```text
Build Command: npm run build
Start Command: npm run start
Healthcheck Path: /health
```

These settings are also stored in `railway.json`.

Vercel is not supported by this repository without a separate Nitro migration. A plain Vercel import can return `404: NOT_FOUND` because Vinext's `dist/` output needs the `vinext start` runtime.

## Architecture

- `app/` - routes, metadata and API endpoints.
- `components/` - header, home experience, product cards, lead form, support chat and admin UI.
- `config/business.ts` - centralized phone, email, address, delivery, working hours and social links.
- `data/products.ts` - catalogue data and prices.
- `features/analytics/` - browser analytics event abstraction.
- `features/attribution/` - first-touch and last-touch UTM/referrer capture.
- `features/phone/` - shared Russian phone formatting, normalization and validation.
- `server/` - server-only AI, lead persistence, VK notifications, auth, support storage and rate limiting.
- `db/schema.ts` and `drizzle/` - database schema and migration.
- `docs/` - deployment, admin, support, env and integration guides.

## Main Routes

- `/`
- `/catalog`
- `/catalog/:slug`
- `/admin/login`
- `/admin/support`
- `/privacy`

## Main APIs

- `POST /api/leads`
- `POST /api/chat`
- `GET/POST /api/admin/session`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET/POST /api/admin/conversations`
- `GET/PATCH /api/admin/leads`

## Environment

Use `.env.example` as the template. Server secrets must not use `NEXT_PUBLIC_*`.

Required production integrations:

- GigaChat: `GIGACHAT_AUTH_KEY`;
- Chat2Desk: `NEXT_PUBLIC_CHAT2DESK_WIDGET_TOKEN`;
- Admin auth: `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`;
- D1/Sites database binding: `DB`.

## Documentation

- `docs/DEPLOYMENT.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/ADMIN_GUIDE.md`
- `docs/ADMIN_SETUP.md`
- `docs/SUPPORT_CHAT.md`
- `docs/AI_CHAT_SETUP.md`
- `docs/PRODUCTION_DEPLOY.md`
- `docs/VERCEL_RAILWAY.md`
- `docs/CONTENT_MANAGEMENT.md`
- `docs/ANALYTICS_SETUP.md`
