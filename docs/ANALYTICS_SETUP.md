# Analytics setup

## Attribution

`features/attribution/attribution.ts` captures first-touch and last-touch data:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `referrer`
- `landing_page`

Example:

```text
?utm_source=vk&utm_medium=social&utm_campaign=facades
```

## Events

The analytics layer is centralized in `features/analytics/analytics.ts`.

Events:

- `page_view`
- `cta_click`
- `catalog_open`
- `product_view`
- `lead_start`
- `lead_submit`
- `chat_open`
- `chat_message`
- `operator_requested`
- `phone_click`
- `max_click`

## Yandex Metrika

Set:

```env
NEXT_PUBLIC_YANDEX_METRIKA_ID=
```

Then add the actual Metrika script in the layout or tag manager. The existing abstraction will call `ym(counterId, "reachGoal", event, payload)` when `window.ym` exists.

## VK Pixel

Add VK pixel script through the layout or tag manager. The layer calls `window.VK.Retargeting.Event`.

## Social links

VK, Instagram and MAX links are stored in `config/business.ts`. Add UTM parameters to campaign links before publishing.
