"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BUSINESS } from "@/config/business";
import { faq } from "@/data/faq";
import { formatPrice, popularProducts, productCategories, products, type Product, type ProductCategory } from "@/data/products";
import { analytics } from "@/features/analytics/analytics";
import { LeadForm } from "@/components/LeadForm";
import { SupportChat } from "@/components/SupportChat";

const materialTabs = [
  "ЭМАЛЬ",
  "ШПОН",
  "МАССИВ",
  "FENIX",
  "КАМЕНЬ",
  "ПЭТ",
  "BETON",
] as const;

const materialByTab: Record<(typeof materialTabs)[number], Product> = {
  ЭМАЛЬ: products.find((product) => product.slug === "enamel") ?? products[0],
  ШПОН: products.find((product) => product.slug === "natural-veneer") ?? products[0],
  МАССИВ: products.find((product) => product.slug === "solid-wood") ?? products[0],
  FENIX: products.find((product) => product.slug === "fenix-egger") ?? products[0],
  КАМЕНЬ: products.find((product) => product.slug === "stone-veneer") ?? products[0],
  ПЭТ: products.find((product) => product.slug === "pet") ?? products[0],
  BETON: products.find((product) => product.slug === "art-beton") ?? products[0],
};

function ProductVisual({ product, large = false }: { product: Product; large?: boolean }) {
  return (
    <div className={large ? `product-visual large ${product.texture}` : `product-visual ${product.texture}`} aria-label={product.name}>
      <span>{product.shortName ?? product.material}</span>
    </div>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <article className={index % 3 === 1 ? "product-card tall" : "product-card"}>
      <a href={`/catalog/${product.slug}`} onClick={() => analytics.track("product_view", { slug: product.slug })}>
        <ProductVisual product={product} />
        <div className="product-copy">
          <span>{productCategories[product.category]} / {product.material}</span>
          <h3>{product.name}</h3>
          <strong>{formatPrice(product)}</strong>
          <p>{product.description}</p>
          <em>Открыть материал</em>
        </div>
      </a>
    </article>
  );
}

