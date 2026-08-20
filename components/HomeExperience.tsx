"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BUSINESS } from "@/config/business";
import { faq } from "@/data/faq";
import { formatPrice, products, type Product } from "@/data/products";
import { analytics } from "@/features/analytics/analytics";
import { LeadForm } from "@/components/LeadForm";
import { SupportChat } from "@/components/SupportChat";

const materialTabs = ["ЭМАЛЬ", "ШПОН", "МАССИВ", "FENIX", "КАМЕНЬ", "ПЭТ", "BETON"] as const;

const materialByTab: Record<(typeof materialTabs)[number], Product> = {
  ЭМАЛЬ: products.find((product) => product.slug === "enamel") ?? products[0],
  ШПОН: products.find((product) => product.slug === "natural-veneer") ?? products[0],
  МАССИВ: products.find((product) => product.slug === "solid-wood") ?? products[0],
  FENIX: products.find((product) => product.slug === "fenix-egger") ?? products[0],
  КАМЕНЬ: products.find((product) => product.slug === "stone-veneer") ?? products[0],
  ПЭТ: products.find((product) => product.slug === "pet") ?? products[0],
  BETON: products.find((product) => product.slug === "art-beton") ?? products[0],
};

const collectionSlugs = ["enamel", "natural-veneer", "solid-wood", "fenix-egger"];
const featuredSlugs = ["stone-veneer", "compact-plates", "art-beton"];

function pickProducts(slugs: string[]) {
  return slugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product));
}

export function ObjectVisual({
  product,
  large = false,
  portrait = false,
}: {
  product: Product;
  large?: boolean;
  portrait?: boolean;
}) {
  return (
    <div className={`object-visual ${product.texture}${large ? " large" : ""}${portrait ? " portrait" : ""}`} aria-label={product.name}>
      <div className="object-stage">
        <span className="panel panel-back" />
        <span className="panel panel-main" />
        <span className="panel panel-side" />
        <span className="panel panel-plinth" />
      </div>
    </div>
  );
}

