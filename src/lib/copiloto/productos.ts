/**
 * Productos: lógica de la interfaz del original (L688–780) sin cambios de reglas.
 * Las cifras se arman con el motor; aquí solo se ordena, filtra y redacta.
 */
import {
  E,
  type Aggregate,
  type Gate,
  type Tone,
  type Verdict,
} from "./engine";
import { prodTests } from "./logic";
import {
  CATS,
  ETAPAS,
  withDefaults,
  type CopilotState,
  type Product,
} from "./state";

export type FieldType =
  | "text"
  | "number"
  | "select"
  | "date"
  | "url"
  | "textarea";
export interface FichaField {
  k: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
}

/** Campos de la ficha en sus 3 grupos (FICHA, L690). */
export const FICHA: [string, FichaField[]][] = [
  [
    "Identificación",
    [
      { k: "nombre", label: "Nombre", type: "text" },
      { k: "etapa", label: "Etapa", type: "select", options: ETAPAS },
      { k: "categoria", label: "Categoría", type: "select", options: CATS },
      { k: "subnicho", label: "Sub-nicho", type: "text" },
      { k: "sku", label: "SKU / ID en Dropi", type: "text" },
      { k: "proveedor", label: "Proveedor / bodega", type: "text" },
      { k: "stock", label: "Stock del proveedor", type: "number" },
      { k: "fecha", label: "Fecha de alta", type: "date" },
      { k: "linkDropi", label: "Link en Dropi", type: "url" },
      {
        k: "linkRef",
        label: "Link de referencia (AliExpress, Amazon)",
        type: "url",
      },
      { k: "linkAd", label: "Anuncio de la competencia", type: "url" },
    ],
  ],
  [
    "Economía",
    [
      { k: "costo", label: "Costo proveedor (COP)", type: "number" },
      { k: "precio", label: "Precio de venta", type: "number" },
      { k: "ancla", label: "Precio tachado (ancla)", type: "number" },
      { k: "flete", label: "Flete por pedido", type: "number" },
      { k: "fleteRet", label: "Flete de retorno", type: "number" },
      { k: "entrega", label: "% de entrega esperado", type: "number" },
      { k: "com", label: "Comisión Dropi / pasarela %", type: "number" },
      {
        k: "imp",
        label: "Impuestos / retenciones % sobre recaudo",
        type: "number",
      },
      { k: "conf", label: "% de confirmación esperado", type: "number" },
      { k: "empaque", label: "Empaque e insertos por pedido", type: "number" },
      {
        k: "costoConf",
        label: "Costo de confirmación por pedido",
        type: "number",
      },
      { k: "upPrecio", label: "Precio del upsell / combo", type: "number" },
      { k: "upCosto", label: "Costo del upsell", type: "number" },
      { k: "upTasa", label: "% de clientes que lo toma", type: "number" },
      { k: "meta", label: "Rentabilidad objetivo %", type: "number" },
    ],
  ],
  [
    "Mercado y estrategia",
    [
      { k: "publico", label: "Público objetivo", type: "textarea" },
      {
        k: "beneficio",
        label: "Beneficio principal (lo que gana el cliente)",
        type: "textarea",
      },
      { k: "dolor", label: "Problema que resuelve", type: "textarea" },
      { k: "angulos", label: "Ángulos de venta", type: "textarea" },
      { k: "objeciones", label: "Objeciones principales", type: "textarea" },
      {
        k: "competidores",
        label: "Tiendas competidoras vistas",
        type: "number",
      },
      {
        k: "precioComp",
        label: "Precio promedio de la competencia",
        type: "number",
      },
      {
        k: "invima",
        label: "Requiere permiso sanitario (INVIMA)",
        type: "select",
        options: ["No", "Sí", "No sé"],
      },
      { k: "notas", label: "Notas", type: "textarea" },
    ],
  ],
];
export const NUMK = new Set(
  FICHA.flatMap(([, fs]) => fs)
    .filter((f) => f.type === "number")
    .map((f) => f.k),
);

/** num() del original: texto → número; vacío o inválido → 0. */
export const num = (v: unknown) => {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
};

export const CANALES = [
  "TikTok Ads",
  "Meta Ads",
  "Orgánico TikTok",
  "Orgánico Reels",
  "Otro",
] as const;

/** Sugerencia: veredicto del agregado de sus tests, o «Sin datos» (suggestion, L703). */
export function suggestion(
  S: CopilotState,
  p: Product,
): Verdict | { label: "Sin datos"; tone: "b"; why?: undefined } {
  const a = E.agg(prodTests(S, p.id));
  if (!a) return { label: "Sin datos", tone: "b" };
  return E.verdict(a, (p.meta as number) || 20, S.risk, p);
}

