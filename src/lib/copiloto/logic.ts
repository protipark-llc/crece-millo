/**
 * Lógica de la interfaz del original que no está en el motor pero define números que se
 * muestran o se guardan. Portada sin cambios; las líneas son de CoPiloto_Trendo_v5.html.
 */
import { E } from "./engine";
import type { CopilotState, Product, Test } from "./state";

/** Tests de un producto en orden cronológico (prodTests, L702). */
export function prodTests(S: Pick<CopilotState, "tests">, id: string): Test[] {
  return S.tests
    .filter((t) => t.productId === id)
    .sort(
      (a, b) =>
        String(a.form.fecha || "").localeCompare(String(b.form.fecha || "")) ||
        a.ts - b.ts,
    );
}

/** Supuestos por defecto de Precio y margen (pcDefaults, L786). */
export function pcDefaults(
  S: Pick<CopilotState, "tests" | "risk" | "simForm">,
  p: Product,
) {
  const a = E.agg(prodTests(S, p.id));
  const n = E.rn(S.risk);
  return {
    costo: p.costo,
    P: p.precio,
    upPrecio: p.upPrecio || 0,
    upCosto: p.upCosto || 0,
    upTasa: p.upTasa || 0,
    cpa0: Math.round((a && a.ped >= 3 ? a.cpa : p.precio * 0.2) / 100) * 100,
    p0: p.precio,
    elast: 1.2,
    techo:
      (p.precioComp as number) > 0
        ? Math.round(((p.precioComp as number) * 1.15) / 1000) * 1000
        : (p.ancla as number) > p.precio
          ? (p.ancla as number)
          : 0,
    presupuesto: 1500000,
    conf: p.conf ?? 90,
    entrega: a && a.conf >= 5 ? Math.round(a.tasaEntrega * 100) : p.entrega,
    flete: p.flete,
    fleteRet: p.fleteRet,
    empaque: p.empaque || 0,
    costoConf: p.costoConf || 0,
    com: p.com,
    imp: p.imp || 0,
    fijosMes: (S.simForm.fijos as number) || 200000,
    margenMin: Math.round(14 - 6 * n),
    margenObj: 20,
  };
}

const num = (v: unknown) => {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
};
const cl = (v: unknown) => String(v ?? "").replace(/[;\n\r]+/g, " ");

/**
 * «Productos para Notion» (exportProductsCSV, L772): separador «;», columnas exactas y números
 * con punto decimal (es un archivo para importar, no texto para leer: no lleva formato es-CO).
 */
export function productsCsv(S: CopilotState): string {
  const h =
    [
      "Producto",
      "Etapa",
      "Categoría",
      "Sub-nicho",
      "SKU Dropi",
      "Costo proveedor (COP)",
      "Precio venta (COP)",
      "Precio tachado (COP)",
      "Flete (COP)",
      "% Entrega",
      "Puntaje evaluación",
      "Clase",
      "Utilidad por pedido (COP)",
      "Requiere INVIMA",
      "Público objetivo",
      "Ángulo de venta",
      "Link Dropi",
      "Gasto ads real (COP)",
      "Utilidad neta real (COP)",
      "ROAS real",
      "Notas",
    ].join(";") + "\n";
  return (
    h +
    S.products
      .map((p) => {
        const ev = E.evaluate(p, S.risk),
          a = E.agg(prodTests(S, p.id));
        return [
          p.nombre,
          p.etapa,
          p.categoria,
          p.subnicho,
          p.sku,
          p.costo,
          p.precio,
          p.ancla,
          p.flete,
          (p.entrega / 100).toFixed(2),
          ev.total,
          ev.clase,
          Math.round(ev.g.u.utilidadPedido),
          p.invima,
          p.publico,
          p.angulos,
          p.linkDropi,
          a ? Math.round(a.ads) : "",
          a ? Math.round(a.neta) : "",
          a ? a.roas.toFixed(2) : "",
          p.notas,
        ]
          .map(cl)
          .join(";");
      })
      .join("\n")
  );
}

