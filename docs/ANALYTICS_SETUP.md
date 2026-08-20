# Analytics setup

## Attribution

`features/attribution/attribution.ts` сохраняет:

- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_content`;
- `utm_term`;
- `landing_page`;
- `referrer`;
- `first_touch`;
- `last_touch`.

Attribution передаётся в:

- заявки `/api/leads`;
- чат `/api/chat`;
- события `lead_submit`, `chat_message`, `operator_requested`.

## UTM examples

```text
VK:        ?utm_source=vk&utm_medium=social&utm_campaign=facades
Instagram: ?utm_source=instagram&utm_medium=social&utm_campaign=showroom
MAX:       ?utm_source=max&utm_medium=messenger&utm_campaign=delivery
Yandex:    ?utm_source=yandex&utm_medium=cpc&utm_campaign=emal
Google:    ?utm_source=google&utm_medium=cpc&utm_campaign=countertops
```

## Events

Центральный слой: `features/analytics/analytics.ts`.

Основные события:

- `page_view`;
- `cta_click`;
- `catalog_open`;
- `product_view`;
- `lead_start`;
- `lead_submit`;
- `chat_open`;
- `chat_message`;
- `operator_requested`;
- `phone_click`;
- `max_click`.

## Yandex Metrika

```env
NEXT_PUBLIC_YANDEX_METRIKA_ID=
```

После добавления счетчика abstraction отправляет reachGoal через `window.ym`, если скрипт Метрики загружен.

## VK Pixel

```env
NEXT_PUBLIC_VK_PIXEL_ID=
```

Скрипт пикселя можно подключить через layout или tag manager.
