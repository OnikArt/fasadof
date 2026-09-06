import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { createMaxBotClient } from "@/server/max-bot";

export async function POST(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const client = createMaxBotClient();
  if (!client.configured) {
    return Response.json({ error: "MAX_BOT_TOKEN и MAX_MANAGER_CHAT_ID не настроены" }, { status: 503 });
  }

  try {
    await client.sendText("✅ Связь с сайтом ФасадоФ установлена.");
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MAX API unavailable";
    return Response.json({ error: message }, { status: 502 });
  }
}
