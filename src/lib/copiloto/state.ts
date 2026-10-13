/**
 * Estado del Co-Piloto con la misma forma lógica que `S` del original (CoPiloto_Trendo_v5.html,
 * L590–620): así un respaldo JSON del original entra y sale sin perder nada.
 *
 * Las constantes de este archivo (productos por defecto, PDEF, PRESET y formularios) se
 * generaron evaluando ese bloque del original; no se escribieron a mano.
 */
import { z } from "zod";
import type { CopProduct, SavedTest } from "./engine";

export const STATE_VERSION = 4;

export const ETAPAS = [
  "Idea",
  "Investigando",
  "Validado",
  "En test",
  "Ganador",
  "Escalando",
  "Pausado",
  "Descartado",
] as const;
export type Etapa = (typeof ETAPAS)[number];

export const CATS = [
  "Hogar",
  "Bienestar",
  "Belleza",
  "Mascotas",
  "Tecnología",
  "Fitness",
  "Cocina",
  "Auto",
  "Bebés",
  "Otro",
] as const;

/** Productos con los que empieza una cuenta nueva (DEF_PRODUCTS, L592). */
export const DEF_PRODUCTS = [
  {
    id: "ojos",
    nombre: "Masajeador de ojos térmico",
    costo: 56000,
    precio: 129900,
    flete: 16000,
    fleteRet: 0,
    entrega: 75,
    com: 3,
  },
  {
    id: "cuello",
    nombre: "Masajeador de cuello EMS",
    costo: 40000,
    precio: 99900,
    flete: 16000,
    fleteRet: 0,
    entrega: 75,
    com: 3,
  },
  {
    id: "lampara",
    nombre: "Lámpara proyector",
    costo: 26000,
    precio: 69900,
    flete: 16000,
    fleteRet: 0,
    entrega: 75,
    com: 3,
  },
  {
    id: "mopa",
    nombre: "Mopa giratoria con balde",
    costo: 43000,
    precio: 89900,
    flete: 18000,
    fleteRet: 0,
    entrega: 75,
    com: 3,
  },
  {
    id: "difusor",
    nombre: "Difusor humidificador LED",
    costo: 30000,
    precio: 69900,
    flete: 16000,
    fleteRet: 0,
    entrega: 75,
    com: 3,
  },
  {
    id: "mascarilla",
    nombre: "Mascarilla hidroplástica",
    costo: 13000,
    precio: 49900,
    flete: 16000,
    fleteRet: 0,
    entrega: 75,
    com: 3,
  },
];

/** Campos por defecto de cualquier producto (PDEF, L605). */
export const PDEF = {
  sku: "",
  categoria: "Hogar",
  subnicho: "Ambiente y bienestar",
  etapa: "Investigando",
  proveedor: "Dropi",
  stock: 0,
  linkDropi: "",
  linkRef: "",
  linkAd: "",
  fecha: "",
  ancla: 0,
  upPrecio: 0,
  upCosto: 0,
  upTasa: 0,
  meta: 20,
  conf: 90,
  empaque: 1000,
  costoConf: 0,
  imp: 0,
  beneficio: "",
  dolor: "",
  publico: "",
  angulos: "",
  objeciones: "",
  competidores: 0,
  precioComp: 0,
  invima: "No sé",
  notas: "",
  score: {
    wow: 3,
    problema: 3,
    valor: 3,
    demanda: 3,
    competencia: 3,
    envio: 3,
    recompra: 3,
    creativos: 3,
    devol: 3,
    prov: 3,
  },
};

