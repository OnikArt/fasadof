import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/LeadForm";
import { BUSINESS } from "@/config/business";
import { formatPrice, getProduct, productCategories, products } from "@/data/products";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    return {
      title: "Материал не найден",
    };
  }

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

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) notFound();

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

  return (
    <>
      <main className="product-page">
        <Link className="back-link" href="/#catalog">Вернуться в каталог</Link>
        <section className="product-hero section">
          <div className={`product-visual large ${product.texture}`} aria-label={product.name}>
            <span>{product.shortName ?? product.material}</span>
          </div>
          <div className="product-detail">
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
            {product.application && (
              <p><b>Применение:</b> {product.application}</p>
            )}
            <a className="btn primary" href="#product-order">Рассчитать {product.shortName ?? product.material}</a>
          </div>
        </section>

        <section className="section product-gallery" aria-labelledby="gallery-title">
          <div className="section-head">
            <p className="eyebrow">Gallery</p>
            <h2 id="gallery-title">Фактура в проекте</h2>
          </div>
          <div className="project-grid">
            <article><span>01</span><p>Большая плоскость показывает цвет и геометрию фасада.</p></article>
            <article><span>02</span><p>Торец и профиль согласуются на этапе расчёта.</p></article>
            <article><span>03</span><p>Материал подбирается под мебельную задачу, а не под витрину.</p></article>
          </div>
        </section>

        <section className="order section" id="product-order" aria-labelledby="product-order-title">
          <div>
            <p className="eyebrow">Request</p>
            <h2 id="product-order-title">Расчёт материала</h2>
            <p>Форма передаст выбранный материал, страницу и attribution в server-side API.</p>
          </div>
          <LeadForm product={product.name} />
        </section>

        <section className="section" aria-labelledby="related-title">
          <div className="section-head">
            <p className="eyebrow">Related</p>
            <h2 id="related-title">Похожие материалы</h2>
          </div>
          <div className="popular-strip">
            {related.map((item) => (
              <a className="popular-chip" href={`/catalog/${item.slug}`} key={item.id}>
                <div className={`product-visual ${item.texture}`}><span>{item.shortName ?? item.material}</span></div>
                <span>{item.name}</span>
                <strong>{formatPrice(item)}</strong>
              </a>
            ))}
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
    </>
  );
}
