import type { Attribution } from "@/features/attribution/attribution";

export type LeadPayload = {
  name: string;
  phone: string;
  message: string;
  product: string;
  material: string;
  area: string;
  page: string;
  attribution: Attribution;
  createdAt: string;
};

export function validateLead(payload: Partial<LeadPayload>) {
  const errors: Record<string, string> = {};

  if (!payload.name?.trim()) errors.name = "Укажите имя";
  if (!payload.phone?.trim()) errors.phone = "Укажите телефон";
  if (!payload.material?.trim()) errors.material = "Выберите материал или вариант «Не знаю»";

  return errors;
}
