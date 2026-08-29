import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/LeadForm";
import { ProductBackButton } from "@/components/ProductBackButton";
import { ProductCard } from "@/components/ProductCard";
import { ProductObject } from "@/components/ProductObject";
import { SiteHeader } from "@/components/SiteHeader";
import { BUSINESS } from "@/config/business";
import { getCategoryPage, getCategoryProducts, categoryPages } from "@/data/categoryPages";
import { formatPrice, getProduct, productCategories, products } from "@/data/products";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return [
    ...products.map((product) => ({ slug: product.slug })),
    ...categoryPages.map((category) => ({ slug: category.slug })),
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  const category = getCategoryPage(slug);

  if (product) {
    return {
      title: `${product.name} - ${formatPrice(product)}`,
      description: product.description,
      alternates: {
        canonical: `/catalog/${product.slug}`,
      },
      openGraph: {
        title: `${product.name} - ФасадоФ`,
        description: product.description,
        images: ["/og.png"],
        type: "website",
      },
    };
  }

  if (category) {
    return {
      title: category.title,
      description: category.description,
      alternates: {
        canonical: `/catalog/${category.slug}`,
      },
      openGraph: {
        title: `${category.title} - ФасадоФ`,
        description: category.description,
        images: ["/og.png"],
        type: "website",
      },
    };
  }

  return {
    title: "Материал не найден",
  };
}

export default async function ProductOrCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    const category = getCategoryPage(slug);
    if (!category) notFound();
    return <CategoryLanding slug={slug} />;
  }

  const related = products
    .filter((item) => item.category === product.category && item.slug !== product.slug)
    .slice(0, 3);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    category: productCategories[product.category],
    description: product.description,
    brand: {
      "@type": "Brand",
      name: BUSINESS.name,
    },
    offers: product.priceFrom
      ? {
          "@type": "Offer",
          priceCurrency: "RUB",
          price: product.priceFrom,
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "/" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: "/catalog" },
      { "@type": "ListItem", position: 3, name: product.name, item: `/catalog/${product.slug}` },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main className="product-page page-main">
        <div className="section product-back-row">
          <ProductBackButton />
        </div>
        <section className="section product-detail-hero">
          <div className="product-gallery">
            <div className="product-gallery-main">
              <ProductObject product={product} size="large" variant="stack" />
            </div>
            <div className="product-gallery-thumbs" aria-label="Варианты просмотра материала">
              <ProductObject product={product} size="compact" />
              <ProductObject product={product} size="compact" variant="slab" />
              <ProductObject product={product} size="compact" variant="stack" />
            </div>
          </div>

          <aside className="product-info">
            <nav className="breadcrumbs" aria-label="Хлебные крошки">
              <a href="/">Главная</a>
              <span>/</span>
              <a href="/catalog">Каталог</a>
            </nav>
            <p className="eyebrow">{productCategories[product.category]} / {product.material}</p>
            <h1>{product.name}</h1>
            <strong>{formatPrice(product)}</strong>
            <p>{product.description}</p>
            {product.features && (
              <ul>
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            )}
            {product.application && <p><b>Применение:</b> {product.application}</p>}
            <a className="btn primary" href="#product-order">Рассчитать материал</a>
          </aside>
        </section>

        <section className="section production-section" aria-labelledby="material-use-title">
          <div className="section-grid">
            <div className="section-kicker">Материал в задаче</div>
            <div className="section-heading">
              <h2 id="material-use-title">Смотрим не образец, а мебельный сценарий.</h2>
              <p>На расчете важны площадь, торцы, профиль, соседние материалы и то, как фасад будет работать в комнате.</p>
            </div>
          </div>
          <div className="capability-grid">
            <article className="capability-card"><span>01</span><h3>Большая плоскость</h3></article>
            <article className="capability-card"><span>02</span><h3>Торец и профиль</h3></article>
            <article className="capability-card"><span>03</span><h3>Соседние материалы</h3></article>
          </div>
        </section>

        <section className="section order-section" id="product-order" aria-labelledby="product-order-title">
          <div className="section-grid">
            <div className="section-kicker">Расчет</div>
            <div className="section-heading">
              <h2 id="product-order-title">Расчет материала</h2>
              <p>Форма передаст выбранный материал, страницу и attribution в server-side API.</p>
            </div>
          </div>
          <LeadForm product={product.name} />
        </section>

        {related.length > 0 && (
          <section className="section" aria-labelledby="related-title">
            <div className="section-grid">
              <div className="section-kicker">Похожие</div>
              <div className="section-heading">
                <h2 id="related-title">Рядом по коллекции</h2>
              </div>
            </div>
            <div className="product-grid compact">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}

function CategoryLanding({ slug }: { slug: string }) {
  const category = getCategoryPage(slug);
  if (!category) notFound();

  const categoryProducts = getCategoryProducts(category);
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "/" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: "/catalog" },
      { "@type": "ListItem", position: 3, name: category.title, item: `/catalog/${category.slug}` },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main className="catalog-page page-main">
        <section className="section catalog-intro">
          <div className="section-grid">
            <div className="section-kicker">Категория</div>
            <div className="section-heading">
              <h1>{category.title}</h1>
              <p>{category.intro}</p>
            </div>
            <a className="section-link" href="/catalog">Весь каталог</a>
          </div>
        </section>
        <section className="section">
          <div className="product-grid">
            {categoryProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
