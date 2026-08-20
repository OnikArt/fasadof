# SEO

## Metadata

Global metadata lives in `app/layout.tsx`.

Product and category metadata is generated in `app/catalog/[slug]/page.tsx`.

## Indexable pages

Core:

- `/`;
- `/catalog`;
- `/privacy`.

Category SEO pages:

- `/catalog/emal`;
- `/catalog/shpon`;
- `/catalog/massiv`;
- `/catalog/pvh`;
- `/catalog/fenix`;
- `/catalog/stoleshnitsy`.

Product pages remain on catalogue slugs such as `/catalog/enamel` and `/catalog/stone-veneer`.

## Sitemap and robots

Static files:

- `public/sitemap.xml`;
- `public/robots.txt`.

Update them when the final custom domain changes.

## Structured data

Implemented:

- `Organization` in layout;
- `Product` on product pages;
- `BreadcrumbList` on product/category pages.

Do not add fake reviews, ratings, dates, geography or production numbers.

## Content rules

Use human-first copy:

- explain material scenarios;
- keep price data from `data/products.ts`;
- avoid keyword stuffing;
- avoid claims that are not in source data.
