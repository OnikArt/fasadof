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
  const fallbackImages: Record<string, string> = {
    moonlite: "/images/products/pet-facades.jpg",
    glass: "/images/products/glass-facades.jpg",
    stone: "/images/products/dark-stone.jpg",
    fenix: "/images/products/mdf-facades.jpg",
    pet: "/images/products/pet-facades.jpg",
    wood: "/images/products/walnut-veneer.jpg",
    beton: "/images/products/concrete-facades.jpg",
    veneer: "/images/products/walnut-veneer.jpg",
    pvc: "/images/products/mdf-facades.jpg",
    enamel: "/images/products/pet-facades.jpg",
    compact: "/images/products/dark-stone.jpg",
    dsp: "/images/products/walnut-veneer.jpg",
    quartz: "/images/products/light-stone.jpg",
  };
  const imageUrl = product.image.startsWith("/") || product.image.startsWith("https://")
    ? product.image
    : fallbackImages[product.texture];
  return (
    <div className={`product-object ${product.texture} size-${size} ${variant}`} aria-label={product.name}>
      {/* Imported media has unknown dimensions and is served by the local media route. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {imageUrl && <img className="product-object-image" src={imageUrl} alt={product.name} loading="lazy" decoding="async" />}
      {!imageUrl && <>
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
