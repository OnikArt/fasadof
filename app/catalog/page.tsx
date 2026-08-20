import type { Metadata } from "next";
import { CatalogExperience } from "@/components/CatalogExperience";

export const metadata: Metadata = {
  title: "Каталог фасадов и столешниц",
  description: "Полный каталог материалов ФасадоФ: эмаль, шпон, массив, ПЭТ, Fenix, каменный шпон, ART Beton и столешницы.",
  alternates: {
    canonical: "/catalog",
  },
};

export default function CatalogPage() {
  return <CatalogExperience />;
}
