import { products, type Product } from "@/data/products";

export type CategoryPage = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  productFilter: (product: Product) => boolean;
};

export const categoryPages: CategoryPage[] = [
  {
    slug: "emal",
    title: "Мебельные фасады в эмали",
    description: "Фасады в эмали для кухонь, гардеробных и акцентных мебельных модулей.",
    intro: "Эмаль подходит, когда нужен точный цвет, спокойная матовая плоскость или глянцевый акцент.",
    productFilter: (product) => product.slug === "enamel",
  },
  {
    slug: "shpon",
    title: "Шпонированные мебельные фасады",
    description: "Натуральный шпон для фасадов, панелей и премиальных мебельных акцентов.",
    intro: "Шпон даёт интерьеру натуральный рисунок дерева без визуальной тяжести массива.",
    productFilter: (product) => product.slug === "natural-veneer",
  },
  {
    slug: "massiv",
    title: "Фасады из массива",
    description: "Фасады из массива дерева для тёплых и выразительных мебельных проектов.",
    intro: "Массив выбирают для мебели, где важны натуральный характер, глубина и долговечная фактура.",
    productFilter: (product) => product.slug === "solid-wood",
  },
  {
    slug: "pvh",
    title: "МДФ фасады в ПВХ",
    description: "Практичные МДФ фасады в ПВХ для проектов с контролируемым бюджетом.",
    intro: "ПВХ остаётся понятным решением для фасадов, где важны форма, практичность и стоимость.",
    productFilter: (product) => product.slug === "mdf-pvc",
  },
  {
    slug: "fenix",
    title: "Фасады Fenix и Egger",
    description: "Современные пластиковые фасады Fenix и Egger для активного повседневного использования.",
    intro: "Fenix и Egger дают плотный современный цвет и спокойную поверхность без лишнего визуального шума.",
    productFilter: (product) => product.slug === "fenix-egger",
  },
  {
    slug: "stoleshnitsy",
    title: "Столешницы на заказ",
    description: "Компакт-плиты, EVA/ДСП, акриловый камень и кварцевый агломерат для столешниц.",
    intro: "Столешницы подбираются под мебельную задачу: от практичного ДСП до тонкой компакт-плиты и камня.",
    productFilter: (product) => product.category === "countertops",
  },
];

export function getCategoryPage(slug: string) {
  return categoryPages.find((category) => category.slug === slug);
}

export function getCategoryProducts(category: CategoryPage) {
  return products.filter(category.productFilter);
}
