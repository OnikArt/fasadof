import type { LeadPayload } from "@/server/leads";
import { createMaxBotClient } from "@/server/max-bot";

export async function notifyLeadInMax(lead: LeadPayload) {
  const lines = [
    "🔔 Новая заявка с сайта",
    "",
    `👤 ${lead.name || "Не указано"}`,
    `📞 ${lead.phone || "Не указан"}`,
    lead.product ? `📦 Товар: ${lead.product}` : "",
    lead.material ? `Материал: ${lead.material}` : "",
    lead.area ? `Площадь / размер: ${lead.area}` : "",
    lead.message ? `💬 ${lead.message}` : "",
    "",
    `Тип: ${lead.product || "консультация"}`,
    "Источник: fasadof36.ru",
    `Страница: ${lead.page || "/"}`,
    `Время: ${formatMoscowTime(lead.createdAt)}`,
  ].filter(Boolean);
  return sendNonCritical(lines.join("\n"), "lead");
}

export async function notifyChatMessageInMax(input: { sessionId: string; message: string; page?: string }) {
  return sendNonCritical([
    "💬 Новое сообщение в чате сайта",
    "",
    input.message,
    "",
    `Диалог: ${input.sessionId}`,
    `Страница: ${input.page || "/"}`,
    `Время: ${formatMoscowTime(new Date().toISOString())}`,
  ].join("\n"), "chat");
}

export async function notifyOperatorRequestInMax(input: { sessionId: string; page?: string }) {
  return sendNonCritical([
    "🔔 Посетитель запросил менеджера",
    "",
    `Диалог: ${input.sessionId}`,
    `Страница: ${input.page || "/"}`,
    `Время: ${formatMoscowTime(new Date().toISOString())}`,
  ].join("\n"), "operator-request");
}

async function sendNonCritical(text: string, kind: string) {
  const client = createMaxBotClient();
  if (!client.configured) return { sent: false, reason: "not-configured" as const };
  try {
    await client.sendText(text);
    return { sent: true };
  } catch (error) {
    console.error(`MAX ${kind} notification failed`, error);
    return { sent: false, reason: "delivery-failed" as const };
  }
}

function formatMoscowTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Europe/Moscow",
    }).format(date);
}
