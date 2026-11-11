// Calendario de fechas comerciales de Argentina (y de Mendoza). Sin imports de
// servidor. Las fechas moviles se calculan; las que fija cada año un
// organizador (Hot Sale y CyberMonday los define la CACE, la Vendimia el
// Gobierno de Mendoza, el calendario escolar la DGE) se marcan como
// "estimada" -- conviene confirmarlas y, si hace falta, cargar la fecha
// exacta como fecha propia en /marketing/ideas.

export interface CommercialDate {
  key: string;
  name: string;
  /** yyyy-MM-dd */
  date: string;
  estimated: boolean;
  scope: "nacional" | "mendoza" | "propia";
  hint: string;
  clientId?: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** n-esimo dia de la semana (0 = domingo) de un mes. */
function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return iso(year, month, day);
}

function lastWeekdayBefore(year: number, month: number, weekday: number, n: number): string {
  // n-esimo `weekday` contando desde el ultimo del mes (n=1 = ultimo)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastWd = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  const day = lastDay - ((lastWd - weekday + 7) % 7) - (n - 1) * 7;
  return iso(year, month, day);
}

/** Domingo de Pascua (algoritmo de Butcher/Meeus). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

export function commercialDatesForYear(year: number): CommercialDate[] {
  const list: Omit<CommercialDate, "key">[] = [
    { name: "San Valentín", date: iso(year, 2, 14), estimated: false, scope: "nacional", hint: "Parejas, regalos, salidas, promos 2x1." },
    { name: "Vuelta a clases (Mendoza)", date: iso(year, 2, 25), estimated: true, scope: "mendoza", hint: "Útiles, uniformes, viandas, transporte. Confirmar fecha con el calendario escolar de la DGE." },
    { name: "Fiesta Nacional de la Vendimia (acto central)", date: nthWeekday(year, 3, 6, 1), estimated: true, scope: "mendoza", hint: "Turismo, vino, gastronomía, orgullo mendocino. Se vive todo febrero y marzo (Bendición de los Frutos, Vía Blanca, Carrusel)." },
    { name: "Día de la Mujer", date: iso(year, 3, 8), estimated: false, scope: "nacional", hint: "Contenido con cuidado: reconocimiento y valores, no promos frívolas." },
    { name: "Pascuas", date: easterSunday(year), estimated: false, scope: "nacional", hint: "Huevos de pascua, rosca, fin de semana largo, escapadas." },
    { name: "Hot Sale", date: nthWeekday(year, 5, 1, 2), estimated: true, scope: "nacional", hint: "3 días de descuentos online (CACE). Preparar ofertas, landing y pauta con 2 semanas de anticipación." },
    { name: "Día del Padre", date: nthWeekday(year, 6, 0, 3), estimated: false, scope: "nacional", hint: "Regalos, asados, herramientas, tecnología." },
    { name: "Vacaciones de invierno (Mendoza)", date: nthWeekday(year, 7, 1, 2), estimated: true, scope: "mendoza", hint: "Nieve, turismo, actividades para chicos. Confirmar fecha con la DGE." },
    { name: "Día del Amigo", date: iso(year, 7, 20), estimated: false, scope: "nacional", hint: "Salidas, juntadas, promos para compartir." },
    { name: "Día de las Infancias (del Niño)", date: nthWeekday(year, 8, 0, 3), estimated: false, scope: "nacional", hint: "Juguetes, salidas en familia, experiencias." },
    { name: "Día de la Primavera y del Estudiante", date: iso(year, 9, 21), estimated: false, scope: "nacional", hint: "Picnic, salidas, jóvenes, renovación." },
    { name: "Día de la Madre", date: nthWeekday(year, 10, 0, 3), estimated: false, scope: "nacional", hint: "Una de las fechas más fuertes del año para comercio y gastronomía." },
    { name: "CyberMonday", date: nthWeekday(year, 11, 1, 1), estimated: true, scope: "nacional", hint: "3 días de descuentos online (CACE). Igual que Hot Sale: ofertas y pauta con anticipación." },
    { name: "Black Friday", date: lastWeekdayBefore(year, 11, 5, 1), estimated: false, scope: "nacional", hint: "Cada vez más adoptado en Argentina, sobre todo en tecnología y moda." },
    { name: "Navidad", date: iso(year, 12, 25), estimated: false, scope: "nacional", hint: "Regalos, cenas, fiestas de empresa, cierre de año." },
    { name: "Año Nuevo", date: iso(year, 12, 31), estimated: false, scope: "nacional", hint: "Balance del año, agradecimientos, propósitos." },
  ];
  return list.map((d) => ({ ...d, key: `${d.name}-${d.date}` }));
}

/** Fechas entre hoy y hoy + `days` (ambos inclusive), ordenadas. */
export function upcomingCommercialDates(today: string, days: number, extra: CommercialDate[] = []): CommercialDate[] {
  const year = Number(today.slice(0, 4));
  const end = addDays(today, days);
  return [...commercialDatesForYear(year), ...commercialDatesForYear(year + 1), ...extra]
    .filter((d) => d.date >= today && d.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`)) / 86_400_000);
}

export function todayInMendoza(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Mendoza" }).format(new Date());
}
