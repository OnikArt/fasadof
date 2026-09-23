import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { getLead, type LeadStatus } from "@/server/lead-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Заявка", robots: { index: false, follow: false } };

const statusNames: Record<LeadStatus, string> = { NEW: "Новая", IN_PROGRESS: "В работе", DONE: "Завершена", REJECTED: "Отменена" };

export default async function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const manager = await getManagerFromCookieHeader((await headers()).get("cookie"));
  if (!manager) redirect("/admin/login");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const lead = await getLead(id);
  if (!lead) notFound();

  return <main className="admin-page lead-details-page"><section className="admin-wide-panel"><a className="product-back-button" href="/admin/support">← К заявкам</a><header><div><p className="eyebrow">Новая заявка</p><h1>Заявка #{lead.id}</h1></div><strong className={`lead-status status-${lead.status.toLowerCase()}`}>{statusNames[lead.status]}</strong></header><dl className="lead-details-grid"><div><dt>Имя</dt><dd>{lead.name}</dd></div><div><dt>Телефон</dt><dd><a href={`tel:${lead.phone}`}>{lead.phone}</a></dd></div><div><dt>Категория</dt><dd>{lead.product || lead.material || "Не указана"}</dd></div><div className="span-2"><dt>Сообщение клиента</dt><dd>{lead.message || "Без сообщения"}</dd></div><div><dt>Источник</dt><dd>{lead.source || lead.page || "Direct"}</dd></div><div><dt>Дата</dt><dd>{new Date(lead.createdAt).toLocaleString("ru-RU")}</dd></div><div><dt>Ответственный менеджер</dt><dd>{manager.name}</dd></div><div><dt>Статус</dt><dd>{statusNames[lead.status]}</dd></div></dl></section></main>;
}
