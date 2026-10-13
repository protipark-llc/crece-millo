/**
 * Secciones de la cuenta y vistas predefinidas.
 *
 * - Esencial: lo mínimo para llevar un flujo de caja mensual de ingresos y gastos, más la
 *   sección de dropshipping (Emprendedores y Co-Piloto).
 * - Pro: todas las secciones.
 * - Personalizada: la persona elige qué secciones ve (Configuración → Tu vista).
 *
 * Ocultar una sección solo la quita de la navegación y del Panel; sus datos no se borran y la
 * página sigue disponible por enlace directo.
 */
export type ViewMode = "esencial" | "pro" | "personalizada";

export interface SectionDef {
  key: string;
  label: string;
  group: "Universidad" | "Finanzas personales" | "Comunidad" | "Cuenta";
  href: string;
  help?: string;
}

export const SECTIONS: SectionDef[] = [
  { key: "uni_inicio", label: "Inicio de la universidad", group: "Universidad", href: "/universidad" },
  { key: "uni_progreso", label: "Mi progreso", group: "Universidad", href: "/universidad/progreso" },
  { key: "uni_rutas", label: "Rutas de aprendizaje", group: "Universidad", href: "/universidad/rutas", help: "También muestra la siguiente lección en el Panel." },
  { key: "uni_biblioteca", label: "Biblioteca de módulos", group: "Universidad", href: "/universidad/biblioteca" },
  { key: "panel", label: "Panel", group: "Finanzas personales", href: "/universidad/finanzas" },
  { key: "diagnostico", label: "Diagnóstico", group: "Finanzas personales", href: "/universidad/finanzas/diagnostico" },
  { key: "movimientos", label: "Movimientos", group: "Finanzas personales", href: "/universidad/finanzas/movimientos" },
  { key: "ingresos", label: "Ingresos", group: "Finanzas personales", href: "/universidad/finanzas/ingresos" },
  { key: "gastos", label: "Gastos", group: "Finanzas personales", href: "/universidad/finanzas/gastos" },
  { key: "cuentas", label: "Cuentas", group: "Finanzas personales", href: "/universidad/finanzas/cuentas", help: "Necesaria para registrar movimientos." },
  { key: "presupuesto", label: "Presupuesto", group: "Finanzas personales", href: "/universidad/finanzas/presupuesto" },
  { key: "flujo", label: "Flujo de caja", group: "Finanzas personales", href: "/universidad/finanzas/flujo-de-caja" },
  { key: "deudas", label: "Deudas", group: "Finanzas personales", href: "/universidad/finanzas/deudas" },
  { key: "objetivos", label: "Ahorro y objetivos", group: "Finanzas personales", href: "/universidad/finanzas/objetivos" },
  { key: "patrimonio", label: "Patrimonio neto", group: "Finanzas personales", href: "/universidad/finanzas/patrimonio" },
  { key: "simulador", label: "Simulador", group: "Finanzas personales", href: "/universidad/finanzas/simulador" },
  { key: "informes", label: "Informes", group: "Finanzas personales", href: "/universidad/finanzas/informes" },
  { key: "muro", label: "Muro", group: "Comunidad", href: "/comunidad" },
  { key: "en_vivo", label: "En vivo", group: "Comunidad", href: "/comunidad/en-vivo" },
  { key: "emprendedores", label: "Emprendedores · Dropshipping", group: "Comunidad", href: "/comunidad/emprendedores" },
  { key: "copiloto", label: "Co-Piloto de Negocio", group: "Comunidad", href: "/comunidad/emprendedores/copiloto" },
  { key: "configuracion", label: "Configuración", group: "Cuenta", href: "/configuracion" },
];

export const SECTION_KEYS = SECTIONS.map((s) => s.key);
/** Siempre visibles: sin ellas no se podría volver a cambiar la vista. */
export const REQUIRED_SECTIONS = ["configuracion"];

export const VIEW_PRESETS: Record<Exclude<ViewMode, "personalizada">, string[]> = {
  esencial: ["panel", "movimientos", "cuentas", "flujo", "emprendedores", "copiloto", "configuracion"],
  pro: SECTION_KEYS,
};

export const VIEW_LABELS: Record<ViewMode, { name: string; text: string }> = {
  esencial: { name: "Esencial", text: "Lo justo para llevar tu flujo de caja mensual de ingresos y gastos, más el dropshipping con el Co-Piloto." },
  pro: { name: "Pro", text: "Todo: universidad, presupuesto, deudas, objetivos, patrimonio, simulador, informes y comunidad." },
  personalizada: { name: "Personalizada", text: "Tú eliges qué secciones ves." },
};

export function normalizeSections(keys: readonly string[] | null | undefined): string[] {
  const set = new Set((keys ?? []).filter((k) => SECTION_KEYS.includes(k)));
  for (const r of REQUIRED_SECTIONS) set.add(r);
  return SECTION_KEYS.filter((k) => set.has(k));
}

/** Secciones visibles según la vista guardada. */
export function enabledSections(s: { viewMode?: string | null; sections?: readonly string[] | null }): string[] {
  if (s.viewMode === "esencial") return [...VIEW_PRESETS.esencial];
  if (s.viewMode === "personalizada") return normalizeSections(s.sections);
  return [...VIEW_PRESETS.pro];
}

/** Página de inicio según la vista: la primera sección visible (con preferencia por el Panel). */
export function homeHref(enabled: readonly string[]): string {
  for (const k of ["uni_inicio", "panel", "movimientos", "flujo", "copiloto", "emprendedores"]) if (enabled.includes(k)) return SECTIONS.find((s) => s.key === k)!.href;
  const first = SECTIONS.find((s) => enabled.includes(s.key));
  return first?.href ?? "/configuracion";
}