function ProductShowroomCard({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  return (
    <article className={`showroom-card ${className}`}>
      <Link href={`/catalog/${product.slug}`} onClick={() => analytics.track("product_view", { slug: product.slug })}>
        <ObjectVisual product={product} />
        <div className="showroom-card-copy">
          <span>{product.material}</span>
          <h3>{product.name}</h3>
          <strong>{formatPrice(product)} <span aria-hidden="true">→</span></strong>
        </div>
      </Link>
    </article>
  );
}

export function HomeExperience() {
  const [activeMaterial, setActiveMaterial] = useState<(typeof materialTabs)[number]>("ЭМАЛЬ");
  const [menuOpen, setMenuOpen] = useState(false);
  const activeProduct = materialByTab[activeMaterial];
  const collectionProducts = useMemo(() => pickProducts(collectionSlugs), []);
  const featuredProducts = useMemo(() => pickProducts(featuredSlugs), []);

  useEffect(() => {
    analytics.track("page_view", { page: "/" });
  }, []);

  return (
    <>
      <header className="site-header showroom-header">
        <Link className="brand" href="#top">ФасадоФ</Link>
        <button className="menu-button" type="button" onClick={() => setMenuOpen((current) => !current)}>
          {menuOpen ? "Закрыть" : "Меню"}
        </button>
        <nav className={menuOpen ? "open" : ""} aria-label="Основная навигация">
          <a href="#materials">Материалы</a>
          <Link href="/catalog" onClick={() => analytics.track("catalog_open")}>Каталог</Link>
          <a href="#intro">О нас</a>
          <a href="#delivery">Доставка</a>
          <a className="nav-cta" href="#order">Рассчитать</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero showroom-hero" aria-labelledby="hero-title">
          <div className="hero-word" aria-hidden="true">ФАСАДОФ</div>
          <div className="hero-scene">
            <Image
              src="/og.png"
              alt="Центральная тумба из фасадов, панелей и материалов ФасадоФ"
              width={1792}
              height={1024}
              priority
              sizes="100vw"
            />
          </div>
          <div className="hero-note hero-note-left">
            <span>Мебельные фасады</span>
            <span>и столешницы</span>
          </div>
          <div className="hero-note hero-note-right">
            <strong>{BUSINESS.freeDelivery}</strong>
            <span>Пн-Пт / 09:00-18:00</span>
          </div>
          <div className="hero-copy">
            <p id="hero-title">Фасады и столешницы для современного интерьера.</p>
            <a className="btn primary" href="#order" onClick={() => analytics.track("cta_click", { place: "hero", action: "lead" })}>
              Рассчитать проект →
            </a>
          </div>
          <a className="circle-cta" href="#materials" onClick={() => analytics.track("cta_click", { place: "hero", action: "materials" })}>
            <span>Смотреть материалы</span>
            <b>→</b>
          </a>
        </section>

        <section className="intro section" id="intro">
          <div className="intro-copy">
            <h1>Материал, который определяет интерьер.</h1>
            <p>
              Фасад работает как предмет: поверхность, edge, свет, объём. От эмали до натурального шпона — под конкретный проект.
            </p>
          </div>
          <div className="intro-visuals">
            <article className="image-card image-card-wide">
              <ObjectVisual product={products.find((product) => product.slug === "solid-wood") ?? products[0]} large />
              <span>Walnut module</span>
            </article>
            <article className="image-card">
              <ObjectVisual product={products.find((product) => product.slug === "enamel") ?? products[0]} portrait />
              <span>Lacquer detail</span>
            </article>
          </div>
        </section>

        <section className="collection section" aria-labelledby="collection-title">
          <div className="quiet-head">
            <p className="eyebrow">Материалы</p>
            <h2 id="collection-title">Ключевая коллекция</h2>
            <Link href="/catalog">Смотреть весь каталог →</Link>
          </div>
          <div className="collection-grid">
            {collectionProducts.map((product, index) => (
              <ProductShowroomCard product={product} className={index === 0 ? "wide" : ""} key={product.id} />
            ))}
          </div>
        </section>

        <section className="material-explorer section" id="materials" aria-labelledby="materials-title">
          <div className="quiet-head">
            <p className="eyebrow">Configurator</p>
            <h2 id="materials-title">Поверхность крупным планом</h2>
          </div>
          <div className="configurator">
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
            <ObjectVisual product={activeProduct} large portrait />
            <div className="material-info">
              <span>{activeProduct.material}</span>
              <h3>{activeProduct.name}</h3>
              <p>{activeProduct.description}</p>
              <strong>{formatPrice(activeProduct)}</strong>
              <Link className="btn secondary" href={`/catalog/${activeProduct.slug}`}>Подробнее →</Link>
            </div>
          </div>
        </section>

        <section className="featured-dark section" aria-labelledby="featured-title">
          <div className="quiet-head dark">
            <p className="eyebrow">Коллекция ФасадоФ</p>
            <h2 id="featured-title">Глубина, камень, тишина.</h2>
          </div>
          <div className="featured-grid">
            {featuredProducts.map((product) => (
              <ProductShowroomCard product={product} key={product.id} />
            ))}
          </div>
        </section>

        <section className="gallery section" aria-labelledby="gallery-title">
          <div className="quiet-head">
            <p className="eyebrow">Inspiration</p>
            <h2 id="gallery-title">Материал в интерьере</h2>
          </div>
          <div className="masonry-gallery">
            <article className="gallery-tile large"><ObjectVisual product={products.find((product) => product.slug === "stone-veneer") ?? products[0]} large /><span>Stone edge</span></article>
            <article className="gallery-tile"><ObjectVisual product={products.find((product) => product.slug === "fenix-egger") ?? products[0]} /><span>Dark plane</span></article>
            <article className="gallery-tile wide"><ObjectVisual product={products.find((product) => product.slug === "natural-veneer") ?? products[0]} /><span>Veneer line</span></article>
            <article className="gallery-tile portrait"><ObjectVisual product={products.find((product) => product.slug === "aluminum-glass") ?? products[0]} portrait /><span>Glass module</span></article>
          </div>
        </section>

        <section className="delivery section" id="delivery">
          <span>Доставка —</span>
          <strong>бесплатно.</strong>
        </section>

        <section className="process section" aria-labelledby="process-title">
          <div className="quiet-head">
            <p className="eyebrow">Процесс</p>
            <h2 id="process-title">Спокойный путь к расчёту</h2>
          </div>
          <ol>
            <li><span>01</span><strong>Выберите материал</strong><p>Или напишите «не знаю».</p></li>
            <li><span>02</span><strong>Отправьте размеры</strong><p>Площадь или комментарий.</p></li>
            <li><span>03</span><strong>Получите расчёт</strong><p>Менеджер уточнит детали.</p></li>
            <li><span>04</span><strong>Запустим производство</strong><p>Под конкретный проект.</p></li>
          </ol>
        </section>

        <section className="order section" id="order" aria-labelledby="order-title">
          <div className="order-heading">
            <p className="eyebrow">Calculator</p>
            <h2 id="order-title">Рассчитать проект</h2>
            <p>Заявка передаёт UTM, first-touch, last-touch и страницу обращения.</p>
          </div>
          <LeadForm />
        </section>

        <section className="faq section" aria-labelledby="faq-title">
          <div className="quiet-head">
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-title">Коротко</h2>
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
          <article className="contact-card">
            <p className="eyebrow">Contacts</p>
            <h2 id="contacts-title">Контакты</h2>
            <p>Телефон, email и адрес ждут реальные данные владельца бизнеса.</p>
          </article>
          <article className="contact-card pink">
            <strong>{BUSINESS.freeDelivery}</strong>
            <span>{BUSINESS.workingHours}</span>
            <p>Без вымышленных условий и мелкого шрифта.</p>
          </article>
        </section>
      </main>

      <footer className="site-footer">
        <span>ФасадоФ</span>
        <Link href="/privacy">Политика и согласие</Link>
        <Link href="/admin/support">Support admin</Link>
      </footer>

      <SupportChat />
    </>
  );
}