/** Etapa que corresponde a cada veredicto (STAGE_FROM, L704). */
export const STAGE_FROM: Record<string, string> = {
  Escalar: "Escalando",
  "Escalar con cautela": "Ganador",
  "Mantener y optimizar": "En test",
  Optimizar: "En test",
  "Pausar / matar": "Descartado",
  "Seguir midiendo": "En test",
};

/** Tono de la etapa (etTag, L705): ganador = bien, test/validado = atención, descartado/pausado = riesgo. */
export function etapaTone(e: string): Tone | null {
  if (/Ganador|Escalando/.test(e)) return "g";
  if (/Descartado|Pausado/.test(e)) return "r";
  if (/En test|Validado/.test(e)) return "a";
  return null;
}
export const claseTone = (c: string): Tone =>
  c === "A" ? "g" : c === "B" ? "a" : "r";
export const claseText = (c: string) =>
  c === "A"
    ? "testear ya"
    : c === "B"
      ? "testear si no hay clase A"
      : "no testear así";

/* ───────────── Base de datos (renderPortfolio, L707) ───────────── */

export interface PortfolioRow {
  p: Product;
  ev: ReturnType<typeof E.evaluate>;
  a: Aggregate | null;
  sg: ReturnType<typeof suggestion>;
}

export function portfolio(S: CopilotState) {
  const rows: PortfolioRow[] = S.products.map((p) => ({
    p,
    ev: E.evaluate(p, S.risk),
    a: E.agg(prodTests(S, p.id)),
    sg: suggestion(S, p),
  }));
  const A = rows.map((r) => r.a).filter((a): a is Aggregate => !!a);
  const T = (k: "ads" | "ingresos" | "neta") => A.reduce((s, a) => s + a[k], 0);
  return {
    rows,
    kpis: {
      productos: S.products.length,
      claseA: rows.filter((r) => r.ev.clase === "A").length,
      claseB: rows.filter((r) => r.ev.clase === "B").length,
      enTest: S.products.filter((p) => p.etapa === "En test").length,
      ganadores: S.products.filter((p) => /Ganador|Escalando/.test(p.etapa))
        .length,
      conDatos: A.length,
      ads: T("ads"),
      ingresos: T("ingresos"),
      neta: T("neta"),
    },
  };
}

export const SORTS = [
  { key: "score", label: "Ordenar por puntaje" },
  { key: "neta", label: "Utilidad neta real" },
  { key: "up", label: "Utilidad por pedido" },
  { key: "gasto", label: "Gasto en ads" },
  { key: "nombre", label: "Nombre" },
] as const;

export function filterSort(rows: PortfolioRow[], pf: CopilotState["pf"]) {
  const q = (pf.q || "").toLowerCase();
  const L = rows.filter(
    (r) =>
      (!q ||
        `${r.p.nombre} ${r.p.categoria} ${r.p.subnicho}`
          .toLowerCase()
          .includes(q)) &&
      (!pf.etapa || r.p.etapa === pf.etapa),
  );
  const key: Record<string, (r: PortfolioRow) => number | string> = {
    score: (r) => -r.ev.total,
    neta: (r) => -(r.a ? r.a.neta : -1e12),
    up: (r) => -r.ev.g.u.utilidadPedido,
    gasto: (r) => -(r.a ? r.a.ads : 0),
    nombre: (r) => r.p.nombre,
  };
  const k = key[pf.sort] ?? key.score!;
  return [...L].sort((x, y) => {
    const a = k(x),
      b = k(y);
    return typeof a === "string"
      ? a.localeCompare(b as string)
      : (a as number) - (b as number);
  });
}

/* ───────────── Altas (newProduct y duplicateProduct, L766–767) ───────────── */

export function blankProduct(today: string, now = Date.now()): Product {
  // Ficha dinámica: lo que no llena la persona se autocompleta (ver autoficha.ts).
  return { ...blank(today, now), auto: true, manual: [], ia: [] };
}

function blank(today: string, now: number): Product {
  return withDefaults(
    {
      id: `p${now}`,
      nombre: "Nuevo producto",
      costo: 0,
      precio: 0,
      flete: 16000,
      fleteRet: 0,
      entrega: 75,
      com: 3,
      etapa: "Idea",
      fecha: today,
    } as Product,
    today,
  );
}

export function duplicate(
  p: Product,
  today: string,
  now = Date.now(),
): Product {
  const c = structuredClone(p);
  return {
    ...c,
    id: `p${now}`,
    nombre: `${p.nombre} (copia)`,
    etapa: "Idea",
    fecha: today,
  };
}

/* ───────────── Resultados de venta (resInput y saveResult, L731–735) ───────────── */

