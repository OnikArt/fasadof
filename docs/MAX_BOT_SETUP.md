# MAX bot setup

## Purpose

After lead submission, `/api/leads` can notify a manager through MAX Bot API. Tokens stay server-side.

## Create a bot

1. Create a MAX bot through the official MAX bot flow.
2. Copy the bot token.
3. Determine the manager chat or channel id that should receive leads.

## Environment

```env
MAX_BOT_TOKEN=
MAX_CHAT_ID=
```

Do not expose either value in frontend variables.

## Lead notification

`server/max.ts` prepares a message with:

- name
- phone
- material
- area
- message
- source
- campaign
- page

## Local test

1. Set `MAX_BOT_TOKEN` and `MAX_CHAT_ID`.
2. Run `npm run dev`.
3. Submit the form.
4. Check the response from `/api/leads`.

## Production

Set the same variables in the backend runtime. If webhooks are added later, create a separate route and validate MAX signatures or tokens server-side.

## Troubleshooting

- `MAX credentials are not configured`: env is missing.
- `MAX API request failed`: token, chat id or API endpoint must be checked.
