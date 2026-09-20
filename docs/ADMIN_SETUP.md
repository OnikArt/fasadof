# Admin setup

Админка ФасадоФ находится по адресу `/admin/login`. `/admin/support` защищён server-side проверкой HttpOnly cookie.

## Login

Создайте данные первого менеджера:

```bash
npm run admin:create -- manager@example.com "very-strong-password" "Алексей"
```

Скрипт выведет `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`. Добавьте их в production secrets.

## Manager creation

Текущая production-схема поддерживает одного менеджера через env. Для нескольких операторов используйте таблицу `operators` и отдельный UI создания аккаунтов.

## Online/offline

Менеджер считается online только после входа и открытой страницы `/admin/support`. Если вкладка закрыта и heartbeat прекратился, статус станет offline после TTL.

## Heartbeat

`SupportAdmin` вызывает `POST /api/admin/session` каждые 20 секунд. Endpoint обновляет presence и подтверждает валидность cookie.

## Support queue

Диалоги имеют статусы `AUTO`, `WAITING_OPERATOR`, `OPERATOR`, `CLOSED`. Очередь `/admin/support` позволяет фильтровать статусы, брать диалог, отвечать и закрывать.

## Replies

Если менеджер отвечает в диалоге, сервер автоматически переводит разговор в `OPERATOR` и сохраняет сообщение как `operator`.

## Logout

Кнопка `Выйти` вызывает `/api/admin/logout`, очищает `fasadof_manager_session` и возвращает на `/admin/login`.

## Security

Пароль хранится только как PBKDF2 hash. Cookie `HttpOnly`, `SameSite=Lax`, `Secure` на HTTPS. Не храните реальные пароли и secrets в репозитории.
