"use client";

export type TouchAttribution = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  referrer: string;
  landing_page: string;
  source: "VK" | "Instagram" | "MAX" | "Yandex" | "Google" | "Direct" | "Other";
  capturedAt: string;
};

export type Attribution = {
  firstTouch: TouchAttribution;
  lastTouch: TouchAttribution;
};

const storageKey = "fasadof.attribution";
const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function normalizeSource(value: string): TouchAttribution["source"] {
  const source = value.toLowerCase();
  if (source.includes("vk")) return "VK";
  if (source.includes("inst")) return "Instagram";
  if (source.includes("max")) return "MAX";
  if (source.includes("yandex") || source.includes("ya")) return "Yandex";
  if (source.includes("google")) return "Google";
  if (!source) return "Direct";
  return "Other";
}

function captureTouch(): TouchAttribution {
  const params = new URLSearchParams(window.location.search);
  const values = Object.fromEntries(utmKeys.map((key) => [key, params.get(key) ?? ""])) as Pick<
    TouchAttribution,
    (typeof utmKeys)[number]
  >;

  return {
    ...values,
    referrer: document.referrer,
    landing_page: window.location.href,
    source: normalizeSource(values.utm_source || document.referrer),
    capturedAt: new Date().toISOString(),
  };
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") {
    const empty: TouchAttribution = {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_content: "",
      utm_term: "",
      referrer: "",
      landing_page: "",
      source: "Direct",
      capturedAt: new Date(0).toISOString(),
    };
    return { firstTouch: empty, lastTouch: empty };
  }

  const lastTouch = captureTouch();
  const stored = window.localStorage.getItem(storageKey);
  const firstTouch = stored ? parseStoredTouch(stored) ?? lastTouch : lastTouch;

  if (!stored) {
    window.localStorage.setItem(storageKey, JSON.stringify(firstTouch));
  }

  window.sessionStorage.setItem(`${storageKey}.last`, JSON.stringify(lastTouch));
  return { firstTouch, lastTouch };
}

function parseStoredTouch(value: string) {
  try {
    return JSON.parse(value) as TouchAttribution;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}
