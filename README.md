# ФасадоФ

Production-ready сайт для бренда «ФасадоФ»: мебельные фасады, столешницы, каталог материалов, заявки, SEO, аналитика, AI-чат и MAX-интеграция.

## Stack

- React
- TypeScript
- Vite / vinext
- Cloudflare Worker-compatible runtime
- Drizzle schema for future database persistence

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run typecheck
npm run build
```

## Architecture

- `config/business.ts` - business settings, delivery, hours, contacts, social links.
- `data/products.ts` - single product catalogue source.
- `data/faq.ts` - FAQ and AI knowledge content.
- `components/` - home experience, lead form, support chat.
- `features/analytics/` - centralized analytics layer.
- `features/attribution/` - UTM first-touch and last-touch capture.
- `server/` - server-only AI, MAX, lead and knowledge abstractions.
- `app/api/` - API endpoints for leads and chat.
- `db/schema.ts` - database-ready tables for leads, chat sessions, messages and operators.
- `docs/` - setup, launch and integration documentation.

## Pages

- `/`
- `/catalog/:slug`
- `/admin/support`
- `/privacy`
- branded 404

## Integration points

- `POST /api/leads`
- `POST /api/chat`
- Gemini through `GEMINI_API_KEY`
- MAX through `MAX_BOT_TOKEN` and `MAX_CHAT_ID`
- Yandex Metrika / VK Pixel through `features/analytics/analytics.ts`

## Required owner data

- phone
- email
- address
- social URLs
- production domain
- Gemini key
- MAX token and chat id
- analytics IDs
- final privacy policy/legal details
