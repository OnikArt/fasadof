import { getManagerFromCookieHeader } from "@/server/manager-auth";
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
      return Response.json(await applyVkSync({
        confirmations: payload.confirmations,
        priceStrategy: payload.priceStrategy,
        manager: { email: manager.email, name: manager.name },
      }));
    }
    return Response.json(await buildVkSyncPreview());
  } catch (error) {
    const message = error instanceof Error ? error.message : "VK sync failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
