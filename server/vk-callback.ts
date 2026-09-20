import { createMaxBotClient } from "@/server/max-bot";
import { VkClient } from "@/server/vk-client";

type VkObject = Record<string, unknown>;

export type VkCallbackPayload = {
  type?: string;
  group_id?: number;
  event_id?: string;
  secret?: string;
  object?: VkObject;
};

const supportedTypes = new Set([
  "message_new",
  "wall_reply_new",
  "photo_comment_new",
  "video_comment_new",
  "market_comment_new",
  "market_order_new",
  "market_order_edit",
  "lead_forms_new",
]);

export async function forwardVkEventToMax(payload: VkCallbackPayload) {
  if (!payload.type || !supportedTypes.has(payload.type)) return { sent: false, ignored: true };
  const vk = new VkClient();
  const formatted = await formatEvent(payload, vk);
  const max = createMaxBotClient();
  if (!max.configured) throw new Error("MAX is not configured");
  await max.sendText(formatted);
  return { sent: true, ignored: false };
}

async function formatEvent(payload: VkCallbackPayload, vk: VkClient) {
  const object = payload.object ?? {};
  const message = asObject(object.message) ?? object;
  const userId = numberValue(message.from_id) ?? numberValue(object.from_id) ?? numberValue(object.user_id);
  const userName = await vk.getUserName(userId).catch(() => userId ? `ID ${userId}` : "Пользователь");
  const text = stringValue(message.text) || stringValue(object.text) || "Без текста";
  const groupId = payload.group_id ?? Number(vk.communityId);

  if (payload.type === "message_new") {
    const peerId = numberValue(message.peer_id) ?? userId;
    return [
      "🔵 Новое сообщение VK",
      "",
      `👤 ${userName}`,
      `💬 ${text}`,
      "",
      `[Открыть диалог VK](https://vk.com/gim${groupId}?sel=${peerId ?? ""})`,
    ].join("\n");
  }

  if (payload.type === "market_order_new" || payload.type === "market_order_edit") {
    const orderId = numberValue(object.id) ?? numberValue(object.order_id);
    const status = scalarValue(object.status) || scalarValue(object.display_order_id) || "без статуса";
    const total = scalarValue(asObject(object.total_price)?.text) || scalarValue(object.total_price);
    const itemCount = Array.isArray(object.items) ? object.items.length : 0;
    return [
      "🛒 VK Market",
      "",
      `Тип: ${payload.type === "market_order_new" ? "Новый заказ" : "Заказ изменён"}`,
      `Номер: ${orderId ?? "не указан"}`,
      `Статус: ${status}`,
      total ? `Сумма: ${total}` : "",
      itemCount ? `Товаров: ${itemCount}` : "",
      userId ? `Покупатель: ${userName}` : "",
      "",
      `[Открыть VK Market](https://vk.com/market-${groupId})`,
    ].filter(Boolean).join("\n");
  }

  if (payload.type === "lead_forms_new") {
    const formName = stringValue(object.form_name) || "Lead Ads";
    const answers = summarizeLeadAnswers(object.answers);
    return [
      "📨 Новая заявка VK",
      "",
      `Форма: ${formName}`,
      userId ? `Пользователь: ${userName}` : "",
      ...answers,
      "",
      `[Открыть сообщество](https://vk.com/club${groupId})`,
    ].filter(Boolean).join("\n");
  }

  const labels: Record<string, string> = {
    wall_reply_new: "Новый комментарий VK",
    photo_comment_new: "Новый комментарий VK",
    video_comment_new: "Новый комментарий VK",
    market_comment_new: "Новый комментарий VK",
  };
  const objectLabel = commentObjectLabel(payload.type, object);
  return [
    `💬 ${labels[payload.type ?? ""] ?? "Новое событие VK"}`,
    "",
    `👤 ${userName}`,
    `💬 ${text}`,
    objectLabel ? `Объект: ${objectLabel}` : "",
    "",
    `[Открыть сообщество VK](https://vk.com/club${groupId})`,
  ].join("\n");
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as VkObject : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function scalarValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function commentObjectLabel(type: string | undefined, object: VkObject) {
  const fields: Record<string, [string, string]> = {
    wall_reply_new: ["запись", "post_id"],
    photo_comment_new: ["фото", "photo_id"],
    video_comment_new: ["видео", "video_id"],
    market_comment_new: ["товар", "item_id"],
  };
  const field = type ? fields[type] : undefined;
  if (!field) return "";
  const id = scalarValue(object[field[1]]);
  return id ? `${field[0]} #${id}` : field[0];
}

function summarizeLeadAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((answer) => {
    const item = asObject(answer);
    if (!item) return "";
    const key = stringValue(item.key) || stringValue(item.question) || stringValue(item.name) || "Ответ";
    const answerValue = scalarValue(item.answer) || scalarValue(item.value);
    return answerValue ? `${key}: ${answerValue}` : "";
  }).filter(Boolean);
}
