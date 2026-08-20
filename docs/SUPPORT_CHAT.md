# Support chat

Состояния диалога:

```text
AI → WAITING_OPERATOR → OPERATOR → CLOSED
```

## Клиент

1. Клиент открывает виджет.
2. Первое сообщение создаёт conversation и сохраняет `sessionId/customerToken` в localStorage.
3. Пока статус `AI`, отвечает AI provider.
4. Кнопка `Позвать менеджера` переводит conversation в `WAITING_OPERATOR`.
5. После этого AI больше не отвечает в этом диалоге.
6. Виджет получает новые сообщения через controlled polling.

## Менеджер

1. Войти на `/admin/login`.
2. Открыть `/admin/support`.
3. Найти диалог во вкладке `Ждут менеджера`.
4. Нажать `Взять диалог`.
5. Ответить клиенту.
6. Закрыть диалог после завершения.

Клиент видит ответы менеджера в том же виджете.

## Рабочее время

Менеджеры: `ПН–ПТ 09:00–18:00`.

AI может отвечать онлайн, пока клиент не запросил human takeover.

## Storage

Production storage — D1 `DB`. Local preview использует memory fallback, чтобы разработка не падала без binding.