/** «Tests a CSV» (exportTestsCSV, L1142). */
export function testsCsv(S: CopilotState): string {
  const h =
    "Test;Producto;Canal;Fecha inicio;Presupuesto/día (COP);Gasto total (COP);CPA (COP);Ventas;Pedidos entregados;Pedidos devueltos;Resultado;Aprendizaje\n";
  const map = (v: string) =>
    /Escalar/.test(v)
      ? "Escalar"
      : /matar/i.test(v)
        ? "Matar"
        : /Optimizar|Mantener/.test(v)
          ? "Iterar"
          : "En curso";
  return (
    h +
    S.tests
      .map((t) => {
        const c = t.c as Record<string, number>;
        return [
          t.form.nombre || t.producto,
          t.producto,
          t.form.canal,
          new Date(t.ts).toISOString().slice(0, 10),
          Math.round(c.ads! / Math.max(1, num(t.form.dias))),
          Math.round(c.ads!),
          Math.round(c.cpa!),
          c.ped,
          Math.round(c.ent!),
          Math.round(c.dev!),
          map(t.verdict),
          t.verdict,
        ].join(";");
      })
      .join("\n")
  );
}

/** Supuestos de precio de un producto: los guardados o los por defecto (pcQ, L787), sin escribir el estado. */
export function pcQ(
  S: Pick<CopilotState, "tests" | "risk" | "simForm" | "pc">,
  p: Product,
) {
  return (
    (S.pc[p.id] as ReturnType<typeof pcDefaults> | undefined) ??
    pcDefaults(S, p)
  );
}

export function activeProduct(
  S: Pick<CopilotState, "products" | "active">,
): Product {
  return S.products.find((p) => p.id === S.active) ?? S.products[0]!;
}

/* ───────────── Tu siguiente paso (coach y renderCoach, L1043–1056) ───────────── */

/** Texto con partes en negrita (el original usa <b>…</b>). */
export type Rich = { t: string; b?: boolean }[];
export type CoachIcon =
  | "zap"
  | "search"
  | "calculator"
  | "coins"
  | "gift"
  | "film"
  | "octagon"
  | "rocket"
  | "trending";
export type CoachAction =
  | { kind: "alta"; label: string }
  | {
      kind: "go";
      label: string;
      tab: "producto" | "marketing" | "crecer";
      vista?: string;
      activate?: string;
    };
export interface CoachStep {
  icon: CoachIcon;
  text: Rich;
  action: CoachAction | null;
}

/**
 * Misma cascada que el original: la primera regla que se cumple gana. `money` es el
 * formateador de la vista (es-CO, COP o USD). Los emojis del original pasan a íconos.
 */
