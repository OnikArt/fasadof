import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { createMaxBotClient } from "@/server/max-bot";
import { integrationError } from "@/server/integration-errors";

export async function POST(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const client = createMaxBotClient();
  if (!client.configured) {
    return Response.json({ error: "MAX_BOT_TOKEN и MAX_MANAGER_CHAT_ID не настроены" }, { status: 503 });
  }

  try {
    await client.sendText("✅ ФасадоФ: production-связь с MAX работает.");
    return Response.json({ ok: true });
  } catch (error) {
    const safe = integrationError(error, "MAX");
    return Response.json({ error: safe.message, code: safe.code }, { status: 502 });
  }
}
