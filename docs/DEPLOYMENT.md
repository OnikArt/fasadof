# Deployment

## Local

```bash
npm install
npm run dev
```

## Quality gate

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Current Sites deployment

This repository is also configured for Sites through `.openai/hosting.json`.

Logical bindings:

- D1: `DB`;
- R2: not used.

## Vercel frontend

- Build command: `npm run build`.
- Public env only: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_YANDEX_METRIKA_ID`, `NEXT_PUBLIC_VK_PIXEL_ID`.
- Do not expose GigaChat, MAX, database or admin secrets in Vercel public variables.

## Railway backend

If backend is split to Railway, deploy server routes/API with:

- `FRONTEND_URL`;
- `DATABASE_URL`;
- `AI_PROVIDER`;
- `GIGACHAT_*`;
- `MAX_*`;
- `ADMIN_*`.

## Database

Use D1 for Sites or a compatible SQL database for split backend. Apply migration:

```text
drizzle/0000_fasadof_support.sql
```

## CORS

Use `FRONTEND_URL` as the allowed origin. Enable credentials only for auth/admin requests.

Public analytics and public catalogue requests should not send credentials by default.

## Redeploy order

1. Apply database migration.
2. Deploy backend/server routes with secrets.
3. Deploy frontend.
4. Check `/api/chat`, `/api/leads`, `/api/admin/session`.
5. Check sitemap and robots on the final domain.
