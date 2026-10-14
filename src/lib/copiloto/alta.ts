/**
 * Alta rápida de producto (KW, detect, qaParse, qaBuild y qaPrice; L967–1040 del original).
 * Con el nombre y el costo de Dropi calcula precio, márgenes y evaluación y completa los textos.
 */
import { E, type Pricing } from "./engine";
import { NICHE } from "./marketing";
import { pcDefaults } from "./logic";
import { PDEF, withDefaults, type CopilotState, type Product } from "./state";

type Detected = {
  cat: string;
  ben: string;
  dol: string;
  pub: string;
  alt: string;
  inv: string;
  sc?: Record<string, number>;
};

/** Biblioteca de palabras clave → categoría y textos base. La primera coincidencia gana. */
export const KW: [RegExp, Detected][] = [
  [
    /\bcarro|\bauto\b|veh[ií]c|\bmoto\b|para carro|para auto/i,
    {
      cat: "Auto",
      ben: "un carro limpio, ordenado y práctico",
      dol: "un carro sucio, desordenado o incómodo",
      pub: "conductores de 25 a 55 años",
      alt: "lavaderos y accesorios caros",
      inv: "No",
    },
  ],
  [
    /masaj|pistola.*masaje|electroestim|\bems\b|tens\b/i,
    {
      cat: "Bienestar",
      ben: "alivio de la tensión y el dolor muscular sin salir de casa",
      dol: "dolor y tensión muscular por estrés, trabajo o ejercicio",
      pub: "adultos de 25 a 55 años con estrés o dolor muscular",
      alt: "ir al masajista",
      inv: "No sé",
      sc: { problema: 5, wow: 4, valor: 4 },
    },
  ],
  [
    /ojo|ocular|antifaz/i,
    {
      cat: "Bienestar",
      ben: "descanso para la vista y mejor sueño",
      dol: "ojos cansados por pasar horas frente a pantallas",
      pub: "personas que trabajan muchas horas en pantalla",
      alt: "un spa o un tratamiento",
      inv: "No sé",
    },
  ],
  [
    /cuello|cervical|espalda|lumbar|postura|corrector/i,
    {
      cat: "Bienestar",
      ben: "alivio del cuello y la espalda y mejor postura",
      dol: "dolor de cuello y espalda por trabajar sentado o usar el celular",
      pub: "oficinistas y trabajadores remotos",
      alt: "terapias y fisioterapia",
      inv: "No sé",
      sc: { problema: 5 },
    },
  ],
  [
    /almohad|colch|sueño|dormir|ronqu/i,
    {
      cat: "Bienestar",
      ben: "dormir mejor y despertar descansado",
      dol: "noches de mal sueño y cansancio en el día",
      pub: "adultos que duermen mal",
      alt: "un colchón nuevo",
      inv: "No",
    },
  ],
  [
    /humidific|difusor|aroma|esencia/i,
    {
      cat: "Hogar",
      ben: "un ambiente relajante con aroma y luz",
      dol: "estrés y un ambiente cargado en casa",
      pub: "mujeres de 20 a 45 años que cuidan su espacio",
      alt: "velas y ambientadores que se acaban",
      inv: "No",
      sc: { wow: 4, creativos: 4 },
    },
  ],
  [
    /l[aá]mpara|\bled\b|luz|proyector|galaxia|neón|neon|ne[oó]n/i,
    {
      cat: "Hogar",
      ben: "un cuarto con ambiente increíble en segundos",
      dol: "un cuarto aburrido y sin personalidad",
      pub: "jóvenes de 18 a 35 años, parejas y gamers",
      alt: "remodelar o decorar",
      inv: "No",
      sc: { wow: 5, creativos: 5, problema: 2 },
    },
  ],
  [
    /mopa|trapead|limpi|aspirad|escoba|cepillo.*limp|quitamanch|desengras/i,
    {
      cat: "Hogar",
      ben: "limpiar más rápido y sin esfuerzo",
      dol: "limpiar es cansado, lento y ensucia las manos",
      pub: "personas de 30 a 60 años que mantienen la casa",
      alt: "pagar por el aseo",
      inv: "No",
      sc: { problema: 4, wow: 4 },
    },
  ],
  [
    /organiz|estante|repisa|gancho|colgador|cajón|caj[oó]n/i,
    {
      cat: "Hogar",
      ben: "una casa ordenada y con más espacio",
      dol: "desorden y falta de espacio",
      pub: "personas que viven en apartamentos pequeños",
      alt: "comprar muebles nuevos",
      inv: "No",
    },
  ],
  [
    /cocina|picador|rallad|licuad|cuchill|sart[eé]n|olla|freidora|termo|vaso|botella/i,
    {
      cat: "Cocina",
      ben: "cocinar más fácil y rápido",
      dol: "cocinar toma mucho tiempo y ensucia todo",
      pub: "personas que cocinan en casa a diario",
      alt: "pedir domicilios",
      inv: "No",
    },
  ],
  [
    /perro|gato|mascota|pet\b|collar|correa|arenero|rascador|comedero/i,
    {
      cat: "Mascotas",
      ben: "una mascota feliz y una casa más limpia",
      dol: "pelos, desorden o una mascota aburrida y ansiosa",
      pub: "dueños de perros y gatos",
      alt: "llevarla al peluquero o comprar juguetes que rompe",
      inv: "No",
      sc: { recompra: 4, problema: 4 },
    },
  ],
  [
    /facial|piel|crema|s[eé]rum|mascarilla|acn[eé]|arruga|maquill|pesta|u[nñ]a|depil|cabello|pelo|plancha|secador|rizador/i,
    {
      cat: "Belleza",
      ben: "verse bien con resultados visibles desde la casa",
      dol: "piel o cabello sin brillo y sin tiempo para el salón",
      pub: "mujeres de 20 a 45 años interesadas en el cuidado personal",
      alt: "ir al salón o al spa",
      inv: "Sí",
      sc: { recompra: 4, envio: 5 },
    },
  ],
  [
    /beb[eé]|infant|pañal|biber[oó]n|chupo|cuna|coche|ni[nñ]o/i,
    {
      cat: "Bebés",
      ben: "un bebé tranquilo y unos papás más descansados",
      dol: "noches sin dormir y mil cosas que cargar",
      pub: "mamás y papás primerizos",
      alt: "productos de tienda mucho más caros",
      inv: "No sé",
    },
  ],
  [
    /aud[ií]fon|cargador|cable|bater[ií]a|power ?bank|soporte.*celular|smart|reloj|parlante|c[aá]mara|bluetooth/i,
    {
      cat: "Tecnología",
      ben: "todo más práctico, cargado y sin cables",
      dol: "batería que no alcanza, cables y equipos incómodos",
      pub: "personas que viven conectadas al celular",
      alt: "marcas originales mucho más caras",
      inv: "No",
      sc: { competencia: 2, devol: 3 },
    },
  ],
  [
    /abdomin|gym|ejercicio|pesa|banda|yoga|fitness|faja|rodillo/i,
    {
      cat: "Fitness",
      ben: "ponerse en forma desde la casa",
      dol: "no tener tiempo ni plata para el gimnasio",
      pub: "personas que quieren entrenar en casa",
      alt: "pagar gimnasio",
      inv: "No",
    },
  ],
];

