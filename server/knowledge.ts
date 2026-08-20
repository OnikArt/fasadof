import { BUSINESS } from "@/config/business";
import { faq } from "@/data/faq";
import { formatPrice, products } from "@/data/products";

export function buildKnowledgeBase() {
  return {
    brand: BUSINESS.name,
    delivery: BUSINESS.freeDelivery,
    workingHours: BUSINESS.workingHours,
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
      "Если данных нет, предложить передать вопрос менеджеру.",
      "Не отправлять внешнему AI-провайдеру телефон, email или адрес клиента без необходимости.",
    ],
  };
}
