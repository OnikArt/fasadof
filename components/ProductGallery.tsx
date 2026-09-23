"use client";

import { useMemo, useState } from "react";
import { ProductObject } from "@/components/ProductObject";
import type { Product } from "@/data/products";

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

export function ProductGallery({ product }: { product: Product }) {
  const images = useMemo(() => buildGallery(product), [product]);
  const [active, setActive] = useState(0);
  const hasMultiple = images.length > 1;
  const activeImage = images[active] ?? images[0];
  const displayProduct = activeImage ? { ...product, image: activeImage.url } : product;
  const [touchStart, setTouchStart] = useState<number | null>(null);

  function go(direction: 1 | -1) {
    setActive((current) => (current + direction + images.length) % images.length);
  }

  return (
    <div className="product-gallery-widget">
      <div
        className="product-gallery-main"
        onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStart == null || !hasMultiple) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchStart) - touchStart;
          if (Math.abs(delta) > 42) go(delta < 0 ? 1 : -1);
          setTouchStart(null);
        }}
        aria-live="polite"
      >
        <ProductObject product={displayProduct} size="large" variant="stack" />
        {hasMultiple && (
          <>
            <button className="gallery-arrow prev" onClick={() => go(-1)} type="button" aria-label="Предыдущее фото">‹</button>
            <button className="gallery-arrow next" onClick={() => go(1)} type="button" aria-label="Следующее фото">›</button>
            <div className="gallery-dots">{images.map((image, index) => <button className={active === index ? "active" : ""} key={image.id} onClick={() => setActive(index)} type="button" aria-label={`Показать фото ${index + 1}`} />)}</div>
          </>
        )}
        <span className="gallery-counter">{active + 1}/{images.length}</span>
      </div>
    </div>
  );
}

function buildGallery(product: Product): GalleryImage[] {
  const urls = [product.image, ...(product.gallery ?? [])].filter(Boolean);
  const unique = Array.from(new Set(urls));
  return unique.length ? unique.map((url, index) => ({
    id: `${product.id}-${index}`,
    url,
    alt: `${product.name} - фото ${index + 1}`,
  })) : [{ id: product.id, url: product.image, alt: product.name }];
}
