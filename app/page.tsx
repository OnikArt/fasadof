import type { Metadata } from "next";
import { HomeExperience } from "@/components/HomeExperience";

export const metadata: Metadata = {
  title: "Фасады, которые хочется трогать",
  description:
    "Каталог мебельных фасадов и столешниц ФасадоФ: эмаль, шпон, массив, ПЭТ, Fenix, каменный шпон, ART Beton. Бесплатная доставка по Воронежу.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <HomeExperience />;
}
