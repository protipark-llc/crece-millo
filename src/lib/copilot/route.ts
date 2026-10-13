/**
 * Ruta de dropshipping: 6 fases y 23 pasos. Contenido educativo en código (como las lecciones);
 * el avance de cada persona vive en dropship_progress con la clave estable de cada paso.
 */
export interface RouteStep {
  key: string;
  title: string;
  text: string;
  /** Herramienta donde se hace el paso. */
  link?: { href: string; label: string };
}

export interface RoutePhase {
  n: number;
  title: string;
  goal: string;
  steps: RouteStep[];
}

const CP = "/comunidad/emprendedores/co-piloto";

export const DROPSHIP_ROUTE: RoutePhase[] = [
  {
    n: 1,
    title: "Bases",
    goal: "Saber cuánto puedes arriesgar y cómo funciona el negocio antes de gastar.",
    steps: [
      { key: "f1-capital", title: "Define tu capital y tu reserva", text: "Decide cuánto dinero puedes perder sin afectar tus gastos esenciales. Aparta una reserva que no se toca.", link: { href: `${CP}#capital`, label: "Plan de capital" } },
      { key: "f1-contraentrega", title: "Entiende la contraentrega", text: "El cliente paga al recibir. Pagas el envío aunque rechace el pedido: las devoluciones son tu mayor costo oculto." },
      { key: "f1-nicho", title: "Elige un nicho que entiendas", text: "Un problema concreto de un grupo de personas que conoces. Es más fácil escribir anuncios para alguien a quien entiendes." },
      { key: "f1-legal", title: "Revisa las reglas básicas", text: "En Colombia, el Estatuto del Consumidor (Ley 1480 de 2011) aplica a tus ventas: información clara, garantía y derecho de retracto en ventas a distancia. Consulta a un profesional para tu caso." },
    ],
  },
  {
    n: 2,
    title: "Producto",
    goal: "Elegir productos que dejen margen con números reales.",
    steps: [
      { key: "f2-ideas", title: "Lista 10 ideas de producto", text: "Anota productos que resuelvan un problema visible en un video corto. No te enamores de ninguno todavía.", link: { href: `${CP}#productos`, label: "Agregar productos" } },
      { key: "f2-costos", title: "Pide costos reales al proveedor", text: "Precio del producto, envío, tiempos y política de devoluciones. Sin costos reales, el precio es una adivinanza." },
      { key: "f2-precio", title: "Calcula el precio con el Co-Piloto", text: "Incluye comisiones, devoluciones y un costo por compra esperado. El Co-Piloto te da precio recomendado y CPA máximo.", link: { href: `${CP}#productos`, label: "Ir a mis productos" } },
      { key: "f2-descartar", title: "Descarta los que no dejan margen", text: "Si el CPA máximo es muy bajo para tu nicho, el producto no aguanta anuncios. Mejor descartarlo ahora que después de pautar." },
    ],
  },
  {
    n: 3,
    title: "Tienda",
    goal: "Una tienda que convierta y que confirme bien los pedidos.",
    steps: [
      { key: "f3-pagina", title: "Página de producto clara", text: "Qué es, qué problema resuelve, fotos o video reales, precio y tiempo de entrega. Sin promesas exageradas." },
      { key: "f3-politicas", title: "Publica tus políticas", text: "Envíos, cambios, devoluciones y garantía, escritos en lenguaje sencillo y fáciles de encontrar." },
      { key: "f3-confirmacion", title: "Confirma cada pedido", text: "Un mensaje o llamada antes de despachar reduce rechazos. Registra cuántos pedidos confirmas y cuántos se caen." },
      { key: "f3-recaudo", title: "Conoce tus comisiones de recaudo", text: "Cuánto cobra la transportadora o la pasarela por recaudar y en cuántos días te gira. Ponlo en el Co-Piloto." },
    ],
  },
  {
    n: 4,
    title: "Pruebas",
    goal: "Probar con poco dinero y decidir con datos, no con corazonadas.",
    steps: [
      { key: "f4-creativos", title: "Prepara 3 creativos", text: "Tres videos o imágenes con ángulos distintos: el problema, la demostración y el resultado." },
      { key: "f4-presupuesto", title: "Define el presupuesto de prueba", text: "Como guía, 3 veces tu CPA de equilibrio por producto. Así puedes leer el resultado sin quemar tu capital.", link: { href: `${CP}#capital`, label: "Plan de capital" } },
      { key: "f4-lanzar", title: "Lanza un test de 3 a 4 días", text: "No cambies el anuncio cada día: dale tiempo para juntar datos." },
      { key: "f4-veredicto", title: "Registra el test y lee el veredicto", text: "Gasto, días y ventas. El Co-Piloto te dice seguir, optimizar o parar, y por qué.", link: { href: `${CP}#productos`, label: "Registrar un test" } },
    ],
  },
  {
    n: 5,
    title: "Operación",
    goal: "Que el dinero que entra sea dinero que se queda.",
    steps: [
      { key: "f5-envios", title: "Sigue cada envío", text: "Revisa novedades a diario: un pedido sin seguimiento suele terminar en devolución." },
      { key: "f5-devoluciones", title: "Baja tus devoluciones", text: "Mide tu tasa real de rechazo y actualízala en el Co-Piloto. Cada punto que bajes es margen." },
      { key: "f5-conciliar", title: "Concilia los recaudos cada semana", text: "Compara lo que vendiste con lo que te giraron. Las diferencias se pierden si no las reclamas a tiempo." },
      { key: "f5-flujo", title: "Lleva el negocio en tu flujo de caja", text: "Registra recaudos como ingresos y anuncios, producto y envíos como gastos para ver si de verdad te queda dinero.", link: { href: "/universidad/finanzas/flujo-de-caja", label: "Flujo de caja" } },
    ],
  },
  {
    n: 6,
    title: "Escala",
    goal: "Crecer sin poner en riesgo lo que ya funciona.",
    steps: [
      { key: "f6-escalar", title: "Escala de a poco", text: "Sube el presupuesto entre 20 % y 30 % y vigila que el CPA siga dentro del objetivo." },
      { key: "f6-segundo", title: "Prueba un segundo producto", text: "Con un ganador estable, repite el método con otro producto sin tocar la reserva." },
      { key: "f6-revision", title: "Revisa tu plan cada mes", text: "Capital, reserva, resultados y aprendizajes. Decide con números qué sigue.", link: { href: `${CP}#capital`, label: "Plan de capital" } },
    ],
  },
];

export const ROUTE_STEPS = DROPSHIP_ROUTE.flatMap((p) => p.steps.map((s) => ({ ...s, phase: p.n })));
export const ROUTE_STEP_KEYS = ROUTE_STEPS.map((s) => s.key);

/** Fase actual: la primera con algún paso pendiente. */
export function routeStatus(done: ReadonlySet<string>) {
  const doneCount = ROUTE_STEP_KEYS.filter((k) => done.has(k)).length;
  const current = DROPSHIP_ROUTE.find((p) => p.steps.some((s) => !done.has(s.key)));
  const next = ROUTE_STEPS.find((s) => !done.has(s.key)) ?? null;
  return { done: doneCount, total: ROUTE_STEP_KEYS.length, phase: current?.n ?? DROPSHIP_ROUTE.length, next };
}
