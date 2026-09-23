# Support chat

## Public chat

The production widget is owned by the project and uses `/api/chat`. Conversations and messages are stored in the same persistent database as the admin panel. No Chat2Desk scripts, tokens or sockets are used.

The automatic responder uses only the local product knowledge base and does not call an external AI provider.

## Manager online status

`/admin/support` sends a heartbeat to `/api/admin/session` every 20 seconds. A manager is considered online while the latest heartbeat is within the server TTL. The customer widget receives `managerOnline` during chat polling.

## "Позвать менеджера"

When the customer requests a manager, the conversation status becomes `WAITING_MANAGER`. The local automatic responder pauses while the request is fresh.

## Waiting operator

The user can keep writing. Messages are saved in the same conversation and shown in the admin queue.

## Local fallback

If no manager replies before `MANAGER_WAIT_TIMEOUT_MS` (default 5 minutes), the server changes the conversation back to `NEW` and appends a system message. No external AI service is used.

## Manager takeover

In `/admin/support`, the manager clicks `Взять диалог`. The status becomes `IN_PROGRESS`; the automatic responder stays silent while the manager owns the dialog. Administrators can clear, archive or delete a dialog and manage command responses without changing code.

## Close conversation

The manager can close the conversation. Closed dialogs stay readable but the customer composer is disabled.

## Working hours

Working hours are displayed from `config/business.ts`: `ПН-ПТ 09:00-17:00`. Presence is not faked from working hours; it is based on heartbeat.

## Presence

Presence is persisted through operator `updated_at` on the VPS database. An active operator dialog is shown as busy; a recent heartbeat without an active dialog is online; otherwise the employee is offline.

## Timeout

Set `MANAGER_WAIT_TIMEOUT_MS` in backend env if the default 5-minute wait is too short or too long.
