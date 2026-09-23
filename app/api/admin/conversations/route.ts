import { appendMessage, archiveConversation, clearConversationMessages, closeConversation, deleteConversation, getConversation, listConversations, listMessages, takeConversation, type ChatStatus } from "@/server/support-store";
import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { notifyAdminActionInMax } from "@/server/notifications";

async function requireManager(request: Request) {
  return getManagerFromCookieHeader(request.headers.get("cookie"));
}

function withPermissions<T extends { status: string; operatorId: string | null }>(conversation: T, manager: { id?: string; email: string }) {
  const assigned = conversation.operatorId?.trim().toLowerCase();
  const identities = [manager.id, manager.email].filter(Boolean).map((value) => value!.trim().toLowerCase());
  const isAssignedManager = Boolean(assigned && identities.includes(assigned));
  return {
    ...conversation,
    canReply: conversation.status === "IN_PROGRESS" && isAssignedManager,
    canClose: conversation.status === "IN_PROGRESS" && isAssignedManager,
  };
}

export async function GET(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = (url.searchParams.get("status") || "ALL") as ChatStatus | "ALL";
  const selected = url.searchParams.get("sessionId");
  const includeArchived = url.searchParams.get("archived") === "1";
  const storedConversations = await listConversations(status, includeArchived);
  const storedSession = selected ? await getConversation(selected) : storedConversations[0] ?? null;
  const conversations = storedConversations.map((conversation) => withPermissions(conversation, manager));
  const session = storedSession ? withPermissions(storedSession, manager) : null;
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

  const payload = (await request.json().catch(() => null)) as {
    action?: "take" | "reply" | "close" | "clear" | "archive" | "delete";
    sessionId?: string;
    message?: string;
  } | null;

  if (!payload) return Response.json({ error: "Invalid JSON payload" }, { status: 400 });

  if (!payload.sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = await getConversation(payload.sessionId);
  if (!session) return Response.json({ error: "conversation not found" }, { status: 404 });

  if (payload.action === "take") {
    await takeConversation(payload.sessionId, manager);
    await notifyAdminActionInMax({ title: "Диалог взят в работу", employee: manager.name });
  } else if (payload.action === "reply") {
    if (!payload.message?.trim()) return Response.json({ error: "message is required" }, { status: 400 });
    if (session.status !== "IN_PROGRESS") {
      await takeConversation(payload.sessionId, manager);
    }
    const assigned = await getConversation(payload.sessionId);
    if (!assigned || !withPermissions(assigned, manager).canReply) return Response.json({ error: "Диалог назначен другому менеджеру" }, { status: 409 });
    await appendMessage({
      sessionId: payload.sessionId,
      role: "operator",
      authorName: manager.name,
      content: payload.message.trim(),
    });
  } else if (payload.action === "close") {
    if (!withPermissions(session, manager).canClose) return Response.json({ error: "Закрыть диалог может только назначенный менеджер" }, { status: 409 });
    const closed = await closeConversation(payload.sessionId, manager.name);
    if (!closed) return Response.json({ error: "Диалог уже закрыт" }, { status: 409 });
    await notifyAdminActionInMax({ title: "Диалог закрыт", employee: manager.name });
  } else if (payload.action === "clear") {
    await clearConversationMessages(payload.sessionId);
  } else if (payload.action === "archive") {
    await archiveConversation(payload.sessionId);
  } else if (payload.action === "delete") {
    if (manager.role !== "ADMIN" && manager.role !== "admin") return Response.json({ error: "Только администратор может удалить диалог" }, { status: 403 });
    await deleteConversation(payload.sessionId);
  } else {
    return Response.json({ error: "unknown action" }, { status: 400 });
  }

  const conversations = (await listConversations("ALL")).map((conversation) => withPermissions(conversation, manager));
  const storedNextSession = payload.action === "delete" || payload.action === "archive" ? null : await getConversation(payload.sessionId);
  const nextSession = storedNextSession ? withPermissions(storedNextSession, manager) : null;
  const messages = nextSession ? await listMessages(payload.sessionId) : [];
  return Response.json({ conversations, session: nextSession, messages });
}
