import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = {
  title: "Контакты",
  description: `${BUSINESS.name}: ${BUSINESS.address}, телефон ${BUSINESS.phone.display}, ${BUSINESS.delivery.label}.`,
  alternates: {
    canonical: "/contacts",
  },
};

export default function ContactsPage() {
  return (
    <>
      <SiteHeader />
      <main className="section contacts-page">
        <div className="contact-grid">
          <article className="contact-panel">
            <p className="eyebrow">Контакты</p>
            <h1>Связаться с ФасадоФ</h1>
            <p>{BUSINESS.address}</p>
            <p><a href={BUSINESS.phone.href}>{BUSINESS.phone.display}</a></p>
            <p><a href={BUSINESS.emailHref}>{BUSINESS.email}</a></p>
            <p>{BUSINESS.workingHours.label}</p>
            <div className="social-links" aria-label="Социальные сети">
              <a href={BUSINESS.socials.vk} target="_blank" rel="noreferrer">VK</a>
              <a href={BUSINESS.socials.max} target="_blank" rel="noreferrer">MAX</a>
              <a href={BUSINESS.socials.yandexMaps} target="_blank" rel="noreferrer">Яндекс Карты</a>
            </div>
          </article>
          <article className="contact-panel pink">
            <strong>{BUSINESS.delivery.label}</strong>
            <span>{BUSINESS.workingHours.short}</span>
            <span>{BUSINESS.workingHours.weekend}</span>
            <p>AI-помощник доступен на сайте. Менеджеры отвечают в рабочее время.</p>
          </article>
        </div>
      </main>
    </>
  );
}
