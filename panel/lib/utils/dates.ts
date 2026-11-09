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

/**
 * Convierte lo que manda un <input type="datetime-local"> (o una fecha
 * suelta "yyyy-MM-dd") a ISO UTC, interpretándolo en hora de Mendoza
 * (UTC-3 fijo, sin horario de verano). Si ya trae zona horaria, se respeta.
 * Sin esto, `new Date("2026-11-10T10:00")` en el server (que corre en UTC)
 * corre la hora 3 horas.
 */
export function parseLocalDateTime(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const withTime = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T09:00` : value;
  const d = new Date(hasZone ? withTime : `${withTime}-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const MENDOZA_TZ = "America/Argentina/Mendoza";

function mendozaParts(iso: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MENDOZA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** "yyyy-MM-dd" del día en Mendoza (sirve como clave de día en calendarios, igual en server y browser). */
export function mendozaDateKey(iso: string): string {
  const p = mendozaParts(iso);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Valor para un <input type="datetime-local"> en hora de Mendoza. */
export function toMendozaInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = mendozaParts(iso);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** "HH:mm" en hora de Mendoza. */
export function mendozaTime(iso: string): string {
  const p = mendozaParts(iso);
  return `${p.hour}:${p.minute}`;
}
