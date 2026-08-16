import { format, startOfMonth, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function currentPeriodMonth(): string {
  return format(startOfMonth(new Date()), "yyyy-MM-dd");
}

export function previousPeriodMonth(): string {
  return format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
}

export function formatMonthLabel(dateStr: string): string {
  return format(parseISO(dateStr), "MMMM yyyy", { locale: es });
}

export function formatShortMonthLabel(dateStr: string): string {
  return format(parseISO(dateStr), "MMM", { locale: es });
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy");
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy HH:mm");
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}
