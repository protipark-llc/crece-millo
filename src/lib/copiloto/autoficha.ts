/**
 * Ficha dinámica (pedido del dueño del producto, 14 oct 2026): la persona llena lo esencial
 * —nombre, costo del proveedor, envíos, comisión y el margen que quiere— y el resto se
 * autocompleta con las mismas reglas de Alta rápida (palabras clave, nicho y calculadora de
 * precio). Lo que la persona edite queda fijo («manual») hasta que lo vuelva a automático.
 * La IA puede afinar los textos, la categoría y los criterios, y armar la estrategia.
 */
import { E } from "./engine";
import { detect, qaBuild } from "./alta";
import { pcDefaults } from "./logic";
import { CATS, type CopilotState, type Product } from "./state";
import type { MentorResult } from "./mentor";

/** Lo que llena la persona. */
export const ESENCIALES = [
  { k: "nombre", label: "Nombre del producto", hint: "Como lo vas a vender." },
  {
    k: "costo",
    label: "Precio del proveedor",
    hint: "Lo que te cobra Dropi por unidad.",
    step: 500,
  },
  {
    k: "flete",
    label: "Envío por pedido",
    hint: "Flete que pagas por cada despacho.",
    step: 500,
  },
  {
    k: "fleteRet",
    label: "Envío de retorno",
    hint: "Lo que pierdes si el cliente no recibe.",
    step: 500,
  },
  {
    k: "com",
    label: "Comisión Dropi / pasarela",
    hint: "Porcentaje sobre lo recaudado.",
    step: 0.5,
    suffix: "%",
  },
  {
    k: "meta",
    label: "Margen que quieres",
    hint: "Rentabilidad neta mínima, después de la publicidad. Si el precio óptimo ya la cumple, no sube.",
    step: 1,
    suffix: "%",
  },
] as const;
export type EsencialKey = (typeof ESENCIALES)[number]["k"];

/** Lo que se autocompleta, por grupo. */
export const AUTO_GROUPS: {
  t: string;
  fields: {
    k: AutoKey;
    label: string;
    kind: "money" | "pct" | "text" | "area" | "select";
    options?: readonly string[];
  }[];
}[] = [
  {
    t: "Precio y oferta",
    fields: [
      { k: "precio", label: "Precio de venta", kind: "money" },
      { k: "ancla", label: "Precio tachado (ancla)", kind: "money" },
      { k: "upPrecio", label: "Precio del combo 2×", kind: "money" },
      { k: "upCosto", label: "Costo del combo", kind: "money" },
      { k: "upTasa", label: "% que toma el combo", kind: "pct" },
    ],
  },
  {
    t: "Mercado y mensaje",
    fields: [
      { k: "categoria", label: "Categoría", kind: "select", options: CATS },
      {
        k: "invima",
        label: "Permiso sanitario (INVIMA)",
        kind: "select",
        options: ["No", "Sí", "No sé"],
      },
      { k: "publico", label: "Público objetivo", kind: "area" },
      { k: "beneficio", label: "Beneficio principal", kind: "area" },
      { k: "dolor", label: "Problema que resuelve", kind: "area" },
      { k: "angulos", label: "Ángulos de venta", kind: "area" },
      { k: "objeciones", label: "Objeciones", kind: "area" },
    ],
  },
];
export type AutoKey =
  | "precio"
  | "ancla"
  | "upPrecio"
  | "upCosto"
  | "upTasa"
  | "categoria"
  | "invima"
  | "publico"
  | "beneficio"
  | "dolor"
  | "angulos"
  | "objeciones"
  | "score";
export const AUTO_KEYS: AutoKey[] = [
  ...AUTO_GROUPS.flatMap((g) => g.fields.map((f) => f.k)),
  "score",
];

type Meta = {
  auto?: boolean;
  manual?: string[];
  ia?: string[];
  precioVia?: string;
};
const meta = (p: Product) => p as Product & Meta;

export const isAuto = (p: Product) => !!meta(p).auto;
export const isManual = (p: Product, k: string) =>
  (meta(p).manual ?? []).includes(k);
export const isIA = (p: Product, k: string) => (meta(p).ia ?? []).includes(k);

