import type { Metadata } from "next";
import { CatalogExperience } from "@/components/CatalogExperience";
import { listPublicProducts } from "@/server/products";

export const metadata: Metadata = {
  title: "Каталог фасадов и столешниц",
  description: "Полный каталог материалов ФасадоФ: эмаль, шпон, массив, ПЭТ, Fenix, каменный шпон, ART Beton и столешницы.",
  alternates: {
    canonical: "/catalog",
  },
};

export default async function CatalogPage() {
  const products = await listPublicProducts();
  return <CatalogExperience products={products} />;
}
