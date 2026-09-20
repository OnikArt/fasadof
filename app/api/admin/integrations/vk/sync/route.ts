import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { integrationError } from "@/server/integration-errors";
import { notifyVkSyncInMax } from "@/server/notifications";
import { applyVkSync, buildVkSyncPreview, type VkSyncPriceStrategy } from "@/server/vk-product-sync";

export async function POST(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });
  const payload = await request.json().catch(() => ({})) as {
    action?: "preview" | "apply";
    confirmations?: Record<string, string>;
    priceStrategy?: VkSyncPriceStrategy;
  };

  try {
    if (payload.action === "apply") {
      const result = await applyVkSync({
        confirmations: payload.confirmations,
        priceStrategy: payload.priceStrategy,
        manager: { email: manager.email, name: manager.name },
      });
      const max = await notifyVkSyncInMax(result.summary);
      return Response.json({ ...result, maxNotified: max.sent });
    }
    return Response.json(await buildVkSyncPreview());
  } catch (error) {
    const safe = integrationError(error, "VK");
    return Response.json({ error: safe.message, code: safe.code }, { status: 502 });
  }
}
