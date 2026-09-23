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
npm run integrations:check
```

Run the integration check on the deployed VPS, where the service user can access the production data directory and outbound provider APIs. Use `npm run integrations:check -- --send-max` once for the explicit MAX delivery acceptance test.

## Deploy order

1. Install dependencies.
2. Copy `.env.example` and prepare production secrets.
3. Set `FASADOF_DATA_DIR` and apply the SQLite migrations.
4. Add backend/Sites secret variables.
5. Add frontend public variables.
6. Deploy backend/server routes or Sites bundle.
7. Deploy frontend/domain.
8. Configure production domain and HTTPS.
9. Run backend health check: `/api/chat`, `/api/leads`, `/api/admin/session`.
10. Test the first-party `/api/chat` flow.
11. Login as manager.
12. Test manager presence in the customer chat.
13. Test lead persistence in the database.
14. Test the customer widget, manager takeover, close and rating on the production domain.

## Secrets

Keep `VK_ACCESS_TOKEN`, `MAX_BOT_TOKEN`, callback secrets and `ADMIN_*` server-side only.

`VK_ACCESS_TOKEN` must be a user token with VK Market permissions, not a community token. Keep `NODE_USE_SYSTEM_CA=1` in the VPS service environment so Node uses the operating system certificate store.

## MAX

MAX bot notifications are configured with `MAX_BOT_TOKEN` and `MAX_MANAGER_CHAT_ID` on the VPS.
