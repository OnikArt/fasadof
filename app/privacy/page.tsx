import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности и согласие",
  description: "Шаблон политики конфиденциальности и согласия на обработку персональных данных для сайта ФасадоФ.",
};

export default function PrivacyPage() {
  return (
    <main className="section privacy-page">
      <p className="eyebrow">Privacy</p>
      <h1>Политика и согласие</h1>
      <div className="privacy-box">
        <p>
          Этот раздел подготовлен как шаблон. Для запуска владелец бизнеса должен предоставить юридические реквизиты,
          оператора персональных данных, адрес, email для обращений и финальный текст политики.
        </p>
        <p>
          Сайт сохраняет данные заявки, страницу обращения, first-touch и last-touch attribution. AI-контекст не должен
          получать телефон, email или адрес клиента без необходимости.
        </p>
      </div>
      <a className="btn secondary" href="/">На главную</a>
    </main>
  );
}
