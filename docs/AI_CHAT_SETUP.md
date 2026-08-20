# AI chat setup

## Purpose

The chat UI talks only to `/api/chat`. Browser code never receives AI provider secrets. The first provider is Gemini, with a safe knowledge-only fallback when no key is configured.

## Gemini key

1. Open Google AI Studio.
2. Create a Gemini API key.
3. Add it only to server-side environment variables as `GEMINI_API_KEY`.
4. Do not create `VITE_GEMINI_API_KEY` or `NEXT_PUBLIC_GEMINI_API_KEY`.

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and set:

```env
GEMINI_API_KEY=your_server_key
```

## Production setup

Set `GEMINI_API_KEY` in the backend/serverless environment. For Vercel Functions or Railway, store it in encrypted project variables.

## How it works

`server/ai.ts` defines the `AIProvider` interface. `createAIProvider()` returns Gemini when `GEMINI_API_KEY` exists, otherwise a knowledge-only provider. `server/knowledge.ts` builds structured context from catalogue, FAQ, delivery and working hours.

## Guardrails

The assistant must not invent prices, timelines, availability, guarantees or technical characteristics. If data is missing, it should offer to transfer the question to a manager.

## Human takeover

The chat supports `AI`, `WAITING_FOR_OPERATOR`, `OPERATOR` and `CLOSED`. After takeover, AI replies stop until the operator returns the conversation to AI.

## Privacy

Do not send phone, email or address to Gemini unless the answer absolutely requires it. Lead contacts belong in the lead/conversation database, not in the AI prompt by default.

## Troubleshooting

- 400 from `/api/chat`: message is empty.
- 503 from `/api/chat`: provider unavailable or key invalid.
- Generic replies: `GEMINI_API_KEY` is missing, so fallback mode is active.
