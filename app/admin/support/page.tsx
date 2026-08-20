import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support admin",
  description: "Панель поддержки ФасадоФ. Требует подключения настоящей backend-аутентификации.",
  robots: {
    index: false,
    follow: false,
  },
};

const demoThreads = [
  { id: "lead-1001", status: "AI", source: "VK", page: "/", time: "сегодня" },
  { id: "lead-1002", status: "WAITING_FOR_OPERATOR", source: "MAX", page: "/catalog/enamel", time: "сегодня" },
  { id: "lead-1003", status: "CLOSED", source: "Direct", page: "/catalog/stone-veneer", time: "архив" },
];

export default function AdminSupportPage() {
  return (
    <main className="admin-page section">
      <p className="eyebrow">Hidden route</p>
      <h1>Support admin</h1>
      <div className="admin-panel">
        <strong>Authentication required before production use.</strong>
        <p>
          Это архитектурный placeholder интерфейса. Нельзя считать его защищённым, пока не подключены backend auth,
          роли операторов и настоящая база диалогов.
        </p>
      </div>
      <div className="support-grid">
        {demoThreads.map((thread) => (
          <article className="admin-panel" key={thread.id}>
            <span>{thread.id}</span>
            <h2>{thread.status}</h2>
            <p>Источник: {thread.source}</p>
            <p>Страница: {thread.page}</p>
            <p>Время: {thread.time}</p>
            <div className="admin-actions">
              <button type="button">Взять диалог</button>
              <button type="button">Reply</button>
              <button type="button">Close</button>
              <button type="button">Return to AI</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
