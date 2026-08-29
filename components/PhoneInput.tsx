"use client";

import { InputHTMLAttributes } from "react";
import { formatPhone, normalizePhone } from "@/features/phone/phone";

type PhoneInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "autoComplete" | "value" | "onChange"> & {
  value: string;
  onValueChange: (formattedValue: string, normalizedValue: string) => void;
};

export function PhoneInput({ value, onValueChange, ...props }: PhoneInputProps) {
  return (
    <input
      {...props}
      autoComplete="tel"
      inputMode="tel"
      placeholder="+7 (___) ___-__-__"
      type="tel"
      value={value}
      onChange={(event) => {
        const formatted = formatPhone(event.target.value);
        onValueChange(formatted, normalizePhone(formatted));
      }}
      onPaste={(event) => {
        event.preventDefault();
        const formatted = formatPhone(event.clipboardData.getData("text"));
        onValueChange(formatted, normalizePhone(formatted));
      }}
    />
  );
}