export interface ResForm {
  fecha: string;
  canal: string;
  dias: string;
  ads: string;
  imp: string;
  clics: string;
  ped: string;
  conf: string;
  ent: string;
  aov: string;
  notas: string;
}
export const emptyRes = (today: string): ResForm => ({
  fecha: today,
  canal: CANALES[0],
  dias: "",
  ads: "",
  imp: "",
  clics: "",
  ped: "",
  conf: "",
  ent: "",
  aov: "",
  notas: "",
});

export function resInput(v: ResForm, today: string) {
  return {
    fecha: v.fecha || today,
    canal: v.canal,
    dias: num(v.dias),
    ads: num(v.ads),
    imp: num(v.imp),
    clics: num(v.clics),
    ped: num(v.ped),
    conf: v.conf === "" ? null : num(v.conf),
    ent: v.ent === "" ? null : num(v.ent),
    aov: num(v.aov),
    notas: v.notas,
  };
}

/** Test nuevo desde Resultados de venta, con la misma forma que el original. */
export function resultTest(
  S: CopilotState,
  p: Product,
  v: ResForm,
  today: string,
  now = Date.now(),
) {
  const f = resInput(v, today);
  const c = E.test(f, p);
  const meta = (p.meta as number) || 20;
  const verdict = E.verdict(c, meta, S.risk, p);
  return {
    id: `t${now}`,
    ts: Date.parse(`${f.fecha}T12:00:00`) || now,
    risk: S.risk,
    productId: p.id,
    producto: p.nombre,
    form: { nombre: f.notas || `${f.canal} ${f.fecha}`, ...f, meta },
    c: c as unknown as Record<string, unknown>,
    verdict: verdict.label,
    meta,
  };
}

/** Etapas que pasan a «En test» al registrar un resultado. */
export const TO_EN_TEST = ["Idea", "Investigando", "Validado"];

/* ───────────── Análisis y estrategia (renderAnalysis, L741–763) ───────────── */

export interface Fmt {
  money: (n: number) => string;
  pct: (n: number) => string;
  x: (n: number) => string;
}

/** Esperado vs. real: 5 filas; «mejor o igual» con las mismas tolerancias del original. */
export function expectedVsReal(a: Aggregate, g: Gate, f: Fmt) {
  const U = g.u;
  return [
    {
      m: "% de entrega",
      e: f.pct(U.e),
      r: f.pct(a.tasaEntrega),
      ok: a.tasaEntrega >= U.e,
    },
    {
      m: "Ticket promedio",
      e: f.money(U.aov),
      r: f.money(a.aov),
      ok: a.aov >= U.aov * 0.98,
    },
    {
      m: "Utilidad por pedido",
      e: f.money(U.utilidadPedido),
      r: f.money(a.cpaMax),
      ok: a.cpaMax >= U.utilidadPedido * 0.95,
    },
    {
      m: "CPA",
      e: `${f.money(g.cpaObj)} (objetivo)`,
      r: f.money(a.cpa),
      ok: a.cpa <= g.cpaObj,
    },
    {
      m: "ROAS",
      e: `${f.x(U.roasMin)} (mínimo)`,
      r: f.x(a.roas),
      ok: a.roas >= U.roasMin,
    },
  ];
}

/** Puntos acumulados de la evolución (inicio en cero y un punto por test en orden). */
export function evolution(
  tests: { c: Record<string, unknown>; form: Record<string, unknown> }[],
) {
  let cn = 0,
    ci = 0,
    cg = 0;
  return [{ x: 0, n: 0, i: 0, g: 0, l: "" }].concat(
    tests.map((t, k) => {
      cn += t.c.neta as number;
      ci += t.c.ingresos as number;
      cg += t.c.ads as number;
      return { x: k + 1, n: cn, i: ci, g: cg, l: String(t.form.fecha || "") };
    }),
  );
}

/** Plan de la «Estrategia sugerida» (L761). */
export function strategyPlan(
  v: { label: string },
  g: Gate,
  D: [Tone, string, string][],
  money: (n: number) => string,
) {
  const acts = D.filter((d) => d[0] === "r" || d[0] === "a").slice(0, 3);
  if (/Escalar/.test(v.label))
    return `Hazlo mientras el CPA siga bajo ${money(g.cpaObj)}; duplica el conjunto de anuncios ganador y prueba un público nuevo.`;
  if (/matar/i.test(v.label))
    return "Detén la pauta, documenta lo aprendido y pasa al siguiente producto clase A.";
  return `No subas presupuesto todavía. Ataca primero ${acts.length ? acts.map((x) => x[1].split(" (")[0]!.toLowerCase()).join(", ") : "la muestra"} y vuelve a medir.`;
}
