/** Fecha de hoy (AAAA-MM-DD) en la zona del navegador. El original usaba la fecha UTC, que en Colombia cambia a las 7 p. m. */
export function todayLocal(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
