import type { Metadata } from "next";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = {
  title: "Политика конфиденциальности и согласие",
  description: "Политика обработки персональных данных и согласие посетителей сайта ФасадоФ.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="section privacy-page">
      <p className="eyebrow">Privacy</p>
      <h1>Политика и согласие</h1>
      <div className="privacy-box">
        <section>
          <h2>Какие данные обрабатываются</h2>
          <p>При отправке заявки сайт получает имя, телефон, комментарий, выбранный материал и технические сведения об источнике обращения.</p>
        </section>
        <section>
          <h2>Для чего нужны данные</h2>
          <p>Данные используются только для ответа на обращение, подготовки расчёта, связи с клиентом и оценки работы сайта.</p>
        </section>
        <section>
          <h2>Передача и хранение</h2>
          <p>Обращения хранятся в защищённом хранилище сайта и могут передаваться используемому сервису поддержки для связи с менеджером. Данные не публикуются и не используются для целей, не связанных с обращением.</p>
        </section>
        <section>
          <h2>Согласие и отзыв</h2>
          <p>Отправляя форму и отмечая согласие, посетитель подтверждает добровольную передачу указанных данных. Запрос на уточнение или удаление можно направить по адресу <a href={BUSINESS.emailHref}>{BUSINESS.email}</a> либо по телефону <a href={BUSINESS.phone.href}>{BUSINESS.phone.display}</a>.</p>
        </section>
        <section>
          <h2>Контакты</h2>
          <p>{BUSINESS.name}, {BUSINESS.address}. По вопросам обработки персональных данных напишите на <a href={BUSINESS.emailHref}>{BUSINESS.email}</a> или позвоните по номеру <a href={BUSINESS.phone.href}>{BUSINESS.phone.display}</a>.</p>
        </section>
      </div>
      <a className="btn secondary" href="/">На главную</a>
    </main>
  );
}