export function HomeExperience() {
  const [activeMaterial, setActiveMaterial] = useState<(typeof materialTabs)[number]>("ЭМАЛЬ");
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const activeProduct = materialByTab[activeMaterial];
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

  useEffect(() => {
    analytics.track("page_view", { page: "/" });
  }, []);

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top">ФасадоФ</a>
        <button className="menu-button" type="button" onClick={() => setMenuOpen((current) => !current)}>
          {menuOpen ? "Закрыть" : "Меню"}
        </button>
        <nav className={menuOpen ? "open" : ""} aria-label="Основная навигация">
          <a href="#materials">Материалы</a>
          <a href="#catalog" onClick={() => analytics.track("catalog_open")}>Каталог</a>
          <a href="#order">Расчёт</a>
          <a href="#contacts">Контакты</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero section" aria-labelledby="hero-title">
          <div className="hero-word" aria-hidden="true">ФАСАДОФ</div>
          <div className="hero-asset">
            <Image
              src="/og.png"
              alt="Композиция из фасадных материалов ФасадоФ"
              width={1792}
              height={1024}
              priority
              sizes="(max-width: 720px) 100vw, 86vw"
            />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">Bold Editorial Furniture Brand</p>
            <h1 id="hero-title">Фасады,<br />которые хочется трогать.</h1>
            <p>
              Производим мебельные фасады, столешницы и индивидуальные решения из эмали, шпона, массива, ПЭТ, Fenix, камня и ART Beton.
            </p>
            <div className="hero-actions">
              <a className="btn primary" href="#order" onClick={() => analytics.track("cta_click", { place: "hero", action: "lead" })}>Рассчитать фасады</a>
              <a className="btn secondary" href="#materials" onClick={() => analytics.track("cta_click", { place: "hero", action: "materials" })}>Смотреть материалы</a>
            </div>
          </div>
          <div className="hero-facts" aria-label="Условия">
            <strong>БЕСПЛАТНАЯ ДОСТАВКА</strong>
            <span>ПН-ПТ<br />09:00-18:00</span>
          </div>
        </section>

        <section className="statement section">
          <div>
            <span>Материал.</span>
            <span>Цвет.</span>
            <span>Характер.</span>
          </div>
          <p>
            Фасад перестал быть фоном. Он держит интерьер, собирает свет, задаёт тактильность и делает мебель проектной.
          </p>
        </section>

        <section className="popular section" aria-labelledby="popular-title">
          <div className="section-head">
            <p className="eyebrow">Популярные материалы</p>
            <h2 id="popular-title">Не карточки. Образцы решений.</h2>
          </div>
          <div className="popular-strip">
            {popularProducts.slice(0, 6).map((product) => (
              <a className="popular-chip" href={`/catalog/${product.slug}`} key={product.id}>
                <ProductVisual product={product} />
                <span>{product.shortName ?? product.name}</span>
                <strong>{formatPrice(product)}</strong>
              </a>
            ))}
          </div>
        </section>

        <section className="material-explorer section" id="materials" aria-labelledby="materials-title">
          <div className="section-head">
            <p className="eyebrow">Material explorer</p>
            <h2 id="materials-title">Выберите поверхность.</h2>
          </div>
          <div className="material-layout">
            <div className="material-tabs" role="tablist" aria-label="Материалы">
              {materialTabs.map((material) => (
                <button
                  aria-selected={activeMaterial === material}
                  className={activeMaterial === material ? "active" : ""}
                  key={material}
                  onClick={() => setActiveMaterial(material)}
                  onMouseEnter={() => setActiveMaterial(material)}
                  role="tab"
                  type="button"
                >
                  {material}
                </button>
              ))}
            </div>
            <div className="material-panel">
              <ProductVisual product={activeProduct} large />
              <div>
                <span>{activeProduct.material}</span>
                <h3>{activeProduct.name}</h3>
                <p>{activeProduct.description}</p>
                <strong>{formatPrice(activeProduct)}</strong>
                <a className="btn secondary" href={`/catalog/${activeProduct.slug}`}>Смотреть подробнее</a>
              </div>
            </div>
          </div>
        </section>

        <section className="catalog section" id="catalog" aria-labelledby="catalog-title">
          <div className="section-head">
            <p className="eyebrow">Catalogue</p>
            <h2 id="catalog-title">Каталог материалов и столешниц</h2>
          </div>
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
            <div className="product-grid">
              {filteredProducts.map((product, index) => (
                <ProductCard product={product} index={index} key={product.id} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Такого материала не нашлось.</strong>
              <p>Попробуйте убрать фильтр или отправьте задачу на индивидуальный расчёт.</p>
            </div>
          )}
        </section>

        <section className="why section">
          <article>
            <span>Материалы</span>
            <h2>Которые видно и хочется трогать.</h2>
          </article>
          <article>
            <span>Производство</span>
            <h2>Под конкретный проект.</h2>
          </article>
          <article>
            <span>Доставка</span>
            <h2>Бесплатно.</h2>
          </article>
        </section>

        <section className="delivery section">
          <span>ДОСТАВКА -</span>
          <strong>БЕСПЛАТНО.</strong>
        </section>

        <section className="projects section" aria-labelledby="projects-title">
          <div className="section-head">
            <p className="eyebrow">Inspiration</p>
            <h2 id="projects-title">Фасад как архитектура мебели</h2>
          </div>
          <div className="project-grid">
            <article><span>01</span><p>Матовая эмаль для ровной цветовой плоскости.</p></article>
            <article><span>02</span><p>Шпон и массив для тёплой натуральной фактуры.</p></article>
            <article><span>03</span><p>Камень и бетон для акцентной мебельной стены.</p></article>
          </div>
        </section>

        <section className="process section" aria-labelledby="process-title">
          <div className="section-head">
            <p className="eyebrow">Как заказать</p>
            <h2 id="process-title">Расчёт без лишних полей.</h2>
          </div>
          <ol>
            <li><span>01</span>Выберите материал или напишите «не знаю».</li>
            <li><span>02</span>Укажите примерную площадь или задачу.</li>
            <li><span>03</span>Оставьте контакты для уточнения расчёта.</li>
            <li><span>04</span>Менеджер связывается в рабочее время: {BUSINESS.workingHours}.</li>
          </ol>
        </section>

        <section className="order section" id="order" aria-labelledby="order-title">
          <div>
            <p className="eyebrow">Calculator / request</p>
            <h2 id="order-title">Рассчитать фасады</h2>
            <p>Форма передаёт UTM, first-touch, last-touch и страницу заявки. Backend API уже подготовлен для подключения CRM, базы и MAX.</p>
          </div>
          <LeadForm />
        </section>

        <section className="faq section" aria-labelledby="faq-title">
          <div className="section-head">
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-title">Коротко по делу</h2>
          </div>
          <div className="faq-list">
            {faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="contacts section" id="contacts" aria-labelledby="contacts-title">
          <div>
            <p className="eyebrow">Contacts</p>
            <h2 id="contacts-title">Контакты</h2>
            <p>Телефон, email, адрес и социальные ссылки вынесены в config и ждут реальные данные владельца бизнеса.</p>
          </div>
          <div className="contact-board">
            <strong>{BUSINESS.freeDelivery}</strong>
            <span>{BUSINESS.workingHours}</span>
            <p>Телефон: требуется настроить</p>
            <p>Email: требуется настроить</p>
            <p>Адрес: требуется настроить</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>ФасадоФ</span>
        <a href="/privacy">Политика и согласие</a>
        <a href="/admin/support">Support admin</a>
      </footer>

      <SupportChat />
    </>
  );
}
