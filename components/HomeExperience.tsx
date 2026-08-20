"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { HeroObject, ProductObject } from "@/components/ProductObject";
import { SiteHeader } from "@/components/SiteHeader";
import { SupportChat } from "@/components/SupportChat";
import { LeadForm } from "@/components/LeadForm";
import { BUSINESS } from "@/config/business";
import { faq } from "@/data/faq";
import { formatPrice, products, type Product } from "@/data/products";
import { analytics } from "@/features/analytics/analytics";

const materialTabs = ["Эмаль", "Шпон", "Массив", "ПЭТ", "Fenix", "ПВХ", "Камень", "Столешницы"] as const;

const materialSlugByTab: Record<(typeof materialTabs)[number], string> = {
  Эмаль: "enamel",
  Шпон: "natural-veneer",
  Массив: "solid-wood",
  ПЭТ: "pet",
  Fenix: "fenix-egger",
  ПВХ: "mdf-pvc",
  Камень: "stone-veneer",
  Столешницы: "compact-plates",
};

const mainMaterials = ["enamel", "natural-veneer", "solid-wood", "pet", "fenix-egger", "mdf-pvc"];
const featuredCollection = ["stone-veneer", "art-beton", "compact-plates"];
const catalogPreview = ["lmdf-moonlite", "aluminum-glass", "eva-dsp"];

function pickProducts(slugs: string[]) {
  return slugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product));
}