/** Preajustes de los productos por defecto (PRESET, L608). */
export const PRESET: Record<string, Partial<Product>> = {
  ojos: {
    beneficio: "Descanso visual y mejor sueño en 15 minutos",
    dolor: "Ojos cansados y tensión por pasar horas frente a pantallas",
    categoria: "Bienestar",
    ancla: 179900,
    publico: "Adultos 25–55 con muchas horas de pantalla",
    angulos: "Descansa la vista y duerme mejor · regalo de autocuidado",
    invima: "No sé",
    score: {
      wow: 3,
      problema: 4,
      valor: 4,
      demanda: 4,
      competencia: 4,
      envio: 4,
      recompra: 2,
      creativos: 3,
      devol: 3,
      prov: 3,
    },
  },
  cuello: {
    beneficio: "Alivio del dolor de cuello y hombros en casa",
    dolor: "Tensión y dolor de cuello por trabajar sentado o usar el celular",
    categoria: "Bienestar",
    ancla: 149900,
    publico: "Oficinistas y trabajadores remotos con tensión en cuello",
    angulos: "Adiós al dolor de cuello sin ir al masajista",
    invima: "No sé",
    score: {
      wow: 4,
      problema: 5,
      valor: 4,
      demanda: 4,
      competencia: 3,
      envio: 4,
      recompra: 2,
      creativos: 3,
      devol: 3,
      prov: 3,
    },
  },
  lampara: {
    beneficio: "Un cuarto con ambiente increíble en segundos",
    dolor: "Un cuarto aburrido y sin ambiente",
    categoria: "Hogar",
    ancla: 99900,
    publico: "Jóvenes 18–35, parejas, gamers",
    angulos: "Transforma tu cuarto en segundos",
    invima: "No",
    score: {
      wow: 5,
      problema: 2,
      valor: 4,
      demanda: 4,
      competencia: 2,
      envio: 4,
      recompra: 2,
      creativos: 5,
      devol: 4,
      prov: 3,
    },
  },
  mopa: {
    beneficio: "Pisos limpios sin agacharse ni mojarse las manos",
    dolor: "Trapear es cansado, lento y deja las manos sucias",
    categoria: "Hogar",
    ancla: 129900,
    publico: "Amas y amos de casa 30–60",
    angulos: "Limpia sin agacharte ni mojarte las manos",
    invima: "No",
    score: {
      wow: 4,
      problema: 4,
      valor: 4,
      demanda: 3,
      competencia: 2,
      envio: 2,
      recompra: 2,
      creativos: 4,
      devol: 3,
      prov: 3,
    },
  },
  difusor: {
    beneficio: "Aroma y luz que convierten el cuarto en un spa",
    dolor: "Estrés y ambiente cargado en la casa",
    categoria: "Hogar",
    ancla: 99900,
    publico: "Mujeres 20–45 interesadas en bienestar y decoración",
    angulos: "Tu cuarto convertido en spa",
    invima: "No",
    score: {
      wow: 4,
      problema: 3,
      valor: 4,
      demanda: 4,
      competencia: 3,
      envio: 4,
      recompra: 3,
      creativos: 4,
      devol: 3,
      prov: 3,
    },
  },
  mascarilla: {
    beneficio: "Piel hidratada y luminosa en 15 minutos",
    dolor: "Piel opaca, reseca y sin tiempo para ir al spa",
    categoria: "Belleza",
    ancla: 79900,
    publico: "Mujeres 20–45 interesadas en skincare",
    angulos: "Spa facial en casa en 15 minutos",
    invima: "Sí",
    score: {
      wow: 3,
      problema: 3,
      valor: 3,
      demanda: 3,
      competencia: 2,
      envio: 5,
      recompra: 4,
      creativos: 3,
      devol: 4,
      prov: 3,
    },
  },
};

/** Formularios y ajustes por defecto (DEF, L599–602). `tab`, `marca`, `pc` y `mk` los agrega el original al usarlos. */
export const DEF_FORMS = {
  ptab: "ficha",
  pf: {
    q: "",
    etapa: "",
    sort: "score",
  },
  risk: 5,
  trm: 3300,
  active: "ojos",
  testForm: {
    nombre: "",
    canal: "TikTok Ads",
    fecha: "",
    dias: 5,
    ads: "",
    imp: "",
    clics: "",
    ped: "",
    conf: "",
    ent: "",
    aov: "",
    meta: 20,
  },
  planForm: {
    unidad: "mes",
    R: 10000000,
    modo: "pct",
    m: 35,
    fijos: 200000,
    cap: 3300000,
    N: 4,
    ret: 25,
    ree: 12,
  },
  simForm: {
    cpa: null,
    deg: 20,
    tope: 300000,
    cap: 3300000,
    asig: 72,
    reinv: 72,
    fijos: 200000,
    ciclo: 10,
    ntest: 3,
    meses: 6,
    cdt: 9,
  },
};

export type Score = (typeof PDEF)["score"];
export interface Product extends CopProduct {
  id: string;
  nombre: string;
  etapa: string;
  fecha: string;
  score: Score;
  costoReal?: boolean;
  [k: string]: unknown;
}

export interface Test extends SavedTest {
  id: string;
  ts: number;
  risk: number;
  productId: string | null;
  producto: string;
  form: Record<string, unknown>;
  c: Record<string, unknown>;
  verdict: string;
  meta: number;
}

export interface Saved {
  id: string;
  ts: number;
  tipo: "Plan" | "Simulación";
  risk: number;
  producto?: string;
  form: Record<string, unknown>;
  resumen: Record<string, unknown>;
}

export type TestForm = typeof DEF_FORMS.testForm;
export type PlanForm = typeof DEF_FORMS.planForm;
export type SimForm = Omit<typeof DEF_FORMS.simForm, "cpa"> & {
  cpa: number | null;
};

export interface CopilotState {
  v: 4;
  tab: string;
  ptab: string;
  pf: { q: string; etapa: string; sort: string };
  risk: number;
  cur: "COP" | "USD";
  trm: number;
  active: string;
  marca: string;
  products: Product[];
  tests: Test[];
  plans: Saved[];
  sims: Saved[];
  checks: Record<string, boolean>;
  testForm: Record<string, unknown>;
  planForm: Record<string, unknown>;
  simForm: Record<string, unknown>;
  /** Supuestos de Precio y margen por producto (S.pc). */
  pc: Record<string, Record<string, unknown>>;
  /** Marketing por producto (S.mk): pestaña, ángulo y ediciones de ofertas. */
  mk: Record<string, Record<string, unknown>>;
}

