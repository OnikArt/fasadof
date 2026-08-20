"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { productCategories, products, type ProductCategory } from "@/data/products";
import { analytics } from "@/features/analytics/analytics";

export function CatalogExperience() {
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const text = `${product.name} ${product.material} ${product.description}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <>
      <SiteHeader />
      <main className="catalog-page page-main">
        <section className="section catalog-intro">
          <div className="section-grid">
            <div className="section-kicker">Каталог</div>
            <div className="section-heading">
              <h1>Все материалы ФасадоФ</h1>
              <p>Фасады и столешницы с текущими ценами из источника данных. Фильтры оставлены только полезные: категория и поиск по материалу.</p>
            </div>
            <a className="section-link" href="/#order">Рассчитать проект</a>
          </div>
        </section>

        <section className="section catalog-list" aria-label="Каталог материалов">
          <div className="catalog-toolbar">
            <div className="filter-group" role="group" aria-label="Категория">
              <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")} type="button">
                Все
              </button>
              {(Object.keys(productCategories) as ProductCategory[]).map((item) => (
                <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)} type="button">
                  {productCategories[item]}
                </button>
              ))}
            </div>
            <label className="search-field">
              <span>Поиск</span>
              <input
                aria-label="Поиск по каталогу"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="эмаль, шпон, камень"
                value={query}
              />
            </label>
            <span className="product-count">{filteredProducts.length} позиций</span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="product-grid catalog-grid">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => analytics.track("product_view", { slug: product.slug })}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Такого материала не нашлось.</strong>
              <p>Уберите фильтр или отправьте задачу на индивидуальный расчет.</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
