/**
 * Datos de EJEMPLO para la vista previa de la Comunidad (entrega de diseño v1, §4.12).
 * Todas las personas, cifras y publicaciones son ficticias. La Comunidad todavía no tiene
 * modelo de datos ni moderación: ver docs/COMUNIDAD.md antes de reemplazar esto por datos reales.
 */
export type PostKind = "avance" | "duda" | "test";

export interface SamplePost {
  id: string;
  author: { name: string; initials: string; meta: string };
  kind: PostKind;
  text: string;
  test?: { title: string; detail: string; verdict: "Seguir" | "Optimizar" | "Parar" };
  reply?: { initials: string; name: string; text: string };
  useful: number;
  comments: number;
}

export const SAMPLE_POSTS: SamplePost[] = [
  {
    id: "p1",
    author: { name: "Laura M.", initials: "LM", meta: "Cali · Fase 4 · hace 2 h" },
    kind: "test",
    text: "Terminé el test de 4 días del organizador de cables. Me dio «Optimizar»: el costo por compra quedó por encima de mi máximo. Antes de matarlo voy a probar un video de antes y después. ¿Alguien lo ha probado con productos de orden?",
    test: { title: "Test · Organizador de cables", detail: "CPA $ 21.400 · máximo $ 18.000 · 4 días", verdict: "Optimizar" },
    reply: { initials: "JR", name: "Juan R.", text: "A mí me funcionó mostrar el escritorio desordenado en los primeros 2 segundos. Prueba también con otra oferta antes de subir presupuesto." },
    useful: 46,
    comments: 9,
  },
  {
    id: "p2",
    author: { name: "Andrés P.", initials: "AP", meta: "Bogotá · Fase 3 · hace 5 h" },
    kind: "duda",
    text: "¿Cómo están manejando las devoluciones con contraentrega? Me está volviendo 1 de cada 5 pedidos y no sé si es el producto o la confirmación por WhatsApp.",
    useful: 21,
    comments: 14,
  },
  {
    id: "p3",
    author: { name: "Valentina R.", initials: "VR", meta: "Medellín · Fase 2 · ayer" },
    kind: "avance",
    text: "Primera semana completa del método: 3 productos validados con margen de 30 % o más y ninguno en pauta todavía. Voy despacio, pero con números.",
    useful: 63,
    comments: 11,
  },
];

export const SAMPLE_COMMUNITY = {
  members: 1284,
  activeToday: 96,
  avatars: ["LM", "AP", "VR", "JR"],
  event: { month: "oct", day: "15", weekday: "jue", title: "Revisión de tiendas en vivo", meta: "7:00 p. m. · 60 min · 142 inscritos", status: "Próximo" as const },
  challenge: { title: "Valida 3 productos con margen antes de pautar.", until: "Termina el vie 16 oct 2026.", done: 1, total: 3, participants: 214 },
  route: { done: 9, total: 23, phase: 3 },
};

export const COMMUNITY_RULES = ["Compartimos números reales, también los malos.", "Nada de promesas de ganancias rápidas.", "Preguntar no es de novatos: es de los que avanzan."];
