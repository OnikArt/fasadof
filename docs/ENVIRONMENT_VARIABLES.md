# Environment Variables

Only variables read by production code or the production start wrapper are listed here.

| Variable | Where | Required? | Secret? | Purpose | Example |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Frontend/Sites/Vercel | Yes | No | Canonical URL and metadata base | `https://fasadof.ru` |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Frontend/Sites/Vercel | No | No | Yandex Metrika counter id | `12345678` |
| `MANAGER_WAIT_TIMEOUT_MS` | Backend/VPS | No | No | Time before the local knowledge responder resumes after no manager reply | `300000` |
| `VK_GROUP_ID` | Backend/VPS | Yes for VK | No | Numeric VK community id | `237489354` |
| `VK_ACCESS_TOKEN` | Backend/VPS | Yes for VK | Yes | VK user token with Market permissions; community tokens fail on `market.get` | set on VPS only |
| `VK_CALLBACK_SECRET` | Backend/VPS | Yes for callback | Yes | Shared VK Callback secret | random value |
| `VK_CALLBACK_CONFIRMATION` | Backend/VPS | Yes for callback | Yes | VK server confirmation string | value from VK |
| `MAX_BOT_TOKEN` | Backend/VPS | Yes for MAX | Yes | MAX bot access token | set on VPS only |
| `MAX_MANAGER_CHAT_ID` | Backend/VPS | Yes for MAX | No | Manager group chat identifier | numeric chat id |
| `ADMIN_EMAIL` | Backend/Sites | Yes | No | Fallback admin login | `manager@example.com` |
| `ADMIN_NAME` | Backend/Sites | Yes | No | Fallback admin display name | `Оник` |
| `ADMIN_PASSWORD_HASH` | Backend/Sites | Yes | Yes | PBKDF2 password hash from `npm run admin:create` | `pbkdf2_sha256$...` |
| `ADMIN_SESSION_SECRET` | Backend/Sites | Yes | Yes | HMAC secret for HttpOnly manager session | random base64url |
| `FASADOF_DATA_DIR` | Backend/VPS | Yes | No | Persistent SQLite and media directory | `/var/lib/fasadof` |
| `PORT` | Backend/VPS | No | No | Local Vinext port behind Nginx | `3000` |

The first-party chat needs no third-party browser token. Only browser-readable values use `NEXT_PUBLIC_*`. VK, MAX and admin secrets are server-only.