/** Lo que falta de lo esencial (vacío o en cero). */
export function faltantes(p: Product): EsencialKey[] {
  return ESENCIALES.filter(({ k }) =>
    k === "nombre"
      ? !String(p.nombre ?? "").trim() || p.nombre === "Nuevo producto"
      : k === "fleteRet" || k === "com"
        ? false
        : !(Number(p[k]) > 0),
  ).map((x) => x.k);
}

/** Valores automáticos a partir de lo esencial (mismas reglas que Alta rápida). */
export function autoValues(
  S: Pick<CopilotState, "tests" | "risk" | "simForm">,
  p: Product,
): Partial<Product> & { precioVia: string } {
  const d = detect(`${p.nombre} ${p.notas ?? ""}`);
  const cat =
    d?.cat ??
    (CATS.includes(p.categoria as (typeof CATS)[number])
      ? String(p.categoria)
      : "Otro");
  const built = qaBuild(
    {
      nombre: String(p.nombre || "Producto"),
      costo: Math.max(1, p.costo),
      sug: (p.precioComp as number) || 0,
      cat,
      tam: p.flete as number,
      desc: String(p.notas ?? "").replace(/^Dropi: /, ""),
      link: "",
      stock: 0,
      combo: true,
    },
    String(p.fecha || ""),
  )!;
  // Precio: el recomendado de la calculadora con los costos y la comisión de la persona. El margen
  // que pide es un piso: si el recomendado no lo alcanza, se sube al primer precio redondo que sí.
  // Solo costos y supuestos de la persona: nunca el precio ni el tachado ya calculados, que
  // alimentarían el techo y el CPA de partida y harían subir el precio en cada recálculo.
  const base = {
    ...built,
    ...pick(p, [
      "costo",
      "flete",
      "fleteRet",
      "com",
      "imp",
      "empaque",
      "costoConf",
      "conf",
      "entrega",
      "meta",
      "precioComp",
    ]),
    upPrecio: 0,
    upCosto: 0,
    upTasa: 0,
  } as Product;
  const q = pcDefaults(S, base);
  if (!(q.techo > 0)) q.techo = Math.round((base.precio * 1.25) / 1000) * 1000;
  const R = E.pricing(q);
  let precio = R.rec || R.pMin || E.psych(p.costo * 3);
  let precioVia = R.rec
    ? "precio recomendado"
    : R.pMin
      ? "mínimo saludable"
      : "3× el costo";
  const oferta = (P: number) => ({
    precio: P,
    ancla: E.psych(P * 1.4),
    upPrecio: E.psych(P * 0.75),
    upCosto: p.costo,
    upTasa: 20,
  });
  const meta = (p.meta as number) || 0;
  if (meta > 0) {
    // El mismo margen neto que muestra la ficha (qaResult) para el producto ya armado a ese precio.
    const mn = (P: number) => {
      const qq = pcDefaults(S, { ...base, ...oferta(P) } as Product);
      return E.priceEval(
        { ...qq, techo: qq.techo || Math.round((P * 1.25) / 1000) * 1000 },
        P,
      ).mn;
    };
    if (mn(precio) < meta / 100) {
      // Tope: 6× el costo (o 1,3× lo que cobra la competencia). Más arriba no se vende; mejor avisar.
      const tope = Math.max(p.costo * 6, ((p.precioComp as number) || 0) * 1.3);
      let P = precio;
      while (P <= tope && mn(P) < meta / 100) P = E.psych(P + 1);
      if (P <= tope && mn(P) >= meta / 100) {
        precio = P;
        precioVia = `para tu margen de ${meta} %`;
      }
    }
  }
  return {
    ...oferta(precio),
    categoria: cat,
    invima: built.invima,
    publico: built.publico,
    beneficio: built.beneficio,
    dolor: built.dolor,
    angulos: built.angulos,
    objeciones: built.objeciones,
    score: built.score,
    precioVia,
  };
}

function pick(p: Product, keys: string[]) {
  const o: Record<string, unknown> = {};
  for (const k of keys) if (p[k] !== undefined) o[k] = p[k];
  return o;
}

