import { appendMessage, closeConversation, getConversation, listConversations, listMessages, takeConversation, type ChatStatus } from "@/server/support-store";
import { getManagerFromCookieHeader } from "@/server/manager-auth";

async function requireManager(request: Request) {
  return getManagerFromCookieHeader(request.headers.get("cookie"));
}

export async function GET(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = (url.searchParams.get("status") || "ALL") as ChatStatus | "ALL";
  const selected = url.searchParams.get("sessionId");
  const conversations = await listConversations(status);
  const session = selected ? await getConversation(selected) : conversations[0] ?? null;
  const messages = session ? await listMessages(session.id) : [];

  return Response.json({
    manager: { email: manager.email, name: manager.name, role: manager.role },
    conversations,
    session,
    messages,
  });
}

export async function POST(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = (await request.json()) as {
    action?: "take" | "reply" | "close";
    sessionId?: string;
    message?: string;
  };

  if (!payload.sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = await getConversation(payload.sessionId);
  if (!session) return Response.json({ error: "conversation not found" }, { status: 404 });

  if (payload.action === "take") {
    await takeConversation(payload.sessionId, manager);
  } else if (payload.action === "reply") {
    if (!payload.message?.trim()) return Response.json({ error: "message is required" }, { status: 400 });
    if (session.status !== "OPERATOR") {
      await takeConversation(payload.sessionId, manager);
    }
    await appendMessage({
      sessionId: payload.sessionId,
      role: "operator",
      authorName: manager.name,
      content: payload.message.trim(),
    });
  } else if (payload.action === "close") {
    await closeConversation(payload.sessionId, manager.name);
  } else {
    return Response.json({ error: "unknown action" }, { status: 400 });
  }

  const conversations = await listConversations("ALL");
  const nextSession = await getConversation(payload.sessionId);
  const messages = await listMessages(payload.sessionId);
  return Response.json({ conversations, session: nextSession, messages });
}
