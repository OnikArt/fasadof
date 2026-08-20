"use client";

import { FormEvent, useState } from "react";
import { analytics } from "@/features/analytics/analytics";
import { getAttribution } from "@/features/attribution/attribution";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type ChatMode = "AI" | "WAITING_FOR_OPERATOR" | "OPERATOR" | "CLOSED";

const quickActions = ["Подобрать фасад", "Узнать цену", "Бесплатная доставка", "Сроки", "Связаться с менеджером"];

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("AI");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Здравствуйте! Помогу подобрать материал, узнать стоимость или передать вопрос менеджеру.",
    },
  ]);

  function toggle() {
    setOpen((current) => {
      if (!current) analytics.track("chat_open");
      return !current;
    });
  }

  function requestOperator() {
    setMode("WAITING_FOR_OPERATOR");
    analytics.track("operator_requested");
    setMessages((current) => [
      ...current,
      { role: "assistant", text: "Передаю диалог менеджеру. AI-ответы остановлены до возврата в режим помощника." },
    ]);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || mode !== "AI") return;
    const nextMessages = [...messages, { role: "user" as const, text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    analytics.track("chat_message", { mode });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.map((message) => ({ role: message.role, content: message.text })),
          attribution: getAttribution(),
          page: window.location.pathname,
        }),
      });

      if (!response.ok) throw new Error("Chat failed");
      const payload = (await response.json()) as { reply: string };
      setMessages((current) => [...current, { role: "assistant", text: payload.reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: "AI сейчас недоступен. Точную информацию лучше уточнить у менеджера. Передать вопрос?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className={open ? "chat-widget open" : "chat-widget"}>
      <button className="chat-toggle" onClick={toggle} type="button" aria-expanded={open} aria-label={open ? "Закрыть чат" : "Открыть чат"}>
        {open ? "Закрыть" : "+"}
      </button>

      {open && (
        <section className="chat-panel" aria-label="ФасадоФ ИИ-помощник">
          <header>
            <span>ФАСАДОФ</span>
            <strong>ИИ-ПОМОЩНИК</strong>
          </header>

          <div className="quick-actions">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => (action === "Связаться с менеджером" ? requestOperator() : void sendMessage(action))}
                type="button"
              >
                {action}
              </button>
            ))}
          </div>

          <div className="chat-history" aria-live="polite">
            {messages.map((message, index) => (
              <p className={message.role} key={`${message.role}-${index}`}>{message.text}</p>
            ))}
            {loading && <p className="assistant">Смотрю данные каталога...</p>}
          </div>

          <form onSubmit={submit}>
            <input
              disabled={mode !== "AI"}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={mode === "AI" ? "Напишите вопрос" : "Ожидается менеджер"}
            />
            <button disabled={mode !== "AI" || loading} type="submit">Отправить</button>
          </form>

          <footer>
            <button onClick={requestOperator} type="button" disabled={mode !== "AI"}>Позвать менеджера</button>
            <span>{mode}</span>
          </footer>
        </section>
      )}
    </div>
  );
}
