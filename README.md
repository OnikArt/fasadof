# ФасадоФ

Production site for the Russian brand «ФасадоФ»: furniture fronts, countertops, catalogue management, lead forms, GigaChat support, manager takeover, MAX notifications and safe VK Market synchronization.

## Stack

- React 19
- TypeScript
- Vite / vinext
- Vinext server runtime on Node.js 22
- Persistent SQLite storage with versioned migrations

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

## Production Deploy

Production runs at `https://fasadof36.ru` on Ubuntu 24.04 behind Nginx, with the Vinext Node.js service managed by `fasadof.service` on `127.0.0.1:3000`.

```bash
cd /var/www/fasadof/fasadof
./scripts/deploy-vps.sh
```

The script performs a fast-forward pull, clean `npm ci`, typecheck, safe migrations, build, systemd restart and health check. See `docs/VPS_DEPLOY.md` for the one-time server setup and rollback procedure.

## Architecture

- `app/` - routes, metadata and API endpoints.
- `components/` - header, home experience, product cards, lead form, support chat and admin UI.
- `config/business.ts` - centralized phone, email, address, delivery, working hours and social links.
- `data/products.ts` - initial catalogue seed data.
- `features/analytics/` - browser analytics event abstraction.
- `features/attribution/` - first-touch and last-touch UTM/referrer capture.
- `features/phone/` - shared Russian phone formatting, normalization and validation.
- `server/` - server-only AI, persistent storage, VK/MAX integrations, auth, support and rate limiting.
- `db/schema.ts` and `drizzle/` - database schema and migrations.
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
- `POST /api/integrations/vk/callback`
- `POST /api/admin/integrations/vk/sync`
- `POST /api/admin/integrations/max/test`
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
- VK: `VK_GROUP_ID`, `VK_ACCESS_TOKEN`, `VK_CALLBACK_SECRET`, `VK_CALLBACK_CONFIRMATION`;
- MAX: `MAX_BOT_TOKEN`, `MAX_MANAGER_CHAT_ID`;
- local persistence: `FASADOF_DATA_DIR=/var/lib/fasadof`.

## Documentation

- `docs/DEPLOYMENT.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/ADMIN_GUIDE.md`
- `docs/ADMIN_SETUP.md`
- `docs/SUPPORT_CHAT.md`
- `docs/AI_CHAT_SETUP.md`
- `docs/PRODUCTION_DEPLOY.md`
- `docs/VPS_DEPLOY.md`
- `docs/VK_MAX_INTEGRATION.md`
- `docs/VERCEL_RAILWAY.md`
- `docs/CONTENT_MANAGEMENT.md`
- `docs/ANALYTICS_SETUP.md`
