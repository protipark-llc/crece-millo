/**
 * Precio y margen (renderPricing y buildPricingForm, L781–848 de CoPiloto_Trendo_v5.html).
 * Datos y cálculos de la pantalla; el motor (E.pricing, E.priceEval, E.sim) no cambia.
 */
import {
  E,
  type PriceEval,
  type PriceQ,
  type Pricing,
  type SimResult,
} from "./engine";
import type { CopilotState, Product } from "./state";

/** [clave, etiqueta, mínimo, máximo (null = depende del precio), paso] */
export type PcField = [
  k: string,
  label: string,
  min: number,
  max: number | null,
  step: number,
];

export const PCF: [string, PcField[]][] = [
  [
    "Producto",
    [
      ["costo", "Costo proveedor", 0, null, 500],
      ["P", "Precio a evaluar", 0, null, 500],
      ["upPrecio", "Precio del upsell / combo", 0, 200000, 1000],
      ["upCosto", "Costo del upsell", 0, 150000, 500],
      ["upTasa", "% que toma el upsell", 0, 80, 1],
    ],
  ],
  [
    "Publicidad",
    [
      ["cpa0", "CPA al precio de referencia", 1000, null, 500],
      ["p0", "Precio de referencia del CPA", 1000, null, 1000],
      ["elast", "Sensibilidad del CPA al precio", 0, 3, 0.1],
      ["techo", "Techo de precio percibido", 0, null, 1000],
      ["presupuesto", "Pauta mensual", 100000, 20000000, 100000],
    ],
  ],
  [
    "Operación contraentrega",
    [
      ["conf", "% de confirmación", 40, 100, 1],
      ["entrega", "% de entrega", 40, 98, 1],
      ["flete", "Flete por pedido", 0, 40000, 500],
      ["fleteRet", "Flete de retorno", 0, 30000, 500],
      ["empaque", "Empaque e insertos", 0, 15000, 500],
      ["costoConf", "Costo de confirmación por pedido", 0, 5000, 100],
    ],
  ],
  [
    "Costos y márgenes",
    [
      ["com", "Comisión %", 0, 15, 0.5],
      ["imp", "Impuestos / retenciones %", 0, 15, 0.5],
      ["fijosMes", "Costos fijos mensuales", 0, 5000000, 50000],
      ["margenMin", "Margen neto mínimo saludable %", 0, 50, 1],
      ["margenObj", "Margen neto objetivo %", 0, 60, 1],
    ],
  ],
];

/** Campos que son montos de dinero (los demás son %, multiplicadores o conteos). */
export const PC_MONEY = new Set([
  "costo",
  "P",
  "upPrecio",
  "upCosto",
  "cpa0",
  "p0",
  "techo",
  "presupuesto",
  "flete",
  "fleteRet",
  "empaque",
  "costoConf",
  "fijosMes",
]);

export const PCH: Record<string, string> = {
  elast:
    "1,2 = si subes el precio 10%, el CPA sube cerca de 12%. Cuanto más alto, más castiga subir el precio.",
  techo:
    "Precio desde el que el cliente siente que es caro (competencia, precio tachado). Por encima, el CPA sube el doble de rápido. 0 = sin techo.",
  cpa0: "Se llena con tu CPA real cuando tienes 3+ pedidos; si no, con 20% del precio (referencia típica de contraentrega). Ajústalo con tus tests.",
  margenMin:
    "Lo mínimo que debe quedar después de todo (incluida la pauta) para poder reinvertir y escalar.",
  presupuesto: "Lo que invertirías en anuncios al mes con este producto.",
};

/** Máximo de cada control; se calcula al construir el formulario, no en cada movimiento (L792). */
export function sliderMaxes(q: PriceQ): Record<string, number> {
  const R = E.pricing(q);
  const out: Record<string, number> = {};
  for (const [, fs] of PCF)
    for (const [k, , , mx] of fs)
      out[k] =
        mx !== null
          ? mx
          : k === "P" || k === "techo" || k === "p0"
            ? Math.round(R.hi)
            : k === "costo"
              ? Math.max(q.costo * 3, 50000)
              : Math.max(q.cpa0 * 3, 50000);
  return out;
}

/** Supuestos que «Guardar supuestos en la ficha» copia al producto (pcSaveAssumptions, L798). */
export const PC_TO_FICHA = [
  "conf",
  "entrega",
  "flete",
  "fleteRet",
  "empaque",
  "costoConf",
  "com",
  "imp",
  "upPrecio",
  "upCosto",
  "upTasa",
  "costo",
] as const;

export const reinvOf = (S: Pick<CopilotState, "simForm">) =>
  (S.simForm.reinv as number) || 70;

/** Desglose por pedido entregado: [concepto, monto, color] (L827). */
export function breakdown(ev: PriceEval): [string, number, string][] {
  const ce = ev.ce || 1,
    P = ev.parts;
  return (
    [
      ["Producto", P.producto, "var(--ink-2)"],
      ["Flete", P.flete, "var(--muted)"],
      ["Devoluciones", P.devoluciones, "var(--warn)"],
      ["Comisión e impuestos", P.comision, "var(--chart-3)"],
      ["Empaque", P.empaque, "var(--border-strong)"],
      ["Confirmación", P.confirmacion, "var(--surface-3)"],
      ["Publicidad", P.publicidad, "var(--neg)"],
      ["Fijos", P.fijos, "var(--chart-2)"],
      ["Utilidad", P.utilidad, "var(--pos)"],
    ] as [string, number, string][]
  ).map(([n, v, c]) => [n, v / ce, c]);
}

