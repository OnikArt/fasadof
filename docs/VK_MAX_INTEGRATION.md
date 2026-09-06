# VK and MAX integration

All tokens are server-only. Never add real values to Git, client-side variables, README files or `.env.example`.

## MAX

Set in the VPS `.env`:

```dotenv
MAX_BOT_TOKEN=
MAX_MANAGER_CHAT_ID=
```

Add the bot to the manager chat. To discover a chat ID, use MAX Webhook or the temporary `GET /updates` development method and read `chat_id` from an update such as `bot_added` or `bot_started`. Production bots should use Webhook rather than long polling.

Open `Админка -> Настройки -> MAX` and press `Отправить тестовое сообщение`. The target must receive:

```text
✅ Связь с сайтом ФасадоФ установлена.
```

Every successfully stored website lead is then sent to that chat. A MAX timeout or API error is logged but does not roll back or reject the saved lead. Website chat messages and manager requests also generate MAX notifications.

## VK Callback API

Set in the VPS `.env`:

```dotenv
VK_GROUP_ID=
VK_ACCESS_TOKEN=
VK_CALLBACK_SECRET=
VK_CALLBACK_CONFIRMATION=
```

Use the numeric community ID without a leading minus. The token must have access to the community market and user lookup required by `market.get` and `users.get`.

In community management, add this Callback API server:

```text
https://fasadof36.ru/api/integrations/vk/callback
```

Copy VK's confirmation string to `VK_CALLBACK_CONFIRMATION`, create a strong random secret in VK and copy the same value to `VK_CALLBACK_SECRET`. Restart the service, then confirm the server in VK.

Enable only the business events used by the application:

- incoming messages (`message_new`);
- new wall, photo, video and market comments;
- VK Market order creation and edits (`market_order_new`, `market_order_edit`);
- lead form submissions (`lead_forms_new`) when Lead Ads forms are used.

The endpoint verifies `group_id` and `secret`, returns the confirmation string for `confirmation`, returns `ok` for accepted callbacks and deduplicates VK's `event_id`. If MAX delivery fails, the endpoint returns a temporary error so VK can retry instead of silently losing the event.

## Product synchronization

Open `Админка -> Товары` and press `Синхронизировать с VK`.

The preview is read-only and uses this matching order:

1. saved `vkOwnerId + vkMarketItemId`;
2. exact normalized title;
3. high title similarity, requiring administrator confirmation;
4. otherwise create a new site card.

Choose the price strategy before applying. `Сохранить цену сайта` is the default. It shows price differences without overwriting the site. `Принять цену VK` is an explicit opt-in update.

When applied, synchronization fills missing descriptions and galleries, preserves existing quality content, saves VK identifiers and downloads required VK photos to `/var/lib/fasadof/media/vk`. Site-only products are never deleted, hidden or changed. Repeated synchronization uses the saved VK identifiers and does not create duplicates.

MAX API reference: `POST https://platform-api2.max.ru/messages?chat_id=...` with `Authorization: <MAX_BOT_TOKEN>`.

VK API version used by the project: `5.199`.