export function HomeExperience() {
  const [activeMaterial, setActiveMaterial] = useState<(typeof materialTabs)[number]>("Эмаль");
  const activeProduct = products.find((product) => product.slug === materialSlugByTab[activeMaterial]) ?? products[0];
  const mainMaterialProducts = useMemo(() => pickProducts(mainMaterials), []);
  const featuredProducts = useMemo(() => pickProducts(featuredCollection), []);
  const previewProducts = useMemo(() => pickProducts(catalogPreview), []);

  useEffect(() => {
    analytics.track("page_view", { page: "/" });
  }, []);

  return (
    <>
      <SiteHeader />
      <main id="top">
        <section className="hero-section">
          <div className="page-shell hero-grid">
            <div className="hero-brand" aria-hidden="true">ФАСАДОФ</div>
            <div className="hero-visual">
              <HeroObject />
            </div>
            <div className="hero-copy">
              <p className="eyebrow">Мебельные фасады и столешницы</p>
              <h1>Материалы, которые собирают интерьер вокруг себя.</h1>
              <p>Эмаль, шпон, массив, ПЭТ, Fenix, ПВХ, камень и столешницы для мебели на заказ.</p>
              <div className="hero-actions">
                <a className="btn primary" href="#order" onClick={() => analytics.track("cta_click", { place: "hero", action: "lead" })}>
                  Рассчитать проект
                </a>
                <Link className="btn ghost" href="/catalog" onClick={() => analytics.track("catalog_open")}>Открыть каталог</Link>
              </div>
            </div>
            <div className="hero-facts" aria-label="Условия">
              <span>{BUSINESS.freeDelivery}</span>
              <span>{BUSINESS.workingHoursShort}</span>
            </div>
          </div>
        </section>

        <section className="section category-section" aria-labelledby="category-title">
          <div className="section-grid">
            <div className="section-kicker">01 / Категории</div>
            <div className="section-heading">
              <h2 id="category-title">Сразу понятно, что можно заказать.</h2>
              <p>Категории ведут в каталог и работают как витрина материалов, а не как текстовый список ссылок.</p>
            </div>
          </div>
          <div className="category-grid">
            {materialTabs.map((material) => {
              const product = products.find((item) => item.slug === materialSlugByTab[material]) ?? products[0];
              return (
                <Link className="category-card" href={`/catalog/${product.slug}`} key={material}>
                  <ProductObject product={product} size="compact" />
                  <span>{material}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="section" id="materials" aria-labelledby="materials-title">
          <div className="section-grid">
            <div className="section-kicker">02 / Материалы</div>
            <div className="section-heading">
              <h2 id="materials-title">Основные фасадные решения</h2>
              <p>На главной только ключевые материалы. Полный ассортимент и цены остаются в каталоге.</p>
            </div>
            <Link className="section-link" href="/catalog">Весь каталог</Link>
          </div>
          <div className="product-grid">
            {mainMaterialProducts.map((product, index) => (
              <ProductCard
                featured={index === 0}
                key={product.id}
                product={product}
                onClick={() => analytics.track("product_view", { slug: product.slug })}
              />
            ))}
          </div>
        </section>

        <section className="section featured-section" aria-labelledby="featured-title">
          <div className="section-grid">
            <div className="section-kicker">03 / Featured</div>
            <div className="section-heading">
              <h2 id="featured-title">Глубина, камень, архитектурная плоскость.</h2>
              <p>Более выразительные материалы вынесены в тёмную showroom-сцену.</p>
            </div>
          </div>
          <div className="featured-grid">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onClick={() => analytics.track("product_view", { slug: product.slug })} />
            ))}
          </div>
        </section>

        <section className="section explorer-section" aria-labelledby="explorer-title">
          <div className="section-grid">
            <div className="section-kicker">04 / Explorer</div>
            <div className="section-heading">
              <h2 id="explorer-title">Материал крупно, без шума.</h2>
              <p>Выбор меняет центральный объект, цену и описание. Это быстрый путь к первому решению.</p>
            </div>
          </div>
          <div className="material-explorer">
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
            <div className="explorer-visual">
              <ProductObject product={activeProduct} size="large" variant="stack" />
            </div>
            <div className="explorer-copy">
              <p className="eyebrow">{activeProduct.material}</p>
              <h3>{activeProduct.name}</h3>
              <p>{activeProduct.description}</p>
              <strong>{formatPrice(activeProduct)}</strong>
              <Link className="btn secondary" href={`/catalog/${activeProduct.slug}`}>Подробнее</Link>
            </div>
          </div>
        </section>

        <section className="section production-section" id="production" aria-labelledby="production-title">
          <div className="section-grid">
            <div className="section-kicker">05 / Производство</div>
            <div className="section-heading">
              <h2 id="production-title">Производственная логика без выдуманных цифр.</h2>
              <p>Показываем только то, что уже есть в данных и услугах: фасады, столешницы, подбор материала, расчёт и индивидуальные решения.</p>
            </div>
          </div>
          <div className="capability-grid">
            {["Изготовление фасадов", "Подбор материала", "Расчет", "Индивидуальные решения", "Столешницы", "Доставка"].map((item, index) => (
              <article className="capability-card" key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section inspiration-section" aria-labelledby="inspiration-title">
          <div className="section-grid">
            <div className="section-kicker">06 / Проекты</div>
            <div className="section-heading">
              <h2 id="inspiration-title">Фасад как предмет в комнате.</h2>
              <p>Временная визуальная система показывает сценарии: тёплая древесина, тёмная плоскость, каменный edge, стеклянный модуль.</p>
            </div>
          </div>
          <div className="inspiration-grid">
            <article className="inspiration-card large">
              <ProductObject product={products.find((product) => product.slug === "natural-veneer") ?? products[0]} size="large" />
              <span>Шпон в спокойной кухне</span>
            </article>
            <article className="inspiration-card">
              <ProductObject product={products.find((product) => product.slug === "fenix-egger") ?? products[0]} />
              <span>Тёмный Fenix</span>
            </article>
            <article className="inspiration-card">
              <ProductObject product={products.find((product) => product.slug === "aluminum-glass") ?? products[0]} />
              <span>Стекло и профиль</span>
            </article>
          </div>
        </section>

        <section className="section catalog-preview" aria-labelledby="catalog-preview-title">
          <div className="section-grid">
            <div className="section-kicker">07 / Каталог</div>
            <div className="section-heading">
              <h2 id="catalog-preview-title">Ещё несколько материалов</h2>
              <p>Остальное не перегружает главную и доступно на отдельной странице каталога.</p>
            </div>
            <Link className="section-link" href="/catalog">Перейти в каталог</Link>
          </div>
          <div className="product-grid compact">
            {previewProducts.map((product) => (
              <ProductCard key={product.id} product={product} onClick={() => analytics.track("product_view", { slug: product.slug })} />
            ))}
          </div>
        </section>

        <section className="delivery-section" id="delivery">
          <div className="page-shell">
            <span>Доставка —</span>
            <strong>бесплатно.</strong>
          </div>
        </section>

        <section className="section order-section" id="order" aria-labelledby="order-title">
          <div className="section-grid">
            <div className="section-kicker">08 / Расчет</div>
            <div className="section-heading">
              <h2 id="order-title">Короткая заявка без лишних полей.</h2>
              <p>Форма передаёт UTM, first-touch, last-touch, страницу обращения и выбранный материал.</p>
            </div>
          </div>
          <LeadForm />
        </section>

        <section className="section faq-section" aria-labelledby="faq-title">
          <div className="section-grid">
            <div className="section-kicker">09 / FAQ</div>
            <div className="section-heading">
              <h2 id="faq-title">Короткие ответы</h2>
            </div>
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

        <section className="section contacts-section" id="contacts" aria-labelledby="contacts-title">
          <div className="contact-grid">
            <article className="contact-panel">
              <p className="eyebrow">Контакты</p>
              <h2 id="contacts-title">Связаться с ФасадоФ</h2>
              <p>Телефон, email и адрес нужно заменить на финальные данные владельца бизнеса.</p>
            </article>
            <article className="contact-panel pink">
              <strong>{BUSINESS.freeDelivery}</strong>
              <span>{BUSINESS.workingHoursShort}</span>
              <p>Менеджеры отвечают в рабочее время. AI-помощник доступен онлайн.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-grid">
          <span>ФАСАДОФ</span>
          <Link href="/privacy">Политика и согласие</Link>
          <Link href="/admin/login">Вход менеджера</Link>
          <Link href="/admin/support">Support admin</Link>
        </div>
      </footer>

      <SupportChat />
    </>
  );
}
