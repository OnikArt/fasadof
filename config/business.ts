export const BUSINESS = {
  name: "ФасадоФ",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://fasadof.dwayneclifford50004.chatgpt.site",
  phone: {
    display: "8 903 850-24-04",
    formatted: "+7 (903) 850-24-04",
    e164: "+79038502404",
    href: "tel:+79038502404",
  },
  email: "fasadof36@gmail.com",
  emailHref: "mailto:fasadof36@gmail.com",
  address: "г. Воронеж, ул. Машиностроителей, д. 3",
  workingHours: {
    days: "ПН–ПТ",
    time: "09:00–17:00",
    label: "ПН–ПТ 09:00–17:00",
    short: "ПН–ПТ\n09:00–17:00",
    weekend: "СБ–ВС выходной",
    schedule: [
      { label: "Будни", value: "9:00–17:00" },
      { label: "Сб", value: "Выходной" },
      { label: "Вс", value: "Выходной" },
    ],
  },
  delivery: {
    free: true,
    city: "Воронеж",
    label: "Бесплатная доставка по Воронежу",
    compact: "Доставка по Воронежу - бесплатно",
  },
  socials: {
    vk: "https://vk.ru/fasadof",
    max: "https://max.ru/join/EHLzVwzDI_paADe5xucJvIxV1X1KznQlDcmeK88YhmU",
    yandexMaps: "https://yandex.ru/maps/?text=%D0%B3.%20%D0%92%D0%BE%D1%80%D0%BE%D0%BD%D0%B5%D0%B6%2C%20%D1%83%D0%BB.%20%D0%9C%D0%B0%D1%88%D0%B8%D0%BD%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B8%D1%82%D0%B5%D0%BB%D0%B5%D0%B9%2C%203",
  },
  workingHoursLabel: "ПН–ПТ 09:00–17:00",
  workingHoursShort: "ПН–ПТ\n09:00–17:00",
  freeDelivery: "Бесплатная доставка по Воронежу",
  requiredOwnerData: [
    "production domain",
    "ID Яндекс Метрики",
    "GigaChat auth key",
    "VK community token и peer_id для уведомлений",
    "manager account credentials",
  ],
} as const;

export const BUSINESS_COMPAT = {
  workingHours: BUSINESS.workingHours.label,
  workingHoursShort: BUSINESS.workingHours.short,
  freeDelivery: BUSINESS.delivery.label,
} as const;