/** Recalcula lo automático que la persona no fijó. Con el autocompletado apagado, no toca nada. */
export function recompute(
  S: Pick<CopilotState, "tests" | "risk" | "simForm">,
  p: Product,
): Product {
  if (!isAuto(p) || p.costo <= 0) return p;
  const v = autoValues(S, p);
  const m = new Set(meta(p).manual ?? []);
  const ia = new Set(meta(p).ia ?? []);
  const out = { ...p } as Product & Meta;
  for (const k of AUTO_KEYS)
    if (!m.has(k) && !ia.has(k))
      (out as Record<string, unknown>)[k] = (v as Record<string, unknown>)[k];
  out.precioVia = v.precioVia;
  return out;
}

/** Cambio de un campo: lo esencial recalcula lo automático; un campo automático editado queda fijo. */
export function editField(
  S: Pick<CopilotState, "tests" | "risk" | "simForm">,
  p: Product,
  k: string,
  value: unknown,
): Product {
  const next = { ...p, [k]: value } as Product & Meta;
  if ((AUTO_KEYS as string[]).includes(k) && isAuto(p)) {
    next.manual = [...new Set([...(meta(p).manual ?? []), k])];
    next.ia = (meta(p).ia ?? []).filter((x) => x !== k);
  }
  return recompute(S, next);
}

/** Vuelve un campo a automático. */
export function backToAuto(
  S: Pick<CopilotState, "tests" | "risk" | "simForm">,
  p: Product,
  k: string,
): Product {
  const next = {
    ...p,
    manual: (meta(p).manual ?? []).filter((x) => x !== k),
    ia: (meta(p).ia ?? []).filter((x) => x !== k),
  } as Product;
  return recompute(S, next);
}

/**
 * Enciende el autocompletado. Lo que ya tenía datos queda fijo (no se pisa lo que la persona
 * llenó antes); lo vacío se autocompleta.
 */
export function enableAuto(
  S: Pick<CopilotState, "tests" | "risk" | "simForm">,
  p: Product,
): Product {
  const filled = AUTO_KEYS.filter((k) => {
    if (k === "score" || k === "categoria" || k === "invima") return false;
    const v = p[k];
    return typeof v === "number" ? v > 0 : String(v ?? "").trim() !== "";
  });
  return recompute(S, { ...p, auto: true, manual: filled, ia: [] } as Product);
}

export const disableAuto = (p: Product): Product =>
  ({ ...p, auto: false }) as Product;

/** Aplica «Completar con IA» sin tocar el nombre ni lo que la persona fijó; marca lo que puso la IA. */
export function applyIA(p: Product, j: MentorResult<"alta">): Product {
  const out = { ...p, score: { ...p.score } } as Product & Meta;
  const manual = new Set(meta(p).manual ?? []);
  const ia = new Set(meta(p).ia ?? []);
  const set = (k: AutoKey, v: unknown) => {
    if (manual.has(k) || v === undefined || v === "") return;
    (out as Record<string, unknown>)[k] = v;
    ia.add(k);
  };
  set("publico", j.publico);
  set("beneficio", j.beneficio);
  set("dolor", j.dolor);
  if (j.angulos?.length) set("angulos", j.angulos.join(" · "));
  if (j.objeciones?.length) set("objeciones", j.objeciones.join("\n"));
  if ((CATS as readonly string[]).includes(j.categoria))
    set("categoria", j.categoria);
  if (["No", "Sí", "No sé"].includes(j.invima)) set("invima", j.invima);
  if (!manual.has("score")) {
    E.CRIT.forEach(([k]) => {
      const v = +((j.score as Record<string, number>)[k] ?? NaN);
      if (v >= 1 && v <= 5)
        (out.score as Record<string, number>)[k] = Math.round(v);
    });
    ia.add("score");
  }
  out.ia = [...ia];
  return out;
}

/** Lo que «Mejorar textos con IA» de Alta rápida deja marcado como de la IA. */
export const IA_KEYS: AutoKey[] = [
  "publico",
  "beneficio",
  "dolor",
  "angulos",
  "objeciones",
  "categoria",
  "invima",
  "score",
];

/** Marca como fijos campos que otra pantalla cambió a mano (precio aplicado, oferta usada, criterios). */
export function fijar(p: Product, keys: readonly string[]): Partial<Product> {
  if (!isAuto(p)) return {};
  const ks = keys.filter((k) => (AUTO_KEYS as string[]).includes(k));
  return {
    manual: [...new Set([...(meta(p).manual ?? []), ...ks])],
    ia: (meta(p).ia ?? []).filter((x) => !ks.includes(x)),
  } as Partial<Product>;
}
