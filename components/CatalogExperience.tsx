"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { productCategories, type Product, type ProductCategory } from "@/data/products";
import { analytics } from "@/features/analytics/analytics";

export function CatalogExperience({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc">("default");

  const filteredProducts = useMemo(() => {
    const result = products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const text = `${product.name} ${product.material} ${product.description}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
    if (sort !== "default") result.sort((a, b) => sort === "price-asc" ? (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity) : (b.priceFrom ?? -Infinity) - (a.priceFrom ?? -Infinity));
    return result;
  }, [category, products, query, sort]);

  return (
    <>
      <SiteHeader />
      <main className="catalog-page page-main">
        <section className="section catalog-intro"><div className="catalog-intro-content"><nav className="breadcrumbs" aria-label="Хлебные крошки"><a href="/">Главная</a><span>/</span><span>Каталог</span></nav><h1>Каталог фасадов<br /><span>и столешниц</span></h1><p>Подберите материал, фактуру и цвет для вашего проекта. Изготовление по индивидуальным размерам.</p><div className="catalog-highlights"><span>◇ Премиальные материалы</span><span>⊞ Большой выбор цветов и фактур</span><span>▣ Изготовление по вашим размерам</span><span>♙ Консультация и подбор решения</span></div></div></section>

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
            <button className="catalog-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="catalog-extra-filters" onClick={() => setFiltersOpen((value) => !value)}>Фильтры</button>
            <span className="product-count">{filteredProducts.length} позиций</span>
          </div>
          {filtersOpen && <div className="catalog-extra-filters" id="catalog-extra-filters"><label>Сортировать по цене <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="default">По умолчанию</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option></select></label><button type="button" onClick={() => { setCategory("all"); setQuery(""); setSort("default"); }}>Сбросить фильтры</button></div>}

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
