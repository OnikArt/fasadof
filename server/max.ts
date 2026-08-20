export type MaxLeadNotification = {
  name: string;
  phone: string;
  material: string;
  area: string;
  message: string;
  page: string;
  source?: string;
  campaign?: string;
};

export async function notifyMax(
  lead: MaxLeadNotification,
  env: { MAX_BOT_TOKEN?: string | undefined; MAX_CHAT_ID?: string | undefined },
) {
  if (!env.MAX_BOT_TOKEN || !env.MAX_CHAT_ID) {
    return { sent: false, reason: "MAX credentials are not configured" };
  }

  const text = [
    "Новая заявка - ФасадоФ",
    "",
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    `Материал: ${lead.material || "не указан"}`,
    `Площадь: ${lead.area || "не указана"}`,
    `Сообщение: ${lead.message || "нет"}`,
    "",
    `Источник: ${lead.source || "не определён"}`,
    `Campaign: ${lead.campaign || "нет"}`,
    `Страница: ${lead.page}`,
  ].join("\n");

  const response = await fetch("https://botapi.max.ru/messages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.MAX_BOT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: env.MAX_CHAT_ID,
      text,
    }),
  });

  return { sent: response.ok, reason: response.ok ? undefined : "MAX API request failed" };
}
