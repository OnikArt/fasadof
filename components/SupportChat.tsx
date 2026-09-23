"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { analytics } from "@/features/analytics/analytics";
import { getAttribution } from "@/features/attribution/attribution";
import { usePathname } from "next/navigation";

type Message = { id: string; role: "user" | "assistant" | "operator" | "system"; content: string; authorName: string | null; createdAt: string };
type Session = { id: string; customerToken: string; status: "NEW" | "WAITING_MANAGER" | "IN_PROGRESS" | "CLOSED"; operatorName: string | null };
type ChatResponse = { session: Session; messages: Message[]; managerOnline?: boolean; error?: string };

const STORAGE_KEY = "fasadof_support_session";

export function SupportChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [managerOnline, setManagerOnline] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rated, setRated] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const applyResponse = useCallback((payload: ChatResponse) => {
    setSession(payload.session);
    setMessages(payload.messages ?? []);
    setManagerOnline(Boolean(payload.managerOnline));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: payload.session.id, customerToken: payload.session.customerToken }));
  }, []);

  const poll = useCallback(async () => {
    const saved = readSavedSession();
    if (!saved) return;
    const params = new URLSearchParams(saved);
    const response = await fetch(`/api/chat?${params}`, { cache: "no-store" });
    if (response.status === 404) {
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
      setMessages([]);
      return;
    }
    if (response.ok) applyResponse(await response.json() as ChatResponse);
  }, [applyResponse]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void poll();
    const timer = window.setInterval(poll, 5_000);
    return () => window.clearInterval(timer);
  }, [open, poll]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    document.body.classList.toggle("chat-lock", open);
    return () => document.body.classList.remove("chat-lock");
  }, [open]);

  async function action(actionName: "message" | "request_operator", content?: string) {
    setLoading(true);
    setError("");
    try {
      const saved = readSavedSession();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: actionName,
          message: content,
          sessionId: saved?.sessionId,
          customerToken: saved?.customerToken,
          page: window.location.pathname,
          attribution: getAttribution(),
        }),
      });
      const payload = await response.json() as ChatResponse;
      if (!response.ok || !payload.session) throw new Error(payload.error || "Не удалось связаться с поддержкой");
      applyResponse(payload);
      analytics.track(actionName === "message" ? "chat_message" : "operator_requested");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Чат временно недоступен");
    } finally {
      setLoading(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const value = message.trim();
    if (!value) return;
    setMessage("");
    await action("message", value);
  }

  async function rate(value: number) {
    if (!session) return;
    const response = await fetch("/api/chat/rating", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: session.id, customerToken: session.customerToken, rating: value, comment: ratingComment.trim() }),
    });
    if (response.ok) setRated(true);
    else setError("Не удалось сохранить оценку.");
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="support-chat-root">
      {open && (
        <section className="support-chat-window" aria-label="Чат с ФасадоФ">
          <header>
            <div><strong>ФасадоФ</strong><span>{session?.operatorName ? `Вам отвечает: ${session.operatorName}` : managerOnline ? "Менеджер в сети" : "Помощник на связи"}</span></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть чат">×</button>
          </header>
          <div className="support-chat-messages" ref={listRef}>
            {messages.length === 0 && <div className="chat-welcome"><strong>Добрый день!</strong><p>Поможем с выбором фасадов и столешниц. Напишите вопрос.</p></div>}
            {messages.map((item) => (
              <article className={`chat-message ${item.role}`} key={item.id}>
                {(item.authorName || item.role === "assistant") && <small>{item.authorName || "Помощник"}</small>}
                <p>{item.content}</p>
                <time>{new Date(item.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</time>
              </article>
            ))}
            {loading && <div className="chat-typing" role="status">Печатаем…</div>}
          </div>
          {session?.status === "CLOSED" ? (
            <div className="chat-rating">
              {rated ? <strong>Спасибо за оценку!</strong> : <><span>Оцените консультацию</span><div>{[1, 2, 3, 4, 5].map((value) => <button className={rating >= value ? "active" : ""} type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} из 5`}>★</button>)}</div><textarea value={ratingComment} onChange={(event) => setRatingComment(event.target.value)} placeholder="Комментарий (необязательно)" rows={2} maxLength={1000} /><button className="chat-rate-submit" type="button" disabled={!rating} onClick={() => void rate(rating)}>Отправить оценку</button></>}
              <button className="chat-new" type="button" onClick={() => { localStorage.removeItem(STORAGE_KEY); setSession(null); setMessages([]); setRated(false); setRating(0); setRatingComment(""); }}>Новый диалог</button>
            </div>
          ) : (
            <>
              <form className="support-chat-form" onSubmit={send}>
                <textarea aria-label="Сообщение" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ваш вопрос…" rows={2} maxLength={2000} />
                <button type="submit" disabled={loading || !message.trim()} aria-label="Отправить">→</button>
              </form>
              {session?.status !== "WAITING_MANAGER" && session?.status !== "IN_PROGRESS" && <button className="request-operator" type="button" disabled={loading} onClick={() => void action("request_operator")}>Позвать менеджера</button>}
            </>
          )}
          {error && <p className="chat-error" role="alert">{error}</p>}
        </section>
      )}
      <button className="support-chat-launcher" type="button" aria-expanded={open} aria-label={open ? "Закрыть чат" : "Открыть чат"} onClick={() => { setOpen((value) => !value); if (!open) analytics.track("chat_open"); }}>
        {open ? "×" : <><span aria-hidden="true">↗</span><b>Написать</b></>}
      </button>
    </div>
  );
}

function readSavedSession(): { sessionId: string; customerToken: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as { sessionId?: string; customerToken?: string } | null;
    return value?.sessionId && value.customerToken ? { sessionId: value.sessionId, customerToken: value.customerToken } : null;
  } catch {
    return null;
  }
}