export const CAT_OBJ: Record<string, string> = {
  Hogar: "¿Cuánto espacio ocupa?",
  Bienestar: "¿Es seguro y tiene garantía?",
  Belleza: "¿Sirve para mi tipo de piel o cabello?",
  Mascotas: "¿Le sirve a mi mascota (talla, raza)?",
  Tecnología: "¿Es compatible con mi celular?",
  Fitness: "¿Sirve si soy principiante?",
  Cocina: "¿Es fácil de lavar?",
  Auto: "¿Le sirve a mi carro?",
  Bebés: "¿Es seguro para el bebé?",
  Otro: "¿Para qué me sirve exactamente?",
};
export const CAT_SC: Record<string, Record<string, number>> = {
  Hogar: { creativos: 4 },
  Belleza: { recompra: 4, envio: 5 },
  Mascotas: { recompra: 4 },
  Tecnología: { competencia: 2 },
  Bienestar: { problema: 4 },
  Cocina: { creativos: 4 },
  Bebés: { devol: 3 },
};

export function detect(text: string): Detected | null {
  for (const [re, d] of KW) if (re.test(text)) return d;
  return null;
}

const numFrom = (t: string, re: RegExp) => {
  const m = t.match(re);
  if (!m) return null;
  const v = parseInt(String(m[1]).replace(/[^\d]/g, ""), 10);
  return isNaN(v) ? null : v;
};

/** «Leer el texto pegado» (qaParse, L986). Devuelve solo lo que encontró. */
export function qaParse(t: string): {
  nombre?: string;
  costo?: number;
  sug?: number;
  stock?: number;
  desc?: string;
  cat?: string;
} {
  if (!t.trim()) return {};
  const lines = t
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const costo =
    numFrom(
      t,
      /(?:precio\s*(?:de\s*)?proveedor|costo|precio\s*dropshipper|precio\s*mayorista)[^\d$]*\$?\s*([\d.,]+)/i,
    ) || numFrom(t, /\$\s*([\d.]{4,})/);
  const sug = numFrom(
    t,
    /(?:precio\s*sugerido|sugerido|pvp|precio\s*de\s*venta)[^\d$]*\$?\s*([\d.,]+)/i,
  );
  const stock = numFrom(t, /stock[^\d]*([\d.,]+)/i);
  const nombre =
    lines.find(
      (l) => !/\$|precio|stock|proveedor|sugerido|^\d/i.test(l) && l.length > 3,
    ) || "";
  const desc = lines
    .filter((l) => l !== nombre && !/precio|stock|proveedor|sugerido/i.test(l))
    .join(" · ");
  const d = detect(t);
  const out: ReturnType<typeof qaParse> = {};
  if (nombre) out.nombre = nombre.length > 70 ? nombre.slice(0, 70) : nombre;
  if (costo) out.costo = costo;
  if (sug && sug !== costo) out.sug = sug;
  if (stock) out.stock = stock;
  if (desc) out.desc = desc.slice(0, 400);
  if (d) out.cat = d.cat;
  return out;
}

