import { claimIntegrationEvent, releaseIntegrationEvent } from "@/server/integration-store";
import { forwardVkEventToMax, type VkCallbackPayload } from "@/server/vk-callback";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as VkCallbackPayload | null;
  if (!payload?.type) return new Response("bad request", { status: 400 });

  const expectedGroupId = process.env.VK_GROUP_ID?.trim().replace(/^-/, "");
  const expectedSecret = process.env.VK_CALLBACK_SECRET?.trim();
  if (!expectedGroupId || !expectedSecret) return new Response("not configured", { status: 503 });
  if (String(payload.group_id ?? "") !== expectedGroupId || !constantEqual(payload.secret ?? "", expectedSecret)) {
    return new Response("forbidden", { status: 403 });
  }

  if (payload.type === "confirmation") {
    const confirmation = process.env.VK_CALLBACK_CONFIRMATION?.trim();
    return confirmation
      ? new Response(confirmation, { headers: { "content-type": "text/plain; charset=utf-8" } })
      : new Response("confirmation not configured", { status: 503 });
  }

  const eventId = payload.event_id || `${payload.type}:${JSON.stringify(payload.object ?? {})}`;
  const isNew = await claimIntegrationEvent("vk", eventId);
  if (isNew) {
    try {
      await forwardVkEventToMax(payload);
    } catch (error) {
      console.error("VK to MAX forwarding failed", error);
      await releaseIntegrationEvent("vk", eventId).catch(() => undefined);
      return new Response("temporary failure", { status: 503 });
    }
  }

  return new Response("ok", { headers: { "content-type": "text/plain; charset=utf-8" } });
}

function constantEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}
