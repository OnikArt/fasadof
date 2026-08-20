import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/LeadForm";
import { BUSINESS } from "@/config/business";
import { formatPrice, getProduct, productCategories, products } from "@/data/products";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function ProductObject({ texture, name, large = false }: { texture: string; name: string; large?: boolean }) {
  return (
    <div className={`object-visual ${texture}${large ? " large" : ""}`} aria-label={name}>
      <div className="object-stage">
        <span className="panel panel-back" />
        <span className="panel panel-main" />
        <span className="panel panel-side" />
        <span className="panel panel-plinth" />
      </div>
    </div>
  );
}

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
        <Link className="back-link" href="/catalog">Каталог</Link>

        <section className="product-hero section">
          <div>
            <ProductObject texture={product.texture} name={product.name} large />
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
            <a className="btn primary" href="#product-order">Рассчитать материал</a>
          </div>
        </section>

        <section className="section product-gallery" aria-labelledby="gallery-title">
          <div className="section-head">
            <p className="eyebrow">Фактура в проекте</p>
            <h2 id="gallery-title">Материал крупно, в торце и в модуле</h2>
          </div>
          <div className="project-grid">
            <article>
              <ProductObject texture={product.texture} name={`${product.name}: большая плоскость`} />
              <span>01</span>
              <p>Большая плоскость показывает цвет и геометрию фасада.</p>
            </article>
            <article>
              <ProductObject texture={product.texture} name={`${product.name}: торец`} />
              <span>02</span>
              <p>Торец и профиль согласуются на этапе расчета.</p>
            </article>
            <article>
              <ProductObject texture={product.texture} name={`${product.name}: мебельный модуль`} />
              <span>03</span>
              <p>Материал подбирается под мебельную задачу, а не под витрину.</p>
            </article>
          </div>
        </section>

        <section className="order section" id="product-order" aria-labelledby="product-order-title">
          <div>
            <p className="eyebrow">Заявка</p>
            <h2 id="product-order-title">Расчет материала</h2>
            <p>Форма передаст выбранный материал, страницу и attribution в server-side API.</p>
          </div>
          <LeadForm product={product.name} />
        </section>

        {related.length > 0 && (
          <section className="section" aria-labelledby="related-title">
            <div className="section-head">
              <p className="eyebrow">Рядом по коллекции</p>
              <h2 id="related-title">Похожие материалы</h2>
            </div>
            <div className="catalog-grid">
              {related.map((item) => (
                <article className="showroom-card catalog-card" key={item.id}>
                  <Link href={`/catalog/${item.slug}`}>
                    <ProductObject texture={item.texture} name={item.name} />
                    <div>
                      <span>{productCategories[item.category]}</span>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <strong>{formatPrice(item)}</strong>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
    </>
  );
}