export interface QaInput {
  nombre: string;
  costo: number;
  sug: number;
  cat: string;
  tam: number;
  desc: string;
  link: string;
  stock: number;
  combo: boolean;
}

/** Arma el producto (qaBuild, L991). null si falta el nombre o el costo. */
export function qaBuild(
  i: QaInput,
  today: string,
  now = Date.now(),
): Product | null {
  let nombre = i.nombre.trim().replace(/\s+/g, " ");
  if (nombre && nombre === nombre.toUpperCase())
    nombre = nombre.charAt(0) + nombre.slice(1).toLowerCase();
  const costo = i.costo;
  if (!nombre || !(costo > 0)) return null;
  const cat = i.cat,
    sug = i.sug,
    desc = i.desc.trim(),
    flete = i.tam;
  const d: Partial<Detected> = detect(nombre + " " + desc) || {};
  const N = NICHE[cat] || NICHE.Otro!;
  const ben = d.ben || N.deseo,
    dol = d.dol || N.dolor,
    pub = d.pub || N.pub,
    alt = d.alt || "otras soluciones más caras";
  const angulos = [
    `${ben[0]!.toUpperCase() + ben.slice(1)}`,
    `Más fácil y barato que ${alt}`,
    "El regalo perfecto",
    `Problema resuelto: ${dol.split(" por ")[0]}`,
    "Pídelo hoy y pagas al recibir",
  ];
  const objeciones = [
    "¿Sí funciona de verdad o es puro video?",
    "¿Es de buena calidad o se daña rápido?",
    CAT_OBJ[cat] || CAT_OBJ.Otro!,
    "¿Cuánto se demora en llegar a mi ciudad?",
    "¿Por qué ese precio, vale la pena?",
  ];
  const score: Record<string, number> = {
    ...PDEF.score,
    ...(CAT_SC[cat] || {}),
    ...(d.sc || {}),
  };
  if (sug > 0)
    score.valor = Math.min(5, Math.max(2, Math.round(2 + sug / costo)));
  if (flete >= 22000) score.envio = 2;
  else if (flete >= 18000) score.envio = 3;
  return withDefaults(
    {
      id: `p${now}`,
      nombre,
      costo,
      precio: E.psych(sug > 0 ? sug : costo * 3),
      flete,
      fleteRet: 0,
      entrega: 75,
      com: 3,
      categoria: cat,
      subnicho: "",
      etapa: "Investigando",
      proveedor: "Dropi",
      linkDropi: i.link.trim(),
      stock: i.stock,
      precioComp: sug || 0,
      beneficio: ben,
      dolor: dol,
      publico: pub,
      angulos: angulos.join(" · "),
      objeciones: objeciones.join("\n"),
      invima: d.inv || (cat === "Belleza" ? "Sí" : "No sé"),
      notas: desc ? `Dropi: ${desc}` : "",
      score: score as Product["score"],
      costoReal: true,
      fecha: today,
    } as Partial<Product> & { id: string },
    today,
  );
}

/** Precio con la calculadora de precio (sin upsell) y el combo si se pidió (qaPrice, L1000). */
export function qaPrice(
  S: Pick<CopilotState, "tests" | "risk" | "simForm">,
  p: Product,
  combo: boolean,
): { p: Product; R: Pricing; via: string } {
  const q = pcDefaults(S, p);
  if (!(q.techo > 0)) q.techo = Math.round((p.precio * 1.25) / 1000) * 1000;
  const R = E.pricing(q);
  const precio = R.rec || R.pMin || E.psych(p.costo * 3);
  const via = R.rec
    ? "recomendado"
    : R.pMin
      ? "mínimo saludable"
      : "3× el costo";
  const out = { ...p, precio, ancla: E.psych(precio * 1.4) } as Product;
  if (combo) {
    out.upPrecio = E.psych(precio * 0.75);
    out.upCosto = p.costo;
    out.upTasa = 20;
  }
  return { p: out, R, via };
}

/** Indicadores del resultado (qaRender, L1003). */
export function qaResult(
  S: Pick<CopilotState, "tests" | "risk" | "simForm">,
  p: Product,
) {
  const ev = E.evaluate(p, S.risk);
  const q = pcDefaults(S, p);
  const e = E.priceEval(
    { ...q, techo: q.techo || Math.round((p.precio * 1.25) / 1000) * 1000 },
    p.precio,
  );
  return { ev, g: ev.g, u: ev.g.u, q, e };
}

export const TAMANOS: [number, string][] = [
  [16000, "Pequeño (flete ~$ 16.000)"],
  [18000, "Mediano (~$ 18.000)"],
  [22000, "Grande o pesado (~$ 22.000)"],
];
