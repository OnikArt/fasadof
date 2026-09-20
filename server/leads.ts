import type { Attribution } from "@/features/attribution/attribution";
import { normalizePhone, validateRussianPhone } from "@/features/phone/phone";

export type LeadPayload = {
  name: string;
  phone: string;
  email?: string;
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
  if (!payload.phone?.trim() || !validateRussianPhone(payload.phone)) errors.phone = "Укажите телефон";
  if (!payload.material?.trim()) errors.material = "Выберите материал или вариант «Не знаю»";
  if (payload.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) errors.email = "Проверьте адрес электронной почты";

  return errors;
}

export function normalizeLeadPayload(payload: LeadPayload): LeadPayload {
  return {
    ...payload,
    phone: normalizePhone(payload.phone),
    email: payload.email?.trim().toLowerCase() ?? "",
  };
}
