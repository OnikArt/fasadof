import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { createMaxBotClient } from "@/server/max-bot";
import { integrationError } from "@/server/integration-errors";
import { rateLimit } from "@/server/rate-limit";

export async function POST(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });
  const limited = rateLimit(request, "max-test", 3, 60_000);
  if (limited) return limited;

  const client = createMaxBotClient();
  if (!client.configured) {
    return Response.json({ error: "MAX_BOT_TOKEN и MAX_CHAT_ID не настроены" }, { status: 503 });
  }

  try {
    const result = await client.sendText(`Тест уведомлений ФасадоФ\n\nИсточник: Layero\nСтатус: интеграция MAX работает\nВремя: ${new Date().toISOString()}`);
    return Response.json({ ok: true, messageId: result.message?.body?.mid ?? result.message?.id ?? null });
  } catch (error) {
    const safe = integrationError(error, "MAX");
    return Response.json({ error: safe.message, code: safe.code }, { status: 502 });
  }
}
