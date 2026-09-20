import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { getDatabase } from "@/server/database";
import { integrationError } from "@/server/integration-errors";

export async function GET(request: Request) {
  const headers = { "cache-control": "no-store" };
  try {
    const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
    if (!manager) return Response.json({ error: "Forbidden" }, { status: 403, headers });
    const db = await getDatabase();
    const row = await db?.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    return Response.json({
      database: row?.ok === 1 ? "ok" : "unavailable",
      vkConfigured: Boolean(process.env.VK_GROUP_ID?.trim() && process.env.VK_ACCESS_TOKEN?.trim()),
      maxConfigured: Boolean(process.env.MAX_BOT_TOKEN?.trim() && process.env.MAX_MANAGER_CHAT_ID?.trim()),
    }, { headers });
  } catch (error) {
    return Response.json({ error: "Диагностика недоступна", code: integrationError(error, "server").code }, { status: 503, headers });
  }
}
