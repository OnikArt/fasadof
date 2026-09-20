"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ProductCard } from "@/components/ProductCard";
import { ProductObject } from "@/components/ProductObject";
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
        <section className="cover-hero">
          <div className="cover-hero-media">
              {/* Pre-optimized static sources avoid requiring an image proxy on the VPS. */}
              <picture>
                <source
                  media="(max-width: 768px)"
                  srcSet="/images/hero/fasadof-mobile-430.webp 430w, /images/hero/fasadof-mobile-860.webp 860w"
                  sizes="100vw"
                />
                <img src="/images/hero/fasadof-scene-1983.webp"
                  srcSet="/images/hero/fasadof-scene-1280.webp 1280w, /images/hero/fasadof-scene-1983.webp 1983w"
                  sizes="100vw"
                  width={1983} height={793} fetchPriority="high" loading="eager"
                  alt="Интерьерная композиция мебельных фасадов, дерева и камня ФасадоФ" />
              </picture>
            </div>
          <div className="page-shell cover-hero-layout">
            <div className="cover-hero-index" aria-hidden="true">01 / 09</div>
            <div className="cover-hero-copy">
              <p className="eyebrow">Мебельные материалы · Воронеж</p>
              <h1><span>Фасады и столешницы </span><br />для мебели <span>на заказ</span></h1>
              <p>Подберём материал, цвет и фактуру и рассчитаем стоимость проекта.</p>
              <div className="hero-actions">
                <a className="btn primary" href="#order" onClick={() => analytics.track("cta_click", { place: "hero", action: "lead" })}>
                  Рассчитать проект
                </a>
                <a className="btn ghost" href="/catalog" onClick={() => analytics.track("catalog_open")}>Открыть каталог</a>
              </div>
            </div>
            <div className="cover-hero-facts" aria-label="Доставка и график работы">
              <strong>{BUSINESS.freeDelivery}</strong>
              <span>ПН–ПТ · 09:00–17:00</span>
              <a className="hero-showroom" href={BUSINESS.socials.yandexMaps} target="_blank" rel="noreferrer">
                <span>Посмотреть материалы вживую</span>
                <strong>Воронеж · ул. Машиностроителей, 3</strong>
              </a>
            </div>
            <p className="cover-hero-materials">Эмаль · шпон · массив · Fenix · камень</p>
          </div>
        </section>

        <section className="section category-section" aria-labelledby="category-title">
          <SectionHeader
            eyebrow="01 / Категории"
            id="category-title"
            title="Фасады под ваш интерьер"
            description="От гладкой эмали до натурального дерева: подберём материал для кухни, шкафа или тумбы."
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
            description="Сравните фактуры и стоимость, чтобы выбрать решение для вашей мебели."
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
            description="Камень, бетон и компакт-плиты для выразительных деталей интерьера."
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
            title="Найдите свою фактуру"
            description="Подберём покрытие под стиль интерьера, условия использования и бюджет."
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
            <div className="explorer-visual" key={`visual-${activeProduct.id}`}>
              <ProductObject product={activeProduct} size="large" variant="stack" />
            </div>
            <div className="explorer-copy" key={`copy-${activeProduct.id}`}>
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
              { label: "Цена", title: "Выгодная стоимость", description: "Поможем подобрать материал под ваш бюджет." },
              { label: "Срок", title: "Понятные сроки", description: "Срок заказа уточняется до запуска проекта." },
              { label: "Качество", title: "Контроль исполнения", description: "Согласуем материал, фактуру и детали до производства." },
            ].map((item, index) => (
              <article className="capability-card" key={item.title}>
                <div className="capability-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
                <p className="capability-label">{item.label}</p>
                <div className="capability-copy">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section inspiration-section" aria-labelledby="inspiration-title">
          <SectionHeader
            eyebrow="06 / Проекты"
            id="inspiration-title"
            title="Фасад как предмет в комнате."
            description="Сочетайте дерево, эмаль, камень и стекло в одном проекте. Поможем согласовать материалы."
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
            description="Больше вариантов для фасадов и рабочих поверхностей в полном каталоге."
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

        <section className="section faq-section" aria-labelledby="faq-title">
          <SectionHeader eyebrow="08 / FAQ" id="faq-title" title="Короткие ответы" />
          <div className="faq-list">
            {faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
                {item.href && <a className="faq-action" href={item.href} target="_blank" rel="noreferrer">Показать на карте →</a>}
              </details>
            ))}
          </div>
        </section>

        <section className="section contacts-section" id="contacts" aria-labelledby="contacts-title">
          <div className="contact-experience">
            <article className="contact-details">
              <p className="eyebrow">Контакты</p>
              <h2 id="contacts-title">Обсудим ваш проект</h2>
              <p className="contact-intro">Подскажем по материалам, покажем образцы в шоуруме и уточним детали будущего заказа.</p>
              <div className="contact-rows">
                <a className="contact-row" href={BUSINESS.phone.href} onClick={() => analytics.track("phone_click", { place: "contacts" })}>
                  <span>Номер телефона</span>
                  <strong>{BUSINESS.phone.display}</strong>
                  <b aria-hidden="true">→</b>
                </a>
                <a className="contact-row" href={BUSINESS.emailHref}>
                  <span>Электронная почта</span>
                  <strong>{BUSINESS.email}</strong>
                  <b aria-hidden="true">→</b>
                </a>
                <a className="contact-row" href={BUSINESS.socials.yandexMaps} target="_blank" rel="noreferrer">
                  <span>Посмотреть материалы вживую</span>
                  <strong>{BUSINESS.address}</strong>
                  <b aria-hidden="true">→</b>
                </a>
              </div>
              <div className="contact-meta">
                <div>
                  <span>График</span>
                  <strong>{BUSINESS.workingHours.label}</strong>
                  <small>{BUSINESS.workingHours.weekend}</small>
                </div>
                <strong className="delivery-badge">{BUSINESS.freeDelivery}</strong>
              </div>
              <div className="social-links" aria-label="Каналы связи">
                <a href={BUSINESS.socials.max} target="_blank" rel="noreferrer" onClick={() => analytics.track("max_click", { place: "contacts" })}>MAX</a>
                <a href={BUSINESS.socials.vk} target="_blank" rel="noreferrer">VK</a>
                <a href={BUSINESS.socials.yandexMaps} target="_blank" rel="noreferrer">Яндекс Карты</a>
              </div>
            </article>
            <article className="contact-calculation" id="order" aria-labelledby="order-title">
              <p className="eyebrow">09 / Расчёт</p>
              <h2 id="order-title">Индивидуальный расчёт</h2>
              <p className="calculation-intro">Стоимость рассчитывается индивидуально после отправки заявки. Менеджер уточнит размеры, материалы и детали проекта.</p>
              <LeadForm />
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-grid">
          <span className="footer-brand"><BrandLogo compact /></span>
          <div className="footer-contact">
            <div><span>Номер телефона</span><a href={BUSINESS.phone.href} onClick={() => analytics.track("phone_click", { place: "footer" })}>{BUSINESS.phone.display}</a></div>
            <div><span>Электронная почта</span><a href={BUSINESS.emailHref}>{BUSINESS.email}</a></div>
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
          <div className="footer-credit">
            <span>© ФасадоФ</span>
            <span>Digital by OnikArt</span>
          </div>
        </div>
      </footer>
    </>
  );
}
