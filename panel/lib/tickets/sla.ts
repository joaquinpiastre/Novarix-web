import { SLA_HOURS_BY_PRIORITY, type TicketPriority } from "@/lib/types/domain";

// Horario habil: 9 a 18, lunes a viernes, America/Argentina/Mendoza
// (UTC-3 fijo -- Argentina no usa horario de verano desde 2009, así que un
// offset fijo es exacto, no una aproximación).
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 18;
const MENDOZA_OFFSET_HOURS = -3;

function toMendozaParts(date: Date): { weekday: number; hour: number; minute: number } {
  const shifted = new Date(date.getTime() + MENDOZA_OFFSET_HOURS * 60 * 60 * 1000);
  return {
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function isBusinessDay(weekday: number): boolean {
  return weekday >= 1 && weekday <= 5;
}

/** Suma `hours` horas hábiles a partir de `start`, saltando fines de semana y fuera de 9-18. */
export function addBusinessHours(start: Date, hours: number): Date {
  let cursor = new Date(start);
  let remainingMinutes = Math.round(hours * 60);

  // Si arranca fuera de horario habil, lo lleva al proximo inicio de horario habil.
  let { weekday, hour, minute } = toMendozaParts(cursor);
  while (!isBusinessDay(weekday) || hour < BUSINESS_START_HOUR || hour >= BUSINESS_END_HOUR) {
    if (!isBusinessDay(weekday) || hour >= BUSINESS_END_HOUR) {
      // avanza al 9:00 del dia siguiente
      const daysToAdd = 1;
      cursor = new Date(cursor.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      const p = toMendozaParts(cursor);
      cursor = new Date(
        cursor.getTime() - ((p.hour - BUSINESS_START_HOUR) * 60 + p.minute) * 60 * 1000
      );
    } else {
      // antes de las 9: avanza al 9:00 del mismo dia
      cursor = new Date(cursor.getTime() + (BUSINESS_START_HOUR - hour) * 60 * 60 * 1000 - minute * 60 * 1000);
    }
    ({ weekday, hour, minute } = toMendozaParts(cursor));
  }

  while (remainingMinutes > 0) {
    const { weekday: wd, hour: h, minute: m } = toMendozaParts(cursor);
    if (!isBusinessDay(wd)) {
      cursor = nextBusinessDayStart(cursor);
      continue;
    }
    const minutesLeftToday = (BUSINESS_END_HOUR - h) * 60 - m;
    if (remainingMinutes <= minutesLeftToday) {
      cursor = new Date(cursor.getTime() + remainingMinutes * 60 * 1000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= minutesLeftToday;
      cursor = nextBusinessDayStart(cursor);
    }
  }

  return cursor;
}

function nextBusinessDayStart(from: Date): Date {
  let candidate = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  let { weekday, hour, minute } = toMendozaParts(candidate);
  candidate = new Date(candidate.getTime() - (hour * 60 + minute) * 60 * 1000 + BUSINESS_START_HOUR * 60 * 60 * 1000);
  ({ weekday } = toMendozaParts(candidate));
  while (!isBusinessDay(weekday)) {
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
    ({ weekday } = toMendozaParts(candidate));
  }
  return candidate;
}

export function calculateSlaDueDate(priority: TicketPriority, from: Date = new Date()): Date {
  return addBusinessHours(from, SLA_HOURS_BY_PRIORITY[priority]);
}

export function isOverdue(slaDueAt: string | null, firstResponseAt: string | null): boolean {
  if (!slaDueAt || firstResponseAt) return false;
  return new Date(slaDueAt) < new Date();
}
