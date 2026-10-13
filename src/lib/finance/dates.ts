/**
 * Fechas de calendario como cadenas ISO "YYYY-MM-DD" (sin hora ni zona).
 * Toda la aritmética se hace en UTC para que no influya la zona horaria del servidor.
 * El "hoy" de cada persona se calcula con su zona horaria (`todayIn`).
 */
export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function parts(date: ISODate): { y: number; m: number; d: number } {
  const match = ISO_RE.exec(date);
  if (!match) throw new Error(`Fecha inválida: ${date}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function fromParts(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
}

function toUTC(date: ISODate): number {
  const { y, m, d } = parts(date);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): ISODate {
  const dt = new Date(ms);
  return fromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * 86_400_000);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a) - toUTC(b)) / 86_400_000);
}

/** Suma meses fijando el día al último día válido (31-ene + 1 mes = 28/29-feb). */
export function addMonthsClamped(date: ISODate, months: number, anchorDay?: number): ISODate {
  const { y, m, d } = parts(date);
  const idx = y * 12 + (m - 1) + months;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return fromParts(ny, nm, Math.min(anchorDay ?? d, daysInMonth(ny, nm)));
}

export function monthStart(date: ISODate): ISODate {
  const { y, m } = parts(date);
  return fromParts(y, m, 1);
}

export function monthEnd(date: ISODate): ISODate {
  const { y, m } = parts(date);
  return fromParts(y, m, daysInMonth(y, m));
}

/** Clave de mes "YYYY-MM". */
export function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

export function monthFromKey(key: string): ISODate {
  if (!/^\d{4}-\d{2}$/.test(key)) throw new Error(`Mes inválido: ${key}`);
  const date = `${key}-01`;
  if (!isISODate(date)) throw new Error(`Mes inválido: ${key}`);
  return date;
}

/** Lunes de la semana ISO que contiene la fecha. */
export function weekStart(date: ISODate): ISODate {
  const dow = new Date(toUTC(date)).getUTCDay(); // 0 = domingo
  return addDays(date, -((dow + 6) % 7));
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

export function inRange(date: ISODate, from: ISODate, to: ISODate): boolean {
  return date >= from && date <= to;
}

/** Meses completos entre dos fechas (a ≤ b), contando un mes iniciado como fracción redondeada hacia arriba. */
export function monthsBetweenCeil(from: ISODate, to: ISODate): number {
  if (to <= from) return 0;
  const a = parts(from);
  const b = parts(to);
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d > a.d) months += 1;
  return Math.max(months, 1);
}

export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  // en-CA produce el formato YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function formatDate(date: ISODate, locale = "es-CO", style: "short" | "medium" | "long" = "medium"): string {
  if (style === "medium") {
    // «12 oct 2026»: mes abreviado sin punto ni «de» (guía de contenido).
    const parts = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).formatToParts(new Date(toUTC(date)));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("day")} ${get("month").replace(/\.$/, "")} ${get("year")}`;
  }
  const opts: Intl.DateTimeFormatOptions =
    style === "short" ? { day: "2-digit", month: "2-digit", year: "numeric" } : { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(new Date(toUTC(date)));
}

export function formatMonth(date: ISODate, locale = "es-CO", short = false): string {
  return new Intl.DateTimeFormat(locale, { month: short ? "short" : "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(toUTC(date)),
  );
}

/** Etiqueta compacta de mes para ejes de gráficos: "nov 26". */
export function formatMonthShort(date: ISODate, locale = "es-CO"): string {
  const m = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(toUTC(date))).replace(".", "");
  return `${m} ${date.slice(2, 4)}`;
}
