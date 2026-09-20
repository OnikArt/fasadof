"use client";

export type AnalyticsEvent =
  | "page_view"
  | "cta_click"
  | "catalog_open"
  | "product_view"
  | "lead_start"
  | "lead_submit"
  | "chat_open"
  | "chat_message"
  | "operator_requested"
  | "operator_connected"
  | "manager_wait_timeout"
  | "ai_resumed"
  | "manager_online"
  | "phone_click"
  | "max_click";

declare global {
  interface Window {
    ym?: (counterId: number, method: string, eventName?: string, params?: Record<string, unknown>) => void;
  }
}

const rawYandexId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
const yandexId = rawYandexId ? Number(rawYandexId) : undefined;

export const analytics = {
  track(event: AnalyticsEvent, payload: Record<string, unknown> = {}) {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new CustomEvent("fasadof:analytics", { detail: { event, payload } }));

    if (yandexId && window.ym) {
      window.ym(yandexId, "reachGoal", event, payload);
    }
  },
};
