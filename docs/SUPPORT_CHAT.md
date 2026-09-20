# Support chat

## Public chat

The production customer widget is Chat2Desk. Its public widget token remains client-side, while VK, MAX and admin secrets stay server-side.

The legacy `/api/chat` support flow uses only the local product knowledge base and does not call an external AI provider.

## Manager online status

`/admin/support` sends a heartbeat to `/api/admin/session` every 20 seconds. A manager is considered online while the latest heartbeat is within the server TTL. The customer widget receives `managerOnline` during chat polling.

## "Позвать менеджера"

When the customer requests a manager, the conversation status becomes `WAITING_OPERATOR`. The local automatic responder pauses while the request is fresh.

## Waiting operator

The user can keep writing. Messages are saved in the same conversation and shown in the admin queue.

## Local fallback

If no manager replies before `MANAGER_WAIT_TIMEOUT_MS` (default 5 minutes), the server changes the conversation back to `AUTO` and appends a system message. No external AI service is used.

## Manager takeover

In `/admin/support`, the manager clicks `Взять диалог`. The status becomes `OPERATOR`; the automatic responder stays silent while the manager owns the dialog.

## Close conversation

The manager can close the conversation. Closed dialogs stay readable but the customer composer is disabled.

## Working hours

Working hours are displayed from `config/business.ts`: `ПН-ПТ 09:00-18:00`. Presence is not faked from working hours; it is based on heartbeat.

## Presence

Presence works in local memory during preview and uses D1/operator `updated_at` in production when the `DB` binding exists.

## Timeout

Set `MANAGER_WAIT_TIMEOUT_MS` in backend env if the default 5-minute wait is too short or too long.
