const RUSSIAN_LOCAL_DIGITS = 10;

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("8")
    ? digits.slice(1)
    : digits.startsWith("7")
      ? digits.slice(1)
      : digits;
  const trimmed = local.slice(0, RUSSIAN_LOCAL_DIGITS);
  return trimmed.length === RUSSIAN_LOCAL_DIGITS ? `+7${trimmed}` : trimmed ? `+7${trimmed}` : "";
}

export function validateRussianPhone(value: string) {
  return /^\+7\d{10}$/.test(normalizePhone(value));
}

export function formatPhone(value: string) {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/g, "").replace(/^7/, "").slice(0, RUSSIAN_LOCAL_DIGITS);
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ];

  let formatted = "+7";
  if (parts[0]) formatted += ` (${parts[0]}`;
  if (parts[0]?.length === 3) formatted += ")";
  if (parts[1]) formatted += ` ${parts[1]}`;
  if (parts[2]) formatted += `-${parts[2]}`;
  if (parts[3]) formatted += `-${parts[3]}`;
  return formatted;
}

export function phoneDigits(value: string) {
  return normalizePhone(value).replace(/\D/g, "").replace(/^7/, "");
}
