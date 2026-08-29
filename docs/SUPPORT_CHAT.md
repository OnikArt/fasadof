# Support chat

## AI

The browser talks only to `/api/chat`. The server chooses the provider through `AI_PROVIDER`; production default is GigaChat. Secrets never go to the frontend.

## Manager online status

`/admin/support` sends a heartbeat to `/api/admin/session` every 20 seconds. A manager is considered online while the latest heartbeat is within the server TTL. The customer widget receives `managerOnline` during chat polling.

## "Позвать менеджера"

When the customer clicks `Позвать менеджера`, the conversation status becomes `WAITING_OPERATOR`. AI pauses while the request is fresh.

## Waiting operator

The user can keep writing. Messages are saved in the same conversation and shown in the admin queue.

## AI fallback

If no manager replies before `MANAGER_WAIT_TIMEOUT_MS` (default 5 minutes), the server changes the conversation back to `AI` and appends a system message: AI is available again. No page reload is required.

## Manager takeover

In `/admin/support`, the manager clicks `Взять диалог`. The status becomes `OPERATOR`; AI stays silent while the manager owns the dialog.

## Close conversation

The manager can close the conversation. Closed dialogs stay readable but the customer composer is disabled.

## Working hours

Working hours are displayed from `config/business.ts`: `ПН-ПТ 09:00-18:00`. Presence is not faked from working hours; it is based on heartbeat.

## Presence

Presence works in local memory during preview and uses D1/operator `updated_at` in production when the `DB` binding exists.

## Timeout

Set `MANAGER_WAIT_TIMEOUT_MS` in backend env if the default 5-minute wait is too short or too long.
