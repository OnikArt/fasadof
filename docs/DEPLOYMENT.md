# Deployment

## Local

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` for local preview and fill the required local values. The vinext runner reads `.env` automatically.

## Quality gate

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deploy order

1. Install dependencies.
2. Copy `.env.example` and prepare production secrets.
3. Apply database migration / configure Sites D1 binding `DB`.
4. Add backend/Sites secret variables.
5. Add frontend public variables.
6. Deploy backend/server routes or Sites bundle.
7. Deploy frontend/domain.
8. Configure production domain and HTTPS.
9. Run backend health check: `/api/chat`, `/api/leads`, `/api/admin/session`.
10. Test GigaChat through `/api/chat`.
11. Login as manager.
12. Test manager presence in the customer chat.
13. Test lead persistence in the database.
14. Test Chat2Desk widget on the production domain.

## Secrets

Keep `GIGACHAT_*`, `ADMIN_*` and database bindings server-side only. Do not create browser-side keys for GigaChat.

## MAX

MAX bot integration is not used. The MAX URL remains a public social link in `config/business.ts`.
