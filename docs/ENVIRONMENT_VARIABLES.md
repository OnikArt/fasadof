# Environment variables

| Name | Where | Secret? | Description | Example format |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Frontend / Vercel | No | Public canonical site URL | `https://fasadof.ru` |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Frontend / Vercel | No | Yandex Metrika counter id | `12345678` |
| `NEXT_PUBLIC_VK_PIXEL_ID` | Frontend / Vercel | No | VK advertising pixel id | `VK-RTRG-...` |
| `GEMINI_API_KEY` | Backend / Railway or Functions | Yes | Gemini provider key for AI chat | `AIza...` |
| `MAX_BOT_TOKEN` | Backend / Railway or Functions | Yes | MAX bot token | token string |
| `MAX_CHAT_ID` | Backend / Railway or Functions | Yes | Manager chat/channel id | numeric/string id |
| `DATABASE_URL` | Backend / Railway or Functions | Yes | Production database connection | provider-specific |
| `CRM_WEBHOOK_URL` | Backend / Railway or Functions | Yes | Optional CRM lead endpoint | `https://...` |
| `ADMIN_AUTH_PROVIDER` | Backend / Railway or Functions | No | Admin authentication provider | `clerk`, `auth0`, internal |

Never expose `GEMINI_API_KEY`, `MAX_BOT_TOKEN`, database credentials or CRM secrets through public frontend variables.
