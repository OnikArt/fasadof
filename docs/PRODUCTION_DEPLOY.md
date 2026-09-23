# Production deployment

The supported production target is one Linux VPS:

```text
Internet -> Nginx/HTTPS -> Node/Vinext :3000 -> persistent SQLite + media
```

Use `docs/VPS_DEPLOY.md` for the one-time server installation and `docs/DAILY_WORKFLOW.md` for routine deploy, backup and rollback.

## Required acceptance checks

1. `npm ci && npm run typecheck && npm run lint && npm test` passes before push.
2. `/health` returns `{"status":"ok"}` after deployment.
3. Admin login, session persistence, protected route and logout work over HTTPS.
4. A lead persists and arrives in MAX.
5. Customer chat creates a conversation; a manager can take, reply, close and receive a rating.
6. Product/category CRUD and a real image upload survive a service restart.
7. VK preview is reviewed before apply; synchronization never deletes site-only products.
8. The latest SQLite and media backup can be restored on staging.

Vercel, Railway, Cloudflare D1 and PostgreSQL are not production dependencies of the current VPS topology.