export function coach(
  S: CopilotState,
  money: (n: number) => string,
): CoachStep {
  if (S.products.length < 3)
    return {
      icon: "zap",
      text: [
        { t: "Carga al menos 3 productos candidatos. Con el " },
        { t: "alta rápida", b: true },
        { t: " solo necesitas el nombre, el costo de Dropi y la categoría." },
      ],
      action: { kind: "alta", label: "Alta rápida" },
    };
  const p = activeProduct(S),
    g = E.gate(p, S.risk),
    a = E.agg(prodTests(S, p.id));
  let R: ReturnType<typeof E.pricing> | null = null;
  try {
    R = E.pricing(pcQ(S, p));
  } catch {
    R = null;
  }
  if (!p.costoReal && !p.sku && !p.linkDropi && !a)
    return {
      icon: "search",
      text: [
        { t: `${p.nombre}:`, b: true },
        {
          t: " los costos son estimados. Busca el producto en Dropi y carga el costo real y el link en la ficha.",
        },
      ],
      action: {
        kind: "go",
        label: "Ir a la ficha",
        tab: "producto",
        vista: "ficha",
      },
    };
  if (!g.pass)
    return {
      icon: "calculator",
      text: [
        { t: `${p.nombre} no deja margen suficiente`, b: true },
        { t: ` para tu riesgo ${S.risk}/10. Mira qué precio lo vuelve sano.` },
      ],
      action: {
        kind: "go",
        label: "Precio y margen",
        tab: "producto",
        vista: "precio",
      },
    };
  if (R && R.pMin && p.precio < R.pMin)
    return {
      icon: "coins",
      text: [
        {
          t: `Tu precio (${money(p.precio)}) está por debajo del mínimo saludable (${money(R.pMin)}). El recomendado es `,
        },
        { t: money(R.rec ?? NaN), b: true },
        { t: "." },
      ],
      action: {
        kind: "go",
        label: "Revisar precio",
        tab: "producto",
        vista: "precio",
      },
    };
  if (!((p.upTasa as number) > 0))
    return {
      icon: "gift",
      text: [
        { t: "Agrega un combo o un upsell a " },
        { t: p.nombre, b: true },
        { t: ": sube el ticket y te deja pagar más por cada pedido." },
      ],
      action: {
        kind: "go",
        label: "Ver ofertas",
        tab: "marketing",
        vista: "ofertas",
      },
    };
  if (!a)
    return {
      icon: "film",
      text: [
        { t: "Todo listo para testear " },
        { t: p.nombre, b: true },
        {
          t: `: graba 3 videos con la matriz de creativos y lanza con ${money(Math.max(20000, Math.round(g.presTest / 4 / 1000) * 1000))} diarios.`,
        },
      ],
      action: {
        kind: "go",
        label: "Plan de lanzamiento",
        tab: "marketing",
        vista: "lanz",
      },
    };
  const v = E.verdict(a, (p.meta as number) || 20, S.risk, p);
  if (/matar/i.test(v.label)) {
    const nxt = S.products
      .filter((x) => x.id !== p.id && !/Descartado/.test(x.etapa))
      .map((x) => ({ x, ev: E.evaluate(x, S.risk) }))
      .sort((m, n) => n.ev.total - m.ev.total)[0];
    return {
      icon: "octagon",
      text: [
        { t: `Mata el test de ${p.nombre}`, b: true },
        { t: " y pasa al siguiente" },
        ...(nxt
          ? [
              { t: ": " },
              { t: nxt.x.nombre, b: true },
              { t: ` (puntaje ${nxt.ev.total})` },
            ]
          : []),
        { t: "." },
      ],
      action: nxt
        ? {
            kind: "go",
            label: "Abrir siguiente",
            tab: "producto",
            activate: nxt.x.id,
          }
        : null,
    };
  }
  if (/Escalar/.test(v.label))
    return {
      icon: "rocket",
      text: [
        { t: `${p.nombre} está ganando.`, b: true },
        {
          t: ` Sube el presupuesto ${E.rules(S.risk).subida}% cada 2–3 días y simula cuánto reinvertir.`,
        },
      ],
      action: { kind: "go", label: "Simular crecimiento", tab: "crecer" },
    };
  return {
    icon: "trending",
    text: [
      { t: `${p.nombre}: ${v.label.toLowerCase()}.`, b: true },
      { t: ` ${v.why} Revisa el diagnóstico para saber qué mejorar primero.` },
    ],
    action: {
      kind: "go",
      label: "Ver diagnóstico",
      tab: "producto",
      vista: "ana",
    },
  };
}

/** Tono de un veredicto guardado (los tests guardan solo la etiqueta). Mismos tonos que E.verdict. */
export function verdictTone(label: string): "g" | "a" | "r" | "b" {
  if (/^Escalar/.test(label)) return "g";
  if (/Optimizar|Mantener/.test(label)) return "a";
  if (/matar/i.test(label)) return "r";
  return "b";
}
