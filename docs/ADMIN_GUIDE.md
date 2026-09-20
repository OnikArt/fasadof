# Admin guide

## Login

Open `/admin/login` and sign in with the email and password created through:

```bash
npm run admin:create -- manager@example.com "very-strong-password" "Имя"
```

The generated env values must be present in production secrets.

## Chats

Open `/admin/support`.

Available statuses:

- `AUTO`: the local knowledge-base responder is active;
- `WAITING_OPERATOR`: customer requested a manager;
- `OPERATOR`: manager took the dialog;
- `CLOSED`: dialog is archived.

Use `Взять диалог` before replying when the customer is waiting. A reply automatically keeps the dialog in `OPERATOR`.

## Manager online status

While `/admin/support` is open, the page sends a heartbeat. Customers see manager online/offline based on this heartbeat, not based on decorative working hours.

## Close

Click `Закрыть` when the conversation is finished. Closed conversations remain visible in history.

## Logout

Click `Выйти`. The server clears the HttpOnly session cookie.

## Leads

Lead requests currently go through the public form and are persisted through `/api/leads`. The admin UI in this version focuses on support chat; a full lead CRM dashboard is not implemented yet.

## Catalogue and content

Products are managed in the admin catalogue and persisted in SQLite. Business information is edited in `config/business.ts`. See `docs/CONTENT_MANAGEMENT.md`.

## Security

Never share `ADMIN_PASSWORD_HASH` or `ADMIN_SESSION_SECRET`. If a manager password is compromised, generate a new hash and session secret.
