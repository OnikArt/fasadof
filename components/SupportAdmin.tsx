"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatStatus = "AI" | "WAITING_OPERATOR" | "OPERATOR" | "CLOSED";

type Conversation = {
  id: string;
  status: ChatStatus;
  page: string;
  source: string;
  operatorName?: string | null;
  updatedAt: string;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "operator" | "system";
  content: string;
  authorName?: string | null;
  createdAt: string;
};

type AdminPayload = {
  conversations: Conversation[];
  session: Conversation | null;
  messages: Message[];
};

const statuses: { value: ChatStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "WAITING_OPERATOR", label: "Ждут менеджера" },
  { value: "OPERATOR", label: "В работе" },
  { value: "AI", label: "AI" },
  { value: "CLOSED", label: "Закрытые" },
];

export function SupportAdmin({ managerName }: { managerName: string }) {
  const [status, setStatus] = useState<ChatStatus | "ALL">("WAITING_OPERATOR");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const currentId = selectedId ?? selected?.id ?? "";
  const groupedCount = useMemo(() => {
    return conversations.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [conversations]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const params = new URLSearchParams({ status });
        if (selectedId) params.set("sessionId", selectedId);
        const response = await fetch(`/api/admin/conversations?${params.toString()}`, { credentials: "include" });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as AdminPayload;
        setConversations(payload.conversations);
        setSelected(payload.session);
        setMessages(payload.messages);
        if (!selectedId && payload.session?.id) setSelectedId(payload.session.id);
      } catch {
        if (!cancelled) setError("Не удалось загрузить диалоги.");
      }
    }

    void load();
    const interval = window.setInterval(load, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedId, status]);

  async function runAction(action: "take" | "reply" | "close", message = "") {
    if (!currentId) return;
    setError("");
    try {
      const response = await fetch("/api/admin/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, sessionId: currentId, message }),
      });
      if (!response.ok) throw new Error("Action failed");
      const payload = (await response.json()) as AdminPayload;
      setConversations(payload.conversations);
      setSelected(payload.session);
      setMessages(payload.messages);
      if (!selectedId && payload.session?.id) setSelectedId(payload.session.id);
      if (action === "reply") setReply("");
    } catch {
      setError("Действие не выполнено. Проверьте сессию менеджера.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    window.location.assign("/admin/login");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAction("reply", reply);
  }

  return (
    <div className="support-admin">
      <aside className="support-sidebar">
        <div>
          <p className="eyebrow">Менеджер</p>
          <h1>{managerName}</h1>
        </div>
        <div className="support-status-list" role="tablist" aria-label="Статусы диалогов">
          {statuses.map((item) => (
            <button
              aria-selected={status === item.value}
              className={status === item.value ? "active" : ""}
              key={item.value}
              onClick={() => {
                setStatus(item.value);
                setSelectedId(null);
              }}
              role="tab"
              type="button"
            >
              {item.label}
              <span>{item.value === "ALL" ? conversations.length : groupedCount[item.value] ?? 0}</span>
            </button>
          ))}
        </div>
        <button className="btn secondary" onClick={logout} type="button">Выйти</button>
      </aside>

      <section className="conversation-list" aria-label="Список диалогов">
        {conversations.length > 0 ? conversations.map((conversation) => (
          <button
            className={conversation.id === currentId ? "conversation-card active" : "conversation-card"}
            key={conversation.id}
            onClick={() => setSelectedId(conversation.id)}
            type="button"
          >
            <span>{conversation.status}</span>
            <strong>{conversation.source}</strong>
            <small>{conversation.page || "/"}</small>
          </button>
        )) : (
          <div className="empty-state">
            <strong>Очередь пуста.</strong>
            <p>Новые обращения появятся здесь после запроса менеджера в виджете.</p>
          </div>
        )}
      </section>

      <section className="conversation-panel" aria-label="Диалог">
        {selected ? (
          <>
            <header>
              <div>
                <p className="eyebrow">{selected.status}</p>
                <h2>{selected.source}</h2>
                <span>{selected.page || "/"}</span>
              </div>
              <div className="admin-actions">
                <button onClick={() => void runAction("take")} type="button" disabled={selected.status === "OPERATOR"}>Взять диалог</button>
                <button onClick={() => void runAction("close")} type="button" disabled={selected.status === "CLOSED"}>Закрыть</button>
              </div>
            </header>

            <div className="admin-chat-history" aria-live="polite">
              {messages.map((message) => (
                <p className={message.role} key={message.id}>
                  {message.role === "operator" && message.authorName ? `${message.authorName}: ` : ""}
                  {message.content}
                </p>
              ))}
            </div>

            <form className="admin-reply-form" onSubmit={submit}>
              <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Ответ менеджера" />
              <button className="btn primary" disabled={!reply.trim() || selected.status === "CLOSED"} type="submit">Отправить</button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <strong>Выберите диалог.</strong>
            <p>Можно отвечать, брать в работу и закрывать обращения.</p>
          </div>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
