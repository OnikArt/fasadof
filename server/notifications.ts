import type { LeadPayload } from "@/server/leads";
import { createMaxBotClient } from "@/server/max-bot";
import { integrationLog } from "@/server/integration-errors";

export async function notifyLeadInMax(lead: LeadPayload, _leadId?: number) {
  void _leadId;
  const interest = [lead.product, lead.material, lead.area].filter(Boolean).join(" · ");
  const lines = [
    "🟢 Новая заявка с сайта",
    "",
    `👤 Клиент:\n${lead.name || "Не указано"}`,
    `📞 Телефон:\n${lead.phone || "Не указан"}`,
    lead.email ? `✉️ Email:\n${lead.email}` : "",
    interest ? `📦 Интерес:\n${interest}` : "",
    lead.message ? `💬 Сообщение:\n${lead.message}` : "",
    "",
    "Источник: fasadof36.ru",
    `Страница: ${lead.page || "/"}`,
    `UTM: ${formatUtm(lead)}`,
    `🕒 Время:\n${formatMoscowTime(lead.createdAt)}`,
  ].filter(Boolean);
  return sendNonCritical(lines.join("\n"), "lead", {
    linkButton: { text: "Открыть админку", url: "https://fasadof36.ru/admin/support" },
  });
}

export async function notifyLeadDeletionInMax(input: {
  leadId: number;
  previousStatus: string;
  employeeName: string;
  deletedAt: string;
}) {
  return sendNonCritical([
    `Заявка #${input.leadId} удалена`,
    "",
    `Статус перед удалением: ${input.previousStatus === "DONE" ? "Завершена" : "Отклонена"}`,
    `Сотрудник: ${input.employeeName}`,
    `Время: ${formatMoscowTime(input.deletedAt)}`,
  ].join("\n"), "lead-delete");
}

export async function notifyChatMessageInMax(input: { sessionId: string; message: string; page?: string }) {
  return sendNonCritical([
    "💬 Новое сообщение в чате сайта",
    "",
    input.message,
    "",
    `Страница: ${input.page || "/"}`,
    `Время: ${formatMoscowTime(new Date().toISOString())}`,
  ].join("\n"), "chat");
}

export async function notifyOperatorRequestInMax(input: { sessionId: string; page?: string }) {
  return sendNonCritical([
    "🔔 Посетитель запросил менеджера",
    "",
    `Страница: ${input.page || "/"}`,
    `Время: ${formatMoscowTime(new Date().toISOString())}`,
  ].join("\n"), "operator-request");
}

export async function notifyAdminActionInMax(input: { title: string; subject?: string; employee: string; details?: string }) {
  return sendNonCritical([
    `⚙️ ${input.title}`,
    "",
    input.subject ? `📌 ${input.subject}` : "",
    input.details || "",
    `👤 Сотрудник: ${input.employee}`,
    `🕒 Время: ${formatMoscowTime(new Date().toISOString())}`,
  ].filter(Boolean).join("\n"), "admin-action");
}

export async function notifyVkSyncInMax(summary: { created: number; enriched: number; unchanged: number; review: number; errors: number; images: number }) {
  return sendNonCritical([
    "✅ Каталог ФасадоФ синхронизирован",
    "",
    `Создано: ${summary.created}`,
    `Дополнено: ${summary.enriched}`,
    `Без изменений: ${summary.unchanged}`,
    `Требуют проверки: ${summary.review}`,
    `Ошибок: ${summary.errors}`,
    `Изображений: ${summary.images}`,
  ].join("\n"), "vk-sync");
}

async function sendNonCritical(text: string, kind: string, options?: Parameters<ReturnType<typeof createMaxBotClient>["sendText"]>[1]) {
  const client = createMaxBotClient();
  if (!client.configured) return { sent: false, reason: "not-configured" as const };
  const started = Date.now();
  try {
    await client.sendText(text, options);
    return { sent: true };
  } catch (error) {
    integrationLog("max", kind, started, error);
    return { sent: false, reason: "delivery-failed" as const };
  }
}

function formatUtm(lead: LeadPayload) {
  const touch = lead.attribution?.lastTouch ?? lead.attribution?.firstTouch;
  if (!touch) return "нет";
  const values = [
    touch.utm_source && `source=${touch.utm_source}`,
    touch.utm_medium && `medium=${touch.utm_medium}`,
    touch.utm_campaign && `campaign=${touch.utm_campaign}`,
    touch.utm_content && `content=${touch.utm_content}`,
    touch.utm_term && `term=${touch.utm_term}`,
  ].filter(Boolean);
  return values.length ? values.join(", ") : "нет";
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