export interface Fmt {
  money: (n: number) => string;
  pct: (n: number) => string;
  x: (n: number) => string;
}

/** Salud del precio: 6 chequeos (H5, L831). */
export function health(
  q: PriceQ & { P: number },
  ev: PriceEval,
  p: Product,
  reinv: number,
  f: Fmt,
): [boolean, string][] {
  const comp = (p.precioComp as number) || 0;
  return [
    [
      q.costo / q.P <= 0.33,
      `Costo del producto ≤ 33% del precio (hoy ${f.pct(q.costo / q.P)} · ${f.x(ev.markup)})`,
    ],
    [
      ev.mc >= 0.45,
      `Margen de contribución antes de pauta ≥ 45% (hoy ${f.pct(ev.mc)})`,
    ],
    [
      ev.mn >= q.margenMin / 100,
      `Margen neto ≥ ${q.margenMin}% (hoy ${f.pct(ev.mn)})`,
    ],
    [
      ev.roas >= 1.3 * ev.roasEq,
      `ROAS con colchón de 30% sobre el equilibrio (hoy ${f.x(ev.roas)} vs. ${f.x(ev.roasEq * 1.3)})`,
    ],
    [
      !(comp > 0) || q.P <= comp * 1.15,
      comp > 0
        ? `Precio ≤ competencia + 15% (competencia ${f.money(comp)})`
        : "Precio de la competencia sin registrar (agrégalo en la ficha)",
    ],
    [
      ev.mes > 0 && (ev.mes * reinv) / 100 / q.presupuesto >= 0.15,
      `La reinversión hace crecer la pauta ≥ 15% al mes (hoy ${ev.mes > 0 ? f.pct((ev.mes * reinv) / 100 / q.presupuesto) : "—"})`,
    ],
  ];
}

export interface PriceSimRow {
  n: string;
  P: number;
  r: SimResult;
  pe: SimResult;
  e: PriceEval;
}

/** «Estrategia de inversión»: cómo crece el capital con cada precio, sin fase de testeo (L835–842). */
export function priceSims(
  S: Pick<CopilotState, "simForm">,
  p: Product,
  q: PriceQ & { P: number },
  R: Pricing,
): { rows: PriceSimRow[]; best: PriceSimRow | undefined } {
  const f = S.simForm as Record<string, number>;
  const pts = (
    [
      ["Precio actual", p.precio],
      ["Mínimo saludable", R.pMin],
      ["Recomendado", R.rec],
      ["Margen objetivo", R.pObj],
      ["Evaluado", q.P],
    ] as [string, number | null][]
  ).filter((x, i, a) => x[1] && a.findIndex((y) => y[1] === x[1]) === i) as [
    string,
    number,
  ][];
  const runSim = (
    P: number,
    over?: (pv: Product, A: number) => Record<string, number>,
  ) => {
    const pv = {
      ...p,
      costo: q.costo,
      precio: P,
      flete: q.flete,
      fleteRet: q.fleteRet,
      empaque: q.empaque,
      costoConf: q.costoConf,
      com: q.com,
      imp: q.imp,
      conf: q.conf,
      entrega: q.entrega,
      upPrecio: q.upPrecio,
      upCosto: q.upCosto,
      upTasa: q.upTasa,
    } as Product;
    return E.sim({
      ...pv,
      cpa: E.cpaAt(q, P),
      deg: f.deg!,
      tope: f.tope!,
      cap: f.cap!,
      asig: f.asig!,
      reinv: f.reinv!,
      fijos: q.fijosMes,
      ciclo: f.ciclo!,
      meses: f.meses!,
      cdt: f.cdt!,
      testeo: 0,
      ...(over ? over(pv, E.cpaAt(q, P)) : {}),
    });
  };
  const rows = pts.map(([n, P]) => ({
    n,
    P,
    r: runSim(P),
    pe: runSim(P, (pv, A) => ({
      entrega: Math.max(1, (pv.entrega as number) - 10),
      cpa: A * 1.25,
    })),
    e: E.priceEval(q, P),
  }));
  const best = rows.reduce<PriceSimRow | undefined>(
    (a, b) => (!a || b.r.patrimonio > a.r.patrimonio ? b : a),
    undefined,
  );
  return { rows, best };
}

/** Tabla de precios: ~22 filas del grid más los precios clave (L844–846). */
export function priceTable(q: PriceQ, R: Pricing): PriceEval[] {
  const G = R.grid;
  const sample = G.filter(
    (_, i) => i % Math.max(1, Math.round(G.length / 22)) === 0,
  );
  [R.rec, R.pMin, R.be, R.pObj]
    .filter((x): x is number => !!x)
    .forEach((P) => {
      if (!sample.some((g) => g.P === P)) sample.push(E.priceEval(q, P));
    });
  return sample.sort((a, b) => a.P - b.P);
}
