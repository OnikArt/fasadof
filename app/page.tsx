import type { Metadata } from "next";
import { HomeExperience } from "@/components/HomeExperience";
import { listPublicProducts } from "@/server/products";

export const metadata: Metadata = {
  title: "Фасады, которые хочется трогать",
  description:
    "Каталог мебельных фасадов и столешниц ФасадоФ: эмаль, шпон, массив, ПЭТ, Fenix, каменный шпон, ART Beton. Бесплатная доставка по Воронежу.",
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  const products = await listPublicProducts();
  return <HomeExperience products={products} />;
}
