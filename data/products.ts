export type ProductCategory = string;

export type Product = {
  id: string;
  slug: string;
  category: ProductCategory;
  material: string;
  name: string;
  shortName?: string;
  description: string;
  fullDescription?: string;
  priceFrom?: number;
  oldPrice?: number;
  pricePrefix?: string;
  priceUnit?: string;
  priceOnRequest?: boolean;
  image: string;
  texture: string;
  gallery?: string[];
  features?: string[];
  application?: string;
  popular?: boolean;
  status?: "published" | "hidden" | "archived";
  vkOwnerId?: number;
  vkMarketItemId?: number;
  vkUrl?: string;
  vkSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

export const products: Product[] = [
  {
    id: "lmdf-moonlite",
    slug: "lmdf-moonlite",
    category: "facades",
    material: "ЛМДФ",
    name: "ЛМДФ Moonlite",
    shortName: "Moonlite",
    description: "Спокойная матовая база для кухни, гардеробной или встроенной мебели с аккуратной современной фактурой.",
    priceFrom: 3500,
    priceUnit: "м²",
    image: "texture-moonlite",
    texture: "moonlite",
    features: ["матовая поверхность", "ровная геометрия", "для фасадов и панелей"],
    application: "Кухонные фасады, встроенные системы, панели в спокойных интерьерах.",
    popular: true,
  },
  {
    id: "aluminum-glass",
    slug: "aluminum-glass",
    category: "facades",
    material: "Алюминий и стекло",
    name: "Алюминиевый профиль со стеклом",
    shortName: "Профиль + стекло",
    description: "Графичный фасад с тонкой рамой и стеклом для витрин, верхних модулей и акцентных зон.",
    priceFrom: 5000,
    priceUnit: "м²",
    image: "texture-glass",
    texture: "glass",
    features: ["алюминиевый профиль", "стеклянная вставка", "акцентная витрина"],
    application: "Витрины, верхние секции, шкафы с подсветкой.",
  },
  {
    id: "stone-veneer",
    slug: "stone-veneer",
    category: "facades",
    material: "Каменный шпон",
    name: "Каменный шпон",
    description: "Выразительная каменная поверхность для фасадов, которые становятся главным материалом интерьера.",
    priceFrom: 35000,
    priceUnit: "м²",
    image: "texture-stone",
    texture: "stone",
    features: ["натуральная каменная фактура", "выразительный рисунок", "премиальный акцент"],
    application: "Акцентные фасады, острова, панели и индивидуальные мебельные решения.",
    popular: true,
  },
  {
    id: "fenix-egger",
    slug: "fenix-egger",
    category: "facades",
    material: "Пластик",
    name: "Fenix / Egger",
    shortName: "Fenix",
    description: "Практичная современная поверхность с плотным цветом для повседневной мебели без визуального шума.",
    priceFrom: 6850,
    priceUnit: "м²",
    image: "texture-fenix",
    texture: "fenix",
    features: ["пластик Fenix или Egger", "строгий цвет", "для активного использования"],
    application: "Кухни, детские, рабочие зоны, коммерческая мебель.",
    popular: true,
  },
  {
    id: "pet",
    slug: "pet",
    category: "facades",
    material: "ПЭТ",
    name: "ПЭТ фасады",
    description: "Чистая современная поверхность для фасадов в матовом или глянцевом визуальном сценарии.",
    priceFrom: 4900,
    priceUnit: "м²",
    image: "texture-pet",
    texture: "pet",
    features: ["аккуратная поверхность", "широкие интерьерные сценарии", "понятная цена"],
    application: "Кухонные фасады, шкафы, мебель для жилых комнат.",
  },
  {
    id: "solid-wood",
    slug: "solid-wood",
    category: "facades",
    material: "Массив",
    name: "Массив дерева",
    shortName: "Массив",
    description: "Тёплая деревянная поверхность с настоящим характером материала для спокойной дорогой мебели.",
    priceFrom: 13000,
    priceUnit: "м²",
    image: "texture-wood",
    texture: "wood",
    features: ["натуральная древесина", "выраженная фактура", "индивидуальный характер"],
    application: "Кухни, буфеты, гардеробные и мебель с деревянным акцентом.",
    popular: true,
  },
  {
    id: "art-beton",
    slug: "art-beton",
    category: "facades",
    material: "ART Beton",
    name: "ART Beton",
    description: "Архитектурная бетонная фактура для фасадов и панелей с сильным современным звучанием.",
    priceFrom: 14000,
    priceUnit: "м²",
    image: "texture-beton",
    texture: "beton",
    features: ["бетонная фактура", "архитектурный вид", "для акцентных плоскостей"],
    application: "Современные кухни, ТВ-зоны, панели и мебельные композиции.",
  },
  {
    id: "natural-veneer",
    slug: "natural-veneer",
    category: "facades",
    material: "Шпон",
    name: "Шпонированные фасады",
    shortName: "Шпон",
    description: "Натуральный рисунок древесины в более лёгкой и гибкой фасадной конструкции.",
    priceFrom: 9000,
    priceUnit: "м²",
    image: "texture-veneer",
    texture: "veneer",
    features: ["натуральный шпон", "деревянный рисунок", "премиальная отделка"],
    application: "Фасады, панели, мебельные акценты в проектах с натуральной фактурой.",
    popular: true,
  },
  {
    id: "mdf-pvc",
    slug: "mdf-pvc",
    category: "facades",
    material: "МДФ в ПВХ",
    name: "МДФ в ПВХ",
    description: "Базовое фасадное решение для проектов, где важны форма, практичность и контролируемый бюджет.",
    priceFrom: 4500,
    priceUnit: "м²",
    image: "texture-pvc",
    texture: "pvc",
    features: ["МДФ основа", "ПВХ покрытие", "для разных форм фасадов"],
    application: "Кухни, шкафы, мебельные проекты с лаконичной геометрией.",
  },
  {
    id: "enamel",
    slug: "enamel",
    category: "facades",
    material: "Эмаль",
    name: "Эмаль матовая / глянцевая",
    shortName: "Эмаль",
    description: "Цвет как архитектурный инструмент: от спокойной матовой плоскости до глянцевого акцента.",
    priceFrom: 5800,
    priceUnit: "м²",
    image: "texture-enamel",
    texture: "enamel",
    features: ["матовое или глянцевое исполнение", "индивидуальный цвет", "ровная фасадная плоскость"],
    application: "Кухни, гардеробные, детские, акцентные фасады.",
    popular: true,
  },
  {
    id: "compact-plates",
    slug: "compact-plates",
    category: "countertops",
    material: "Компакт-плиты",
    name: "Компакт-плиты",
    description: "Тонкая выразительная столешница для современного интерьера и точной мебельной геометрии.",
    priceFrom: 15000,
    priceUnit: "изделие",
    image: "texture-compact",
    texture: "compact",
    features: ["тонкий профиль", "современный вид", "для столешниц и рабочих поверхностей"],
    application: "Кухонные столешницы, острова, рабочие поверхности.",
    popular: true,
  },
  {
    id: "eva-dsp",
    slug: "eva-dsp",
    category: "countertops",
    material: "EVA / ДСП",
    name: "EVA / ДСП",
    description: "Практичные столешницы для проектов, где нужна понятная стоимость и спокойный внешний вид.",
    priceFrom: 6000,
    priceUnit: "изделие",
    image: "texture-dsp",
    texture: "dsp",
    features: ["практичная основа", "несколько визуальных сценариев", "ориентир по цене из прайса"],
    application: "Столешницы, рабочие зоны, мебельные поверхности.",
  },
  {
    id: "acrylic-quartz",
    slug: "acrylic-quartz",
    category: "countertops",
    material: "Камень",
    name: "Акриловый камень / кварцевый агломерат",
    shortName: "Камень",
    description: "Каменные столешницы и сложные поверхности под проект. Стоимость зависит от материала и конфигурации.",
    priceOnRequest: true,
    image: "texture-quartz",
    texture: "quartz",
    features: ["акриловый камень", "кварцевый агломерат", "индивидуальная конфигурация"],
    application: "Столешницы, острова, интегрированные поверхности.",
  },
];

export const productCategories: Record<string, string> = {
  facades: "Мебельные фасады",
  countertops: "Столешницы",
};

export function formatPrice(product: Product) {
  if (product.priceOnRequest || !product.priceFrom) {
    return "Индивидуальный расчёт";
  }

  return `от ${product.priceFrom.toLocaleString("ru-RU")} ₽/${product.priceUnit}`;
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export const popularProducts = products.filter((product) => product.popular);