/** withDefaults (L614): PDEF + preajuste + producto, con el puntaje combinado y fecha de alta. */
export function withDefaults(
  p: Partial<Product> & { id: string },
  today: string,
): Product {
  const pr = PRESET[p.id] ?? {};
  return {
    ...PDEF,
    ...pr,
    ...p,
    score: {
      ...PDEF.score,
      ...((pr.score as Partial<Score>) ?? {}),
      ...((p.score as Partial<Score>) ?? {}),
    },
    fecha: (p.fecha as string) || today,
  } as Product;
}

/** Estado inicial de una cuenta nueva (DEF del original con los 6 productos y sus preajustes). */
export function defaultState(today: string): CopilotState {
  const f = structuredClone(DEF_FORMS);
  return {
    ...f,
    v: 4,
    cur: "COP",
    tab: "ruta",
    marca: "",
    products: DEF_PRODUCTS.map((p) => withDefaults(p, today)),
    tests: [],
    plans: [],
    sims: [],
    checks: {},
    pc: {},
    mk: {},
  } as CopilotState;
}

/* ───────────── Validación de respaldos ───────────── */

const id = z.string().min(1).max(64);
const finite = z.number().finite();
const text = (max = 5000) => z.string().max(max);
const obj = z.record(z.string().max(64), z.unknown());

export const productSchema = z
  .object({
    id,
    nombre: text(200),
    costo: finite,
    precio: finite,
    flete: finite,
    fleteRet: finite,
    entrega: finite,
    com: finite,
  })
  .passthrough();

export const testSchema = z
  .object({
    id,
    ts: finite,
    risk: finite.optional(),
    productId: id.nullable().optional(),
    producto: text(200).optional(),
    form: obj,
    c: obj,
    verdict: text(80).optional(),
    meta: finite.optional(),
  })
  .passthrough();

export const savedSchema = z
  .object({
    id,
    ts: finite,
    tipo: text(40),
    risk: finite.optional(),
    producto: text(200).optional(),
    form: obj,
    resumen: obj,
  })
  .passthrough();

/** Forma mínima de un respaldo v3 o v4 del original. Lo desconocido se conserva tal cual. */
export const backupSchema = z
  .object({
    v: z.union([z.literal(3), z.literal(4)]),
    products: z.array(productSchema).min(1).max(500),
    tests: z.array(testSchema).max(5000).default([]),
    plans: z.array(savedSchema).max(1000).default([]),
    sims: z.array(savedSchema).max(1000).default([]),
    risk: finite.min(1).max(10).default(5),
    cur: z.enum(["COP", "USD"]).default("COP"),
    trm: finite.positive().default(3300),
    active: text(64).optional(),
    marca: text(120).default(""),
    tab: text(20).default("ruta"),
    ptab: text(20).default("ficha"),
    pf: z
      .object({
        q: text(200).default(""),
        etapa: text(40).default(""),
        sort: text(20).default("score"),
      })
      .passthrough()
      .default({ q: "", etapa: "", sort: "score" }),
    checks: z.record(z.string().max(16), z.boolean()).default({}),
    testForm: obj.optional(),
    planForm: obj.optional(),
    simForm: obj.optional(),
    pc: z.record(id, obj).default({}),
    mk: z.record(id, obj).default({}),
  })
  .passthrough();

export class BackupError extends Error {}

/**
 * Lee un respaldo (JSON del original o de Crece Millo). Como importJSON (L1141): acepta v3
 * (lo migra a v4) o v4; cualquier otra cosa es «Archivo no válido». Además valida la forma,
 * que el original no revisaba, y descarta claves de pc/mk o tests de productos que no existan
 * solo cuando no hay forma de conservarlos (los tests de productos borrados se conservan).
 */
export function parseBackup(raw: unknown, today: string): CopilotState {
  const r = backupSchema.safeParse(raw);
  if (!r.success)
    throw new BackupError(
      "Archivo no válido: no es un respaldo del Co-Piloto.",
    );
  const d = r.data;
  const ids = new Set<string>();
  for (const p of d.products) {
    if (ids.has(p.id))
      throw new BackupError(
        `Archivo no válido: el producto ${p.id} está repetido.`,
      );
    ids.add(p.id);
  }
  // El original aplica withDefaults a todo estado que carga (L617), sea v3 o v4.
  const products = d.products.map((p) => withDefaults(p as Product, today));
  const base = defaultState(today);
  return {
    ...d,
    v: 4,
    ptab: d.v === 3 ? "ficha" : d.ptab,
    pf:
      d.v === 3
        ? { q: "", etapa: "", sort: "score" }
        : (d.pf as CopilotState["pf"]),
    products,
    active: d.active && ids.has(d.active) ? d.active : products[0]!.id,
    testForm: { ...base.testForm, ...(d.testForm ?? {}) },
    planForm: { ...base.planForm, ...(d.planForm ?? {}) },
    simForm: { ...base.simForm, ...(d.simForm ?? {}) },
    tests: d.tests as Test[],
    plans: d.plans as Saved[],
    sims: d.sims as Saved[],
  } as CopilotState;
}
