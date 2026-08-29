import { BUSINESS } from "@/config/business";
import { faq } from "@/data/faq";
import { formatPrice, products } from "@/data/products";

export function buildKnowledgeBase() {
  return {
    brand: BUSINESS.name,
    delivery: BUSINESS.delivery.label,
    deliveryScope: "Бесплатная доставка действует только по городу Воронеж. Для других городов условия уточняет менеджер.",
    workingHours: BUSINESS.workingHours.label,
    phone: BUSINESS.phone.display,
    email: BUSINESS.email,
    address: BUSINESS.address,
    products: products.map((product) => ({
      name: product.name,
      material: product.material,
      category: product.category,
      price: formatPrice(product),
      description: product.description,
      features: product.features ?? [],
    })),
    faq,
    guardrails: [
      "Не придумывать цены, сроки, наличие, гарантию и технические характеристики.",
      "Не утверждать бесплатную доставку за пределами Воронежа.",
      "Если данных нет, предложить передать вопрос менеджеру.",
      "Не отправлять внешнему AI-провайдеру телефон, email или адрес клиента без необходимости.",
    ],
  };
}
