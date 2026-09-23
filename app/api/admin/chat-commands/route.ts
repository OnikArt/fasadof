import { deleteChatCommand, listChatCommands, saveChatCommand } from "@/server/support-store";
import { getManagerFromCookieHeader } from "@/server/manager-auth";

async function requireAdmin(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  return manager && (manager.role === "ADMIN" || manager.role === "admin") ? manager : null;
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({ commands: await listChatCommands() });
}

export async function POST(request: Request) { return persist(request); }
export async function PATCH(request: Request) { return persist(request); }

export async function DELETE(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  await deleteChatCommand(id);
  return Response.json({ commands: await listChatCommands() });
}

async function persist(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const payload = await request.json().catch(() => null) as { id?: string; name?: string; command?: string; response?: string; enabled?: boolean } | null;
  if (!payload?.name || !payload.command || !payload.response) return Response.json({ error: "Заполните название, команду и ответ" }, { status: 400 });
  try {
    await saveChatCommand({ id: payload.id, name: payload.name, command: payload.command, response: payload.response, enabled: payload.enabled });
    return Response.json({ commands: await listChatCommands() }, { status: payload.id ? 200 : 201 });
  } catch {
    return Response.json({ error: "Команда должна быть уникальной и начинаться с /" }, { status: 400 });
  }
}
