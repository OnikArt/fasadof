import type { Metadata } from "next";
import { HomeExperience } from "@/components/HomeExperience";
import { faq } from "@/data/faq";
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
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <HomeExperience products={products} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}
