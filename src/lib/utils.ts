import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { CurrencyType } from "./types";
import { CURRENCY_SYMBOLS } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd MMMM yyyy", { locale: tr });
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), "dd.MM.yyyy", { locale: tr });
}

export function formatCurrency(amount: number, currency: CurrencyType): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

export function generateVoucherNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `EB-${year}${month}${day}-${random}`;
}
