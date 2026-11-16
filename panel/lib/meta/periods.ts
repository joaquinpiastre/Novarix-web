// Períodos para métricas y reportes. Sin dependencias de servidor: lo usan
// pantallas y acciones. Fechas en YYYY-MM-DD; el período anterior tiene la
// misma cantidad de días (o es el mes anterior completo).

export const METRICS_PERIODS = [
  { value: "last_7", label: "Últimos 7 días" },
  { value: "last_30", label: "Últimos 30 días" },
  { value: "this_month", label: "Este mes" },
  { value: "last_month", label: "Mes pasado" },
] as const;

export type MetricsPeriod = (typeof METRICS_PERIODS)[number]["value"];

export function isMetricsPeriod(v: unknown): v is MetricsPeriod {
  return METRICS_PERIODS.some((p) => p.value === v);
}

export interface PeriodRange {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  label: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

export function periodRange(period: MetricsPeriod, now = new Date()): PeriodRange {
  const label = METRICS_PERIODS.find((p) => p.value === period)!.label;
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === "this_month") {
    return { from: iso(utc(y, m, 1)), to: iso(now), prevFrom: iso(utc(y, m - 1, 1)), prevTo: iso(utc(y, m, 0)), label };
  }
  if (period === "last_month") {
    return { from: iso(utc(y, m - 1, 1)), to: iso(utc(y, m, 0)), prevFrom: iso(utc(y, m - 2, 1)), prevTo: iso(utc(y, m - 1, 0)), label };
  }
  const days = period === "last_7" ? 7 : 30;
  const day = 86_400_000;
  const to = now;
  const from = new Date(to.getTime() - (days - 1) * day);
  const prevTo = new Date(from.getTime() - day);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * day);
  return { from: iso(from), to: iso(to), prevFrom: iso(prevFrom), prevTo: iso(prevTo), label };
}

/** "01/10/2026 al 31/10/2026" */
export function periodText(from: string, to: string): string {
  const f = (s: string) => s.split("-").reverse().join("/");
  return `${f(from)} al ${f(to)}`;
}
