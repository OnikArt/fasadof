# Environment Variables

Only variables read by production code or the production start wrapper are listed here.

| Variable | Where | Required? | Secret? | Purpose | Example |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Frontend/Sites/Vercel | Yes | No | Canonical URL and metadata base | `https://fasadof.ru` |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Frontend/Sites/Vercel | No | No | Yandex Metrika counter id | `12345678` |
| `NEXT_PUBLIC_CHAT2DESK_WIDGET_TOKEN` | Frontend/Sites/Vercel | Yes for chat | No | Public Chat2Desk widget token | from Chat2Desk widget settings |
| `NEXT_PUBLIC_CHAT2DESK_URL` | Frontend/Sites/Vercel | No | No | Chat2Desk base URL override | `https://livechatv2.chat2desk.com` |
| `NEXT_PUBLIC_CHAT2DESK_SOCKET_URL` | Frontend/Sites/Vercel | No | No | Chat2Desk WebSocket URL override | `wss://livechatv2.chat2desk.com/widget_ws_new` |
| `NEXT_PUBLIC_CHAT2DESK_STATIC_DOMAIN` | Frontend/Sites/Vercel | No | No | Chat2Desk static files domain override | `https://storage.chat2desk.com/` |
| `AI_PROVIDER` | Backend/Sites | No | No | AI provider selector | `gigachat` |
| `GIGACHAT_AUTH_KEY` | Backend/Sites | Yes for real AI | Yes | GigaChat OAuth authorization key | base64 `client_id:secret` |
| `GIGACHAT_SCOPE` | Backend/Sites | No | No | GigaChat OAuth scope | `GIGACHAT_API_PERS` |
| `GIGACHAT_MODEL` | Backend/Sites | No | No | Chat model name | `GigaChat` |
| `GIGACHAT_BASE_URL` | Backend/Sites | No | No | GigaChat API base URL | `https://api.giga.chat` |
| `GIGACHAT_AUTH_URL` | Backend/Sites | No | No | Explicit OAuth endpoint if account requires it | `https://ngw.devices.sberbank.ru:9443/api/v2/oauth` |
| `GIGACHAT_TIMEOUT_MS` | Backend/Sites | No | No | AI request timeout | `12000` |
| `MANAGER_WAIT_TIMEOUT_MS` | Backend/Sites | No | No | Time before AI resumes after no manager reply | `300000` |
| `ADMIN_EMAIL` | Backend/Sites | Yes | No | Fallback admin login | `manager@example.com` |
| `ADMIN_NAME` | Backend/Sites | Yes | No | Fallback admin display name | `Оник` |
| `ADMIN_PASSWORD_HASH` | Backend/Sites | Yes | Yes | PBKDF2 password hash from `npm run admin:create` | `pbkdf2_sha256$...` |
| `ADMIN_SESSION_SECRET` | Backend/Sites | Yes | Yes | HMAC secret for HttpOnly manager session | random base64url |
| `PORT` | Railway/local start | No | No | Runtime port forwarded to Vinext | `3000` |

`DB` is not an `.env` variable in this project. It is the logical D1 binding declared in `.openai/hosting.json`.

Do not expose GigaChat, database, or admin secrets through `NEXT_PUBLIC_*`.

MAX bot delivery is intentionally disabled until moderation is complete. VK pixel and VK lead notifications are not part of the current production flow.
