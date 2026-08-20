import Link from "next/link";
import { ProductObject } from "@/components/ProductObject";
import { formatPrice, productCategories, type Product } from "@/data/products";

export function ProductCard({
  product,
  featured = false,
  onClick,
}: {
  product: Product;
  featured?: boolean;
  onClick?: () => void;
}) {
  return (
    <article className={`product-card${featured ? " featured" : ""}`}>
      <Link href={`/catalog/${product.slug}`} onClick={onClick}>
        <div className="card-media">
          <ProductObject product={product} size={featured ? "large" : "default"} />
        </div>
        <div className="card-body">
          <p className="card-meta">{productCategories[product.category]} / {product.material}</p>
          <h3>{product.name}</h3>
          <p>{product.features?.slice(0, 2).join(" · ") ?? product.description}</p>
        </div>
        <div className="card-footer">
          <strong>{formatPrice(product)}</strong>
          <span>Подробнее</span>
        </div>
      </Link>
    </article>
  );
}
