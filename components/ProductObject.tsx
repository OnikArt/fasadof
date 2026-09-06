import type { Product } from "@/data/products";

export function ProductObject({
  product,
  size = "default",
  variant = "module",
}: {
  product: Product;
  size?: "default" | "large" | "compact";
  variant?: "module" | "slab" | "stack";
}) {
  const hasImage = product.image.startsWith("/") || product.image.startsWith("https://");
  return (
    <div className={`product-object ${product.texture} size-${size} ${variant}`} aria-label={product.name}>
      {/* Imported media has unknown dimensions and is served by the local media route. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {hasImage && <img className="product-object-image" src={product.image} alt={product.name} loading="lazy" decoding="async" />}
      {!hasImage && <>
      <div className="object-shadow" />
      <div className="object-board object-board-back" />
      <div className="object-board object-board-left" />
      <div className="object-board object-board-main" />
      <div className="object-board object-board-ribbed" />
      <div className="object-board object-board-accent" />
      <div className="object-board object-board-glass" />
      <div className="object-handle" />
      </>}
    </div>
  );
}

export function HeroObject() {
  return (
    <div className="hero-object" aria-label="Композиция из мебельных фасадов, панелей и тумб ФасадоФ">
      <div className="hero-object-shadow" />
      <div className="hero-slab hero-slab-olive" />
      <div className="hero-slab hero-slab-paper" />
      <div className="hero-cabinet">
        <span className="hero-door hero-door-walnut" />
        <span className="hero-door hero-door-ribbed" />
        <span className="hero-door hero-door-pink" />
        <span className="hero-door hero-door-glass" />
        <span className="hero-handle" />
        <span className="hero-plinth" />
      </div>
    </div>
  );
}
