# SEO

## Metadata

Global metadata lives in `app/layout.tsx`. Home metadata is in `app/page.tsx`. Product metadata is generated in `app/catalog/[slug]/page.tsx`.

## Sitemap and robots

Static files:

- `public/sitemap.xml`
- `public/robots.txt`

Update the domain before launch if needed.

## Structured data

Implemented:

- `Organization` in layout
- `Product` on product pages

Do not add fake reviews or ratings.

## Product SEO

Product pages use:

- readable URLs
- unique titles
- descriptions from catalogue data
- product structured data

Keep product descriptions natural and avoid keyword spam.
