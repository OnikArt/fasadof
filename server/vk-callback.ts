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
    const status = stringValue(object.status) || stringValue(object.display_order_id) || "без статуса";
    return [
      payload.type === "market_order_new" ? "🛒 Новый заказ VK Market" : "🛒 Заказ VK Market изменён",
      "",
      `Номер: ${orderId ?? "не указан"}`,
      `Статус: ${status}`,
      userId ? `Покупатель: ${userName}` : "",
      "",
      `[Открыть VK Market](https://vk.com/market-${groupId})`,
    ].filter(Boolean).join("\n");
  }

  if (payload.type === "lead_forms_new") {
    const formName = stringValue(object.form_name) || "Lead Ads";
    return [
      "📨 Новая заявка VK",
      "",
      `Форма: ${formName}`,
      userId ? `Пользователь: ${userName}` : "",
      "",
      `[Открыть сообщество](https://vk.com/club${groupId})`,
    ].filter(Boolean).join("\n");
  }

  const labels: Record<string, string> = {
    wall_reply_new: "Новый комментарий к записи VK",
    photo_comment_new: "Новый комментарий к фото VK",
    video_comment_new: "Новый комментарий к видео VK",
    market_comment_new: "Новый комментарий VK Market",
  };
  return [
    `🔵 ${labels[payload.type ?? ""] ?? "Новое событие VK"}`,
    "",
    `👤 ${userName}`,
    `💬 ${text}`,
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
