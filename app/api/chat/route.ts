import { rateLimit } from "@/server/rate-limit";
import { notifyChatMessageInMax, notifyOperatorRequestInMax } from "@/server/notifications";
import { buildSupportReply } from "@/server/support-responder";
import {
  appendMessage,
  getCustomerSession,
  getOrCreateCustomerSession,
  hasOnlineManagers,
  listCustomerMessages,
  resumeTimedOutWaitingSessions,
  requestOperator,
} from "@/server/support-store";

type ChatPayload = {
  action?: "message" | "request_operator" | "poll";
  message?: string;
  sessionId?: string;
  customerToken?: string;
  page?: string;
  attribution?: unknown;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const customerToken = url.searchParams.get("customerToken");

  if (!sessionId || !customerToken) {
    return Response.json({ error: "sessionId and customerToken are required" }, { status: 400 });
  }

  const session = await getCustomerSession(sessionId, customerToken);
  if (!session) return Response.json({ error: "conversation not found" }, { status: 404 });

  const messages = await listCustomerMessages(sessionId, customerToken);
  return Response.json({ session, messages: messages ?? [], managerOnline: await hasOnlineManagers() });
}

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, "chat", 40, 60_000);
    if (limited) return limited;

    const payload = (await request.json()) as ChatPayload;
    await resumeTimedOutWaitingSessions();
    const action = payload.action ?? "message";
    const session = await getOrCreateCustomerSession({
      sessionId: payload.sessionId,
      customerToken: payload.customerToken,
      page: payload.page,
      attribution: payload.attribution,
    });

    if (action === "poll") {
      return Response.json({ session, messages: await listCustomerMessages(session.id, session.customerToken), managerOnline: await hasOnlineManagers() });
    }

    if (action === "request_operator") {
      await requestOperator(session.id);
      await notifyOperatorRequestInMax({ sessionId: session.id, page: session.page });
      const messages = await listCustomerMessages(session.id, session.customerToken);
      return Response.json({
        session: { ...session, status: "WAITING_OPERATOR" },
        messages,
        managerOnline: await hasOnlineManagers(),
        reply: "Передал диалог менеджеру. Ваши сообщения сохраняются в очереди поддержки.",
      });
    }

    if (!payload.message?.trim()) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    await appendMessage({ sessionId: session.id, role: "user", content: payload.message.trim() });
    await notifyChatMessageInMax({ sessionId: session.id, message: payload.message.trim(), page: session.page });

    if (session.status === "WAITING_OPERATOR" || session.status === "OPERATOR" || session.status === "CLOSED") {
      const messages = await listCustomerMessages(session.id, session.customerToken);
      const reply = session.status === "CLOSED"
        ? "Диалог закрыт. Если вопрос актуален, начните новый чат."
        : "Сообщение передано менеджеру.";
      return Response.json({ session, messages, managerOnline: await hasOnlineManagers(), reply });
    }

    const reply = await buildSupportReply(payload.message);
    await appendMessage({ sessionId: session.id, role: "assistant", content: reply });

    const messages = await listCustomerMessages(session.id, session.customerToken);
    return Response.json({ session, messages, managerOnline: await hasOnlineManagers(), reply, responder: "knowledge" });
  } catch {
    return Response.json(
      { reply: "Помощник временно недоступен. Оставьте вопрос менеджеру." },
      { status: 503 },
    );
  }
}
