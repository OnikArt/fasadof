# Content management

## Products and prices

Edit `data/products.ts`. Catalogue cards, product pages, material explorer and AI knowledge base read from this file.

Do not add invented prices. Use `priceOnRequest: true` when the price needs individual calculation.

## Business information

Edit `config/business.ts`:

- `phone.display`, `phone.formatted`, `phone.e164`, `phone.href`;
- `email` and `emailHref`;
- `address`;
- `workingHours`;
- `delivery`;
- `socials.vk`;
- `socials.max`.
- `socials.yandexMaps`.

Current confirmed data:

- phone: `8 903 850-24-04`;
- email: `fasadof36@gmail.com`;
- address: `г. Воронеж, ул. Машиностроителей, д. 3`;
- working hours: `ПН-ПТ 09:00-17:00`, `СБ-ВС выходной`;
- delivery: `Бесплатная доставка по Воронежу`.

Do not write that delivery is free outside Voronezh.

## FAQ

Edit `data/faq.ts`.

## Images

The current hero/OpenGraph image is `public/og.png`. Replace with optimized WebP/AVIF variants when final brand photography is available.
