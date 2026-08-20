# Content management

## Products and prices

Edit `data/products.ts`. All catalogue cards, product pages, material explorer and AI knowledge base read from this file.

Do not add invented prices. Use `priceOnRequest: true` when the price needs individual calculation.

## Contacts

Edit `config/business.ts`:

- `phone`
- `email`
- `address`
- `socials.vk`
- `socials.instagram`
- `socials.max`

## Working hours and delivery

Also in `config/business.ts`:

- `workingHours`
- `freeDelivery`

Current confirmed text is `Бесплатная доставка` and `ПН-ПТ 09:00-18:00`.

## FAQ

Edit `data/faq.ts`.

## Images

The current hero/OpenGraph image is `public/og.png`. Replace with optimized WebP/AVIF variants when final brand photography is available.
