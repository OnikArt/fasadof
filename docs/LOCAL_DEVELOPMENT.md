# Local development

## 1. Requirements

- Node.js 22.13 or newer;
- npm 10 or newer;
- Git.

The VPS build uses persistent SQLite through Node's built-in `node:sqlite`. PostgreSQL is not required by the current single-server architecture; adding it to local setup would produce an environment different from production.

## 2. Install

```bash
npm ci
cp .env.example .env
```

## 3. Environment

Set at minimum:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
FASADOF_DATA_DIR=.data
ADMIN_SESSION_SECRET=<random-string-at-least-32-characters>
```

Generate the first fallback administrator and copy the printed `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD_HASH` values to `.env`:

```bash
npm run admin:create -- admin@example.com "a-long-unique-password" "Administrator"
```

Keep MAX and VK values empty unless the integration is deliberately being tested.

## 4. Database and migrations

```bash
npm run migrate:vps
```

The command creates `.data/fasadof.sqlite`, applies every unapplied migration in order and seeds catalogue/category defaults when the application first reads them.

## 5. Run

```bash
npm run dev
```

Open `http://localhost:3000`, then `http://localhost:3000/admin/login`.

## 6. Verify

```bash
npm run typecheck
npm run lint
npm test
```

Also verify a lead, a customer chat, manager takeover/reply/close/rating, product image upload and logout in the browser.
