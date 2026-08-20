# Environment variables

## Vercel / public frontend

| Name | Secret? | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical production URL |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | No | Yandex Metrika counter id |
| `NEXT_PUBLIC_VK_PIXEL_ID` | No | VK pixel id |

## Railway / backend

| Name | Secret? | Description |
| --- | --- | --- |
| `FRONTEND_URL` | No | Allowed production origin for CORS |
| `CRM_WEBHOOK_URL` | Yes | Optional CRM webhook |

## Database

| Name | Secret? | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQL database URL for split backend |
| `DB` | Yes | Sites / Cloudflare D1 logical binding |

## AI

| Name | Secret? | Description |
| --- | --- | --- |
| `AI_PROVIDER` | No | `gigachat` by default |
| `GIGACHAT_AUTH_KEY` | Yes | Authorization key for OAuth |
| `GIGACHAT_SCOPE` | No | Usually `GIGACHAT_API_PERS` |
| `GIGACHAT_MODEL` | No | Model name, default `GigaChat` |
| `GIGACHAT_BASE_URL` | No | Default `https://api.giga.chat` |
| `GIGACHAT_AUTH_URL` | No | Optional explicit OAuth URL |
| `GIGACHAT_TIMEOUT_MS` | No | Network timeout |
| `GEMINI_API_KEY` | Yes | Optional fallback only |

## Analytics / messengers

| Name | Secret? | Description |
| --- | --- | --- |
| `MAX_BOT_TOKEN` | Yes | MAX bot token |
| `MAX_CHAT_ID` | Yes | Manager chat id |

## Auth

| Name | Secret? | Description |
| --- | --- | --- |
| `ADMIN_EMAIL` | No | First manager email |
| `ADMIN_NAME` | No | Manager display name |
| `ADMIN_PASSWORD_HASH` | Yes | PBKDF2 hash from `npm run admin:create` |
| `ADMIN_SESSION_SECRET` | Yes | HMAC secret for session cookie |

Never expose server-only values through `NEXT_PUBLIC_*`.
