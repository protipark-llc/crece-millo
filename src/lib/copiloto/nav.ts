/**
 * Secciones del Co-Piloto y su URL. El estado guarda los códigos del original (`S.tab`,
 * `S.ptab`, `S.mk[pid].tab`) para que los respaldos sigan siendo compatibles; la URL usa
 * nombres en español completos (especificación §1).
 */
export const BASE = "/comunidad/emprendedores/copiloto";

export const TABS = [
  { slug: "ruta", code: "ruta", label: "Ruta" },
  { slug: "productos", code: "producto", label: "Productos" },
  { slug: "marketing", code: "marketing", label: "Marketing" },
  { slug: "test", code: "test", label: "Analizar test" },
  { slug: "capital", code: "plan", label: "Planificar capital" },
  { slug: "crecer", code: "crecer", label: "Crecer" },
  { slug: "bitacora", code: "bitacora", label: "Bitácora" },
] as const;
export type TabSlug = (typeof TABS)[number]["slug"];
export type TabCode = (typeof TABS)[number]["code"];

/** Subpestañas de Productos (S.ptab) y de Marketing (S.mk[pid].tab). */
export const PTABS = [
  { slug: "ficha", code: "ficha", label: "Ficha" },
  { slug: "evaluacion", code: "eval", label: "Evaluación inicial" },
  { slug: "resultados", code: "res", label: "Resultados de venta" },
  { slug: "analisis", code: "ana", label: "Análisis y estrategia" },
  { slug: "precio", code: "precio", label: "Precio y margen" },
] as const;
export const MKTABS = [
  { slug: "ofertas", code: "ofertas", label: "Ofertas" },
  { slug: "creativos", code: "creativos", label: "Creativos" },
  { slug: "pagina", code: "pagina", label: "Página y WhatsApp" },
  { slug: "lanzamiento", code: "lanz", label: "Plan de lanzamiento" },
] as const;

export const tabBySlug = (slug: string) => TABS.find((t) => t.slug === slug);
export const tabByCode = (code: string) => TABS.find((t) => t.code === code) ?? TABS[0];

/** URL de una sección; `vista` es la subpestaña (código del original o slug). */
export function copilotoHref(tab: TabSlug | TabCode, vista?: string): string {
  const t = TABS.find((x) => x.slug === tab || x.code === tab) ?? TABS[0];
  if (!vista) return `${BASE}/${t.slug}`;
  const sub = [...PTABS, ...MKTABS].find((x) => x.slug === vista || x.code === vista);
  return `${BASE}/${t.slug}?vista=${sub ? sub.slug : vista}`;
}
