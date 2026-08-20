# Admin setup

Админка ФасадоФ находится по адресу `/admin/login`. `/admin/support` защищён server-side проверкой HttpOnly cookie.

## Первый менеджер

Создайте hash пароля:

```bash
npm run admin:create -- manager@example.com "very-strong-password" "Алексей"
```

Скрипт выведет:

```env
ADMIN_EMAIL=
ADMIN_NAME=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
```

Добавьте эти значения в production secrets. Не храните реальный пароль в репозитории.

## Session

После успешного входа сервер создаёт подписанную cookie `fasadof_manager_session`:

- `HttpOnly`;
- `SameSite=Lax`;
- `Secure` на HTTPS;
- срок действия 10 часов.

Logout вызывает `/api/admin/logout` и очищает cookie.

## Database

Для очереди поддержки и заявок используется D1 binding `DB` из `.openai/hosting.json`.

Миграция: `drizzle/0000_fasadof_support.sql`.

Drizzle schema: `db/schema.ts`.

## Production security

- Пароль хранится только как PBKDF2 hash.
- `ADMIN_SESSION_SECRET` должен быть длинным случайным значением.
- Не используйте одинаковый secret между staging и production.
- При компрометации пароля пересоздайте hash и session secret.
