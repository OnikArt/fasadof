"use client";

import { FormEvent, useMemo, useState } from "react";
import { analytics } from "@/features/analytics/analytics";
import { getAttribution } from "@/features/attribution/attribution";

const needs = ["Фасады", "Столешница", "Другое"];
const materials = ["Эмаль", "Шпон", "Массив", "ПЭТ", "Fenix", "ПВХ", "Не знаю"];

type Status = "idle" | "loading" | "success" | "error";

export function LeadForm({ product = "" }: { product?: string }) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    product,
    need: "Фасады",
    material: "Не знаю",
    area: "",
    name: "",
    phone: "",
    message: "",
    consent: false,
  });

  const progress = useMemo(() => `${((step + 1) / 4) * 100}%`, [step]);

  function updateField(name: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function next() {
    analytics.track("lead_start", { step });
    setStep((current) => Math.min(current + 1, 3));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Укажите имя";
    if (!form.phone.trim()) nextErrors.phone = "Укажите телефон";
    if (!form.consent) nextErrors.consent = "Нужно согласие на обработку данных";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setStatus("loading");

    try {
      const attribution = getAttribution();
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          message: form.message,
          product: form.product || form.need,
          material: form.material,
          area: form.area,
          page: window.location.pathname,
          attribution,
          createdAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Lead submit failed");
      }

      analytics.track("lead_submit", { material: form.material, product: form.product || form.need });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="form-state success" role="status">
        <span>Заявка принята.</span>
        <p>Интеграция готова к backend/CRM. После подключения менеджер получит заявку автоматически.</p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={submit}>
      <div className="form-progress" aria-hidden="true">
        <span style={{ width: progress }} />
      </div>

      {step === 0 && (
        <fieldset>
          <legend>Что нужно?</legend>
          <div className="choice-grid">
            {needs.map((need) => (
              <button
                className={form.need === need ? "choice active" : "choice"}
                key={need}
                onClick={() => updateField("need", need)}
                type="button"
              >
                {need}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={next} type="button">Дальше</button>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset>
          <legend>Материал</legend>
          <div className="choice-grid">
            {materials.map((material) => (
              <button
                className={form.material === material ? "choice active" : "choice"}
                key={material}
                onClick={() => updateField("material", material)}
                type="button"
              >
                {material}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={next} type="button">Дальше</button>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset>
          <legend>Объём</legend>
          <label>
            Примерная площадь или комментарий
            <textarea
              value={form.area}
              onChange={(event) => updateField("area", event.target.value)}
              placeholder="Например: кухня 7 м² фасадов, нужен матовый цвет"
            />
          </label>
          <button className="btn primary" onClick={next} type="button">Дальше</button>
        </fieldset>
      )}

      {step === 3 && (
        <fieldset>
          <legend>Контакты</legend>
          <label>
            Имя
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <label>
            Телефон
            <input inputMode="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </label>
          <label>
            Комментарий
            <textarea value={form.message} onChange={(event) => updateField("message", event.target.value)} />
          </label>
          <label className="checkbox">
            <input
              checked={form.consent}
              onChange={(event) => updateField("consent", event.target.checked)}
              type="checkbox"
            />
            <span>Согласен на обработку персональных данных</span>
          </label>
          {errors.consent && <span className="field-error">{errors.consent}</span>}
          <button className="btn primary" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Отправляем" : "Отправить заявку"}
          </button>
          {status === "error" && (
            <p className="field-error" role="alert">API временно недоступен. Попробуйте ещё раз или передайте заявку менеджеру.</p>
          )}
        </fieldset>
      )}
    </form>
  );
}
