"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ObjectVisual } from "@/components/HomeExperience";
import { formatPrice, productCategories, products, type ProductCategory } from "@/data/products";
import { analytics } from "@/features/analytics/analytics";

export function CatalogExperience() {
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState("all");

  const filteredProducts = useMemo(() => {
    const priceLimit = maxPrice === "all" ? Number.POSITIVE_INFINITY : Number(maxPrice);
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const text = `${product.name} ${product.material} ${product.description}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      const price = product.priceFrom ?? Number.POSITIVE_INFINITY;
      const matchesPrice = product.priceOnRequest || price <= priceLimit;
      return matchesCategory && matchesQuery && matchesPrice;
    });
  }, [category, maxPrice, query]);

  return (
    <main className="catalog-page">
      <header className="catalog-hero section">
        <Link className="back-link" href="/">На главную</Link>
        <p className="eyebrow">Full catalogue</p>
        <h1>Все материалы ФасадоФ</h1>
        <p>Полный каталог фасадов и столешниц. Крупные карточки, реальные цены из текущего источника данных и индивидуальный расчёт там, где цена не задана.</p>
      </header>

      <section className="catalog-list section" aria-label="Каталог материалов">
        <div className="filters" aria-label="Фильтры каталога">
          <input
            aria-label="Поиск по каталогу"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск: эмаль, шпон, камень"
            value={query}
          />
          <select aria-label="Категория" onChange={(event) => setCategory(event.target.value as "all" | ProductCategory)} value={category}>
            <option value="all">Все категории</option>
            <option value="facades">Фасады</option>
            <option value="countertops">Столешницы</option>
          </select>
          <select aria-label="Цена" onChange={(event) => setMaxPrice(event.target.value)} value={maxPrice}>
            <option value="all">Любая цена</option>
            <option value="6000">до 6 000 ₽</option>
            <option value="10000">до 10 000 ₽</option>
            <option value="15000">до 15 000 ₽</option>
          </select>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="catalog-grid">
            {filteredProducts.map((product) => (
              <article className="showroom-card catalog-card" key={product.id}>
                <Link href={`/catalog/${product.slug}`} onClick={() => analytics.track("product_view", { slug: product.slug })}>
                  <ObjectVisual product={product} />
                  <div className="showroom-card-copy">
                    <span>{productCategories[product.category]} / {product.material}</span>
                    <h3>{product.name}</h3>
                    <strong>{formatPrice(product)} <span aria-hidden="true">→</span></strong>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Такого материала не нашлось.</strong>
            <p>Попробуйте убрать фильтр или отправьте задачу на индивидуальный расчёт.</p>
          </div>
        )}
      </section>
    </main>
  );
}
