"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BUSINESS } from "@/config/business";
import { analytics } from "@/features/analytics/analytics";
import { getAttribution } from "@/features/attribution/attribution";

type Message = {
  id?: string;
  role: "user" | "assistant" | "operator" | "system";
  content: string;
  authorName?: string | null;
};

type ChatStatus = "AI" | "WAITING_OPERATOR" | "OPERATOR" | "CLOSED";

type ChatResponse = {
  reply?: string;
  provider?: string;
  session?: {
    id: string;
    customerToken: string;
    status: ChatStatus;
    operatorName?: string | null;
  };
  messages?: Message[];
};

const quickActions = ["Подобрать фасад", "Узнать цену", "Бесплатная доставка", "Сроки", "Позвать менеджера"];
const storageKey = "fasadof_chat_session";

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Здравствуйте! Помогу подобрать материал, узнать стоимость или передать вопрос менеджеру.",
  },
];

function readStoredSession() {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as { id: string; customerToken: string };
    return parsed.id && parsed.customerToken ? parsed : null;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ChatStatus>("AI");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<{ id: string; customerToken: string } | null>(() => readStoredSession());
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const statusLabel = useMemo(() => {
    if (status === "WAITING_OPERATOR") return "Ждёт менеджера";
    if (status === "OPERATOR") return "Менеджер в чате";
    if (status === "CLOSED") return "Диалог закрыт";
    return "AI онлайн";
  }, [status]);

  useEffect(() => {
    if (!open || !session) return;
    const activeSession = session;
    let cancelled = false;

    async function poll() {
      try {
        const params = new URLSearchParams({ sessionId: activeSession.id, customerToken: activeSession.customerToken });
        const response = await fetch(`/api/chat?${params.toString()}`);
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as ChatResponse;
        applyServerState(payload);
      } catch {
        // Polling is best-effort; sending still reports explicit errors.
      }
    }

    void poll();
    const interval = window.setInterval(poll, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open, session]);

  function toggle() {
    setOpen((current) => {
      if (!current) analytics.track("chat_open");
      return !current;
    });
  }

  function applyServerState(payload: ChatResponse) {
    if (payload.session?.id && payload.session.customerToken) {
      const nextSession = { id: payload.session.id, customerToken: payload.session.customerToken };
      setSession(nextSession);
      window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
      setStatus(payload.session.status);
    }
    if (payload.messages?.length) {
      setMessages(payload.messages);
    }
  }

  async function requestOperator() {
    setLoading(true);
    analytics.track("operator_requested");
    try {
      const response = await postChat({ action: "request_operator" });
      applyServerState(response);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Не удалось передать диалог менеджеру. Попробуйте ещё раз." }]);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || status === "CLOSED") return;
    const optimistic: Message = { role: "user", content: text.trim() };
    setMessages((current) => [...current, optimistic]);
    setInput("");
    setLoading(true);
    analytics.track("chat_message", { status });

    try {
      const response = await postChat({
        action: "message",
        message: text.trim(),
        history: messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
      });
      applyServerState(response);
      if (!response.messages?.length && response.reply) {
        setMessages((current) => [...current, { role: "assistant", content: response.reply ?? "" }]);
      }
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "Помощник временно недоступен. Оставьте вопрос менеджеру." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function postChat(payload: Record<string, unknown>) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        sessionId: session?.id,
        customerToken: session?.customerToken,
        attribution: getAttribution(),
        page: window.location.pathname,
      }),
    });
    if (!response.ok) throw new Error("Chat failed");
    return (await response.json()) as ChatResponse;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className={open ? "chat-widget open" : "chat-widget"}>
      <button className="chat-toggle" onClick={toggle} type="button" aria-expanded={open} aria-label={open ? "Закрыть чат" : "Открыть чат"}>
        +
      </button>

      {open && (
        <section className="chat-panel" aria-label="ФасадоФ support-chat">
          <header>
            <span>ФАСАДОФ</span>
            <strong>{statusLabel}</strong>
            <small>Менеджеры: {BUSINESS.workingHours}</small>
          </header>

          <div className="quick-actions">
            {quickActions.map((action) => (
              <button
                disabled={loading || (action === "Позвать менеджера" && status !== "AI")}
                key={action}
                onClick={() => (action === "Позвать менеджера" ? void requestOperator() : void sendMessage(action))}
                type="button"
              >
                {action}
              </button>
            ))}
          </div>

          <div className="chat-history" aria-live="polite">
            {messages.map((message, index) => (
              <p className={message.role} key={message.id ?? `${message.role}-${index}`}>
                {message.role === "operator" && message.authorName ? `${message.authorName}: ` : ""}
                {message.content}
              </p>
            ))}
            {loading && <p className="assistant">Смотрю данные...</p>}
          </div>

          <form onSubmit={submit}>
            <input
              disabled={status === "CLOSED"}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={status === "AI" ? "Напишите вопрос" : "Сообщение менеджеру"}
            />
            <button disabled={!input.trim() || loading || status === "CLOSED"} type="submit">Отправить</button>
          </form>

          <footer>
            <button onClick={requestOperator} type="button" disabled={loading || status !== "AI"}>
              {status === "AI" ? "Позвать менеджера" : statusLabel}
            </button>
            <span>{status}</span>
          </footer>
        </section>
      )}
    </div>
  );
}
