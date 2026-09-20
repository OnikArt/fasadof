import { buildKnowledgeBase } from "@/server/knowledge";

export async function buildSupportReply(messageValue: string) {
  const knowledge = buildKnowledgeBase();
  const message = messageValue.toLowerCase();
  const matched = knowledge.products.find((product) => (
    message.includes(product.name.toLowerCase()) || message.includes(product.material.toLowerCase())
  ));

  if (matched) {
    return `${matched.name}: ${matched.price}. ${matched.description} Для точного расчёта передам вопрос менеджеру.`;
  }

  if (message.includes("достав")) {
    if (message.includes("москв") || message.includes("друг") || message.includes("регион")) {
      return "Бесплатная доставка действует по Воронежу. Условия доставки в другой город уточнит менеджер.";
    }
    return `${knowledge.delivery}. ${knowledge.deliveryScope} Режим работы менеджеров: ${knowledge.workingHours}.`;
  }

  if (message.includes("цен") || message.includes("стоим") || message.includes("сколько")) {
    return "Цены указаны в каталоге. Для точного расчёта передайте материал, площадь и телефон менеджеру.";
  }

  return "Точную информацию уточнит менеджер. Передать ему ваш вопрос?";
}
