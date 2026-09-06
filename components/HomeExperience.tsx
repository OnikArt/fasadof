"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ProductCard } from "@/components/ProductCard";
import { HeroObject, ProductObject } from "@/components/ProductObject";
import { SectionHeader } from "@/components/SectionHeader";
import { SiteHeader } from "@/components/SiteHeader";
import { LeadForm } from "@/components/LeadForm";
import { BUSINESS } from "@/config/business";
import { faq } from "@/data/faq";
import { formatPrice, products as seedProducts, type Product } from "@/data/products";
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

function pickProducts(products: Product[], slugs: string[]) {
  return slugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product));
}

export function HomeExperience({ products = seedProducts }: { products?: Product[] }) {
  const [activeMaterial, setActiveMaterial] = useState<(typeof materialTabs)[number]>("Эмаль");
  const activeProduct = products.find((product) => product.slug === materialSlugByTab[activeMaterial]) ?? products[0];
  const mainMaterialProducts = useMemo(() => pickProducts(products, mainMaterials), [products]);
  const featuredProducts = useMemo(() => pickProducts(products, featuredCollection), [products]);
  const previewProducts = useMemo(() => pickProducts(products, catalogPreview), [products]);

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
                <a className="btn ghost" href="/catalog" onClick={() => analytics.track("catalog_open")}>Открыть каталог</a>
              </div>
            </div>
            <div className="hero-facts" aria-label="Условия">
              <span>{BUSINESS.freeDelivery}</span>
              <span>{BUSINESS.workingHoursShort}</span>
            </div>
          </div>
        </section>

        <section className="section category-section" aria-labelledby="category-title">
          <SectionHeader
            eyebrow="01 / Категории"
            id="category-title"
            title="Сразу понятно, что можно заказать."
            description="Категории ведут в каталог и работают как витрина материалов, а не как текстовый список ссылок."
          />
          <div className="category-grid">
            {materialTabs.map((material) => {
              const product = products.find((item) => item.slug === materialSlugByTab[material]) ?? products[0];
              return (
                <a className="category-card" href={`/catalog/${product.slug}`} key={material}>
                  <ProductObject product={product} size="compact" />
                  <span>{material}</span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="section" id="materials" aria-labelledby="materials-title">
          <SectionHeader
            eyebrow="02 / Материалы"
            id="materials-title"
            title="Основные фасадные решения"
            description="На главной только ключевые материалы. Полный ассортимент и цены остаются в каталоге."
            link={{ href: "/catalog", label: "Весь каталог" }}
          />
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
          <SectionHeader
            eyebrow="03 / Featured"
            id="featured-title"
            title="Глубина, камень, архитектурная плоскость."
            description="Более выразительные материалы вынесены в тёмную showroom-сцену."
          />
          <div className="featured-grid">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onClick={() => analytics.track("product_view", { slug: product.slug })} />
            ))}
          </div>
        </section>

        <section className="section explorer-section" aria-labelledby="explorer-title">
          <SectionHeader
            eyebrow="04 / Explorer"
            id="explorer-title"
            title="Материал крупно, без шума."
            description="Выбор меняет центральный объект, цену и описание. Это быстрый путь к первому решению."
          />
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
              <a className="btn secondary" href={`/catalog/${activeProduct.slug}`}>Подробнее</a>
            </div>
          </div>
        </section>

        <section className="section production-section" id="production" aria-labelledby="production-title">
          <SectionHeader
            eyebrow="05 / Преимущества"
            id="production-title"
            title="Цена, срок и качество под контролем."
            description="Три понятных причины обратиться за фасадами и столешницами в ФасадоФ."
          />
          <div className="capability-grid">
            {[
              { title: "Низкие цены", icon: "₽" },
              { title: "Быстрые сроки", icon: "◷" },
              { title: "Качество", icon: "✓" },
            ].map((item, index) => (
              <article className="capability-card" key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong aria-hidden="true">{item.icon}</strong>
                <h3>{item.title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section inspiration-section" aria-labelledby="inspiration-title">
          <SectionHeader
            eyebrow="06 / Проекты"
            id="inspiration-title"
            title="Фасад как предмет в комнате."
            description="Временная визуальная система показывает сценарии: тёплая древесина, тёмная плоскость, каменный edge, стеклянный модуль."
          />
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
          <SectionHeader
            eyebrow="07 / Каталог"
            id="catalog-preview-title"
            title="Ещё несколько материалов"
            description="Остальное не перегружает главную и доступно на отдельной странице каталога."
            link={{ href: "/catalog", label: "Перейти в каталог" }}
          />
          <div className="product-grid compact">
            {previewProducts.map((product) => (
              <ProductCard key={product.id} product={product} onClick={() => analytics.track("product_view", { slug: product.slug })} />
            ))}
          </div>
        </section>

        <section className="delivery-section" id="delivery">
          <div className="page-shell">
            <span>Воронеж —</span>
            <strong>доставка бесплатно.</strong>
          </div>
        </section>

        <section className="section order-section" id="order" aria-labelledby="order-title">
          <SectionHeader
            eyebrow="08 / Расчет"
            id="order-title"
            title="Короткая заявка без лишних полей."
            description="Форма передаёт UTM, first-touch, last-touch, страницу обращения и выбранный материал."
          />
          <LeadForm />
        </section>

        <section className="section faq-section" aria-labelledby="faq-title">
          <SectionHeader eyebrow="09 / FAQ" id="faq-title" title="Короткие ответы" />
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
              <p>{BUSINESS.address}</p>
              <p>
                <a href={BUSINESS.phone.href} onClick={() => analytics.track("phone_click", { place: "contacts" })}>
                  {BUSINESS.phone.display}
                </a>
              </p>
              <p><a href={BUSINESS.emailHref}>{BUSINESS.email}</a></p>
              <div className="social-links" aria-label="Социальные сети">
                <a href={BUSINESS.socials.vk} target="_blank" rel="noreferrer">VK</a>
                <a href={BUSINESS.socials.max} target="_blank" rel="noreferrer" onClick={() => analytics.track("max_click", { place: "contacts" })}>MAX</a>
                <a href={BUSINESS.socials.yandexMaps} target="_blank" rel="noreferrer">Яндекс Карты</a>
              </div>
            </article>
            <article className="contact-panel pink">
              <strong>{BUSINESS.freeDelivery}</strong>
              <span>{BUSINESS.workingHoursShort}</span>
              <span>{BUSINESS.workingHours.weekend}</span>
              <p>Менеджеры отвечают в рабочее время. AI-помощник доступен онлайн.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-grid">
          <span className="footer-brand"><BrandLogo compact /></span>
          <div className="footer-contact">
            <a href={BUSINESS.phone.href} onClick={() => analytics.track("phone_click", { place: "footer" })}>{BUSINESS.phone.display}</a>
            <a href={BUSINESS.emailHref}>{BUSINESS.email}</a>
          </div>
          <nav className="footer-links" aria-label="Ссылки футера">
            <a href={BUSINESS.socials.max} target="_blank" rel="noreferrer" onClick={() => analytics.track("max_click", { place: "footer" })}>MAX</a>
            <a href={BUSINESS.socials.vk} target="_blank" rel="noreferrer">VK</a>
            <a href={BUSINESS.socials.yandexMaps} target="_blank" rel="noreferrer">Яндекс Карты</a>
            <a href="/privacy">Политика и согласие</a>
            <a href="/admin/login">Вход в админ-панель</a>
          </nav>
          <div className="footer-schedule" aria-label="График работы">
            <strong>График работы</strong>
            {BUSINESS.workingHours.schedule.map((item) => (
              <span key={item.label}>{item.label}: {item.value}</span>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
