/**
 * Marketing (L850–962 de CoPiloto_Trendo_v5.html): contexto del nicho, ofertas, creativos,
 * página, WhatsApp y plan de lanzamiento. Las plantillas son las del original; solo cambia
 * el formato del dinero (es-CO) y el resaltado, que pasa de <b> a segmentos Rich.
 */
import { E, type Unit } from "./engine";
import type { Rich } from "./logic";
import type { Product } from "./state";

export interface Niche {
  dolor: string;
  deseo: string;
  pub: string;
  comp: [string, string, string, string];
  escena: string;
  regalo: string;
}

export const NICHE: Record<string, Niche> = {
  Hogar: {
    dolor: "una casa que se ve aburrida o desordenada",
    deseo: "un hogar acogedor y práctico",
    pub: "personas que cuidan y decoran su casa",
    comp: [
      "Repuesto o recarga",
      "Pack de accesorios",
      "Segunda unidad para otro espacio",
      "Organizador o soporte a juego",
    ],
    escena: "la sala o el cuarto al atardecer",
    regalo: "Día de la Madre y Navidad",
  },
  Bienestar: {
    dolor: "estrés, tensión y mal descanso",
    deseo: "sentirse relajado y descansado",
    pub: "adultos con mucho estrés y poco tiempo",
    comp: [
      "Aceite, gel o recarga",
      "Estuche de viaje",
      "Segunda unidad para regalar",
      "Kit de autocuidado",
    ],
    escena: "el sofá después de un día pesado",
    regalo: "Día de la Madre, Día del Padre y Navidad",
  },
  Belleza: {
    dolor: "piel o cabello sin brillo y sin tiempo para el spa",
    deseo: "verse y sentirse bien en casa",
    pub: "mujeres que cuidan su piel",
    comp: [
      "Sérum o crema complementaria",
      "Kit de 7 días",
      "Aplicador o brocha",
      "Segunda caja con descuento",
    ],
    escena: "la rutina frente al espejo",
    regalo: "Amor y Amistad y Navidad",
  },
  Mascotas: {
    dolor: "una mascota aburrida, sucia o ansiosa",
    deseo: "una mascota feliz y una casa limpia",
    pub: "dueños de perros y gatos",
    comp: [
      "Repuesto o filtro",
      "Juguete o snack",
      "Talla adicional",
      "Kit de limpieza",
    ],
    escena: "la mascota usándolo en casa",
    regalo: "cumpleaños de la mascota y Navidad",
  },
  Tecnología: {
    dolor: "cables, batería que no alcanza o equipos incómodos",
    deseo: "todo más práctico y ordenado",
    pub: "personas que viven conectadas",
    comp: [
      "Cable o cargador",
      "Estuche protector",
      "Garantía extendida",
      "Segunda unidad",
    ],
    escena: "el escritorio o el carro",
    regalo: "Día del Padre y Navidad",
  },
  Fitness: {
    dolor: "no tener tiempo ni espacio para entrenar",
    deseo: "ponerse en forma desde la casa",
    pub: "personas que quieren entrenar en casa",
    comp: [
      "Bandas o accesorios",
      "Rutina digital en PDF",
      "Botella o toalla",
      "Pack para pareja",
    ],
    escena: "la sala convertida en gimnasio",
    regalo: "inicio de año y Navidad",
  },
  Cocina: {
    dolor: "cocinar toma mucho tiempo y ensucia todo",
    deseo: "cocinar fácil, rápido y limpio",
    pub: "personas que cocinan en casa",
    comp: [
      "Repuesto o cuchilla",
      "Recetario digital",
      "Set de utensilios",
      "Segunda unidad",
    ],
    escena: "la cocina preparando algo rápido",
    regalo: "Día de la Madre y Navidad",
  },
  Auto: {
    dolor: "un carro sucio, desordenado o incómodo",
    deseo: "un carro limpio y práctico",
    pub: "conductores",
    comp: [
      "Kit de limpieza",
      "Soporte o organizador",
      "Segunda unidad para otro carro",
      "Ambientador",
    ],
    escena: "el carro antes de salir",
    regalo: "Día del Padre y Navidad",
  },
  Bebés: {
    dolor: "noches sin dormir y mil cosas que cargar",
    deseo: "un bebé tranquilo y unos papás descansados",
    pub: "mamás y papás primerizos",
    comp: [
      "Repuesto",
      "Pack de 2",
      "Bolso o estuche",
      "Kit regalo para baby shower",
    ],
    escena: "la rutina de la noche",
    regalo: "baby showers y Navidad",
  },
  Otro: {
    dolor: "un problema del día a día",
    deseo: "hacer la vida más fácil",
    pub: "personas que buscan practicidad",
    comp: [
      "Accesorio complementario",
      "Segunda unidad",
      "Versión premium",
      "Kit de regalo",
    ],
    escena: "el uso diario",
    regalo: "Navidad",
  },
};

export interface Fmt {
  money: (n: number) => string;
  pct: (n: number) => string;
  x: (n: number) => string;
}

const low = (t: unknown) =>
  String(t || "")
    .trim()
    .replace(/^\w/, (c) => c.toLowerCase())
    .replace(/\.$/, "");
const cap = (t: string) => (t ? t[0]!.toUpperCase() + t.slice(1) : t);
const split = (t: unknown) =>
  String(t || "")
    .split(/[·\n;]+/)
    .map((x) => x.trim())
    .filter(Boolean);

export interface MkCtx {
  p: Product;
  N: Niche;
  n: string;
  ben: string;
  dol: string;
  pub: string;
  angs: string[];
  objs: string[];
  P: string;
  A: string;
  cat: string;
}

/** Contexto de las plantillas: textos de la ficha o, si faltan, los del nicho (mkCtx, L862). */
export function mkCtx(p: Product, money: Fmt["money"]): MkCtx {
  const N = NICHE[String(p.categoria)] || NICHE.Otro!;
  return {
    p,
    N,
    n: p.nombre,
    ben: low(p.beneficio) || N.deseo,
    dol: low(p.dolor) || N.dolor,
    pub: low(p.publico) || N.pub,
    angs: split(p.angulos),
    objs: split(p.objeciones),
    P: money(p.precio),
    A: (p.ancla as number) > p.precio ? money(p.ancla as number) : "",
    cat: String(p.categoria ?? ""),
  };
}

/** Estado de Marketing por producto (mkS, L864). `check` es nuevo: el checklist se guarda por producto. */
export interface MkState {
  tab: string;
  ang: number;
  off: Record<string, { precio?: number; costo?: number; tasa?: number }>;
  check?: number[];
}
export const mkDefault = (): MkState => ({ tab: "ofertas", ang: 0, off: {} });
export function mkState(
  mk: Record<string, Record<string, unknown>>,
  pid: string,
): MkState {
  return { ...mkDefault(), ...(mk[pid] as Partial<MkState> | undefined) };
}

/* ───────────── Ofertas (offerDefs y offerCalc, L868–899) ───────────── */

export interface Offer {
  id: string;
  tipo: string;
  nombre: string;
  what: string;
  precio: number;
  costo: number;
  tasa: number;
  cuando: string;
  guion: string;
  down?: boolean;
  cross?: boolean;
}

export function offerDefs(c: MkCtx, money: Fmt["money"]): Offer[] {
  const p = c.p,
    P = p.precio,
    ps = E.psych,
    N = c.N;
  const bump = Math.max(9900, ps(P * 0.22));
  return [
    {
      id: "combo2",
      tipo: "Upsell · Combo 2×",
      nombre: "Lleva 2 con descuento",
      what: "Segunda unidad con descuento. La más fácil de vender: sirve para regalar o para otro espacio.",
      precio: ps(P * 0.75),
      costo: p.costo,
      tasa: 25,
      cuando:
        "En la página (selector 1 o 2 unidades) y en la confirmación por WhatsApp.",
      guion: `¡Hola! Ya tenemos listo tu ${c.n}. Hoy tenemos una promo: por solo ${money(ps(P * 0.75))} más te llevas una segunda unidad (ideal para regalar). ¿Te la agrego al pedido?`,
    },
    {
      id: "combo3",
      tipo: "Upsell · Combo 3×",
      nombre: "Pack familiar de 3",
      what: "Para el cliente que compra para varios. Precio por unidad más bajo, ticket mucho más alto.",
      precio: ps(P * 1.3),
      costo: p.costo * 2,
      tasa: 8,
      cuando: "En la página como tercera opción (ancla hacia el combo 2×).",
      guion: `Si es para la familia, el pack de 3 te sale en ${money(P + ps(P * 1.3))} en total: cada uno queda en ${money((P + ps(P * 1.3)) / 3)}.`,
    },
    {
      id: "bump",
      tipo: "Order bump",
      nombre: N.comp[0],
      what: "Complemento barato que el cliente marca en el mismo formulario. Se acepta mucho porque es un “sí” pequeño.",
      precio: bump,
      costo: Math.round((bump * 0.3) / 100) * 100,
      tasa: 25,
      cuando:
        "Casilla en el formulario de compra (app de formulario COD o checkout).",
      guion: `☑️ Agrega ${N.comp[0].toLowerCase()} por solo ${money(bump)} (precio especial solo con este pedido).`,
    },
    {
      id: "wa",
      tipo: "Upsell en la confirmación",
      nombre: N.comp[1],
      what: "Se ofrece en el WhatsApp o la llamada de confirmación, cuando el cliente ya dijo que sí. Es el upsell natural de contraentrega.",
      precio: ps(P * 0.35),
      costo: Math.round((ps(P * 0.35) * 0.3) / 100) * 100,
      tasa: 15,
      cuando: "Mensaje de confirmación, antes de despachar.",
      guion: `Perfecto, confirmamos tu ${c.n}. 🎁 Solo para pedidos de hoy: ${N.comp[1].toLowerCase()} por ${money(ps(P * 0.35))} y te llega en el mismo envío, sin flete extra. ¿Lo agregamos?`,
    },
    {
      id: "down",
      tipo: "Downsell",
      nombre: "Descuento para el que duda",
      what: "Para el cliente que no confirma o dice que está caro. Mejor vender con menos margen que perder la venta y el flete.",
      precio: ps(P * 0.88),
      costo: p.costo,
      tasa: 30,
      down: true,
      cuando:
        "Al cliente que no confirma en 2–3 horas o que pone una objeción de precio.",
      guion: `Entiendo 🙏 Para que lo pruebes, te lo dejo en ${money(ps(P * 0.88))} si confirmas hoy. Pagas cuando te llegue a tu casa.`,
    },
    {
      id: "cross",
      tipo: "Cross-sell posventa",
      nombre: N.comp[2],
      what: "Se ofrece 20–30 días después de la entrega a quien ya compró. No pagas publicidad: casi todo es utilidad.",
      precio: ps(P * 0.5),
      costo: Math.round((ps(P * 0.5) * 0.35) / 100) * 100,
      tasa: 10,
      cross: true,
      cuando: "WhatsApp 20–30 días después de la entrega, con la reseña.",
      guion: `¡Hola! ¿Cómo te ha ido con tu ${c.n}? 😊 Como ya eres cliente, tenemos ${N.comp[2].toLowerCase()} con 15% de descuento: ${money(ps(P * 0.5))}. Pagas al recibir.`,
    },
  ];
}

/** Ofertas con lo que la persona editó (S.mk[pid].off). */
export function offers(c: MkCtx, st: MkState, money: Fmt["money"]): Offer[] {
  return offerDefs(c, money).map((o) => ({ ...o, ...(st.off[o.id] || {}) }));
}

export interface OfferResult {
  u: Unit;
  good: boolean;
  info: Rich;
  extra?: number;
}

export function offerCalc(
  o: Offer,
  p0: Product,
  risk: number,
  f: Fmt,
): OfferResult {
  const p = { ...p0, upPrecio: 0, upCosto: 0, upTasa: 0 } as Product;
  const base = E.unit(p);
  if (o.down) {
    const ud = E.unit({ ...p, precio: o.precio } as Product);
    return {
      u: ud,
      good: ud.utilidadPedido > E.gate(p, risk).cpaObj * 0.8,
      info: [
        {
          t: `A ${f.money(o.precio)} cada pedido deja ${f.money(ud.utilidadPedido)} (antes ${f.money(base.utilidadPedido)}). Si rescatas ${o.tasa}% de los que dudan, recuperas ventas que de otra forma se perdían, pagando el mismo anuncio.`,
        },
      ],
    };
  }
  if (o.cross) {
    const cc = ((p.com as number) + ((p.imp as number) || 0)) / 100;
    const ut =
      o.precio * (1 - cc) -
      o.costo -
      (p.flete as number) -
      ((p.empaque as number) || 0);
    return {
      u: base,
      extra: (ut * o.tasa) / 100,
      good: ut > 0,
      info: [
        {
          t: `Cada venta posventa deja ~${f.money(ut)} sin publicidad. Si ${o.tasa}% de tus clientes recompra, cada pedido original vale ${f.money((ut * o.tasa) / 100)} más.`,
        },
      ],
    };
  }
  const u = E.unit({
    ...p,
    upPrecio: o.precio,
    upCosto: o.costo,
    upTasa: o.tasa,
  } as Product);
  const d =
    base.utilidadPedido > 0 ? u.utilidadPedido / base.utilidadPedido - 1 : 0;
  return {
    u,
    good: u.utilidadPedido > base.utilidadPedido,
    info: [
      { t: `Ticket ${f.money(base.aov)} → ` },
      { t: f.money(u.aov), b: true },
      { t: `. Utilidad por pedido ${f.money(base.utilidadPedido)} → ` },
      { t: f.money(u.utilidadPedido), b: true },
      {
        t: ` (${(u.utilidadPedido >= base.utilidadPedido ? "+" : "") + f.pct(d)}). Puedes pagar hasta ${f.money(u.cpaMax)} por pedido.`,
      },
    ],
  };
}

/* ───────────── Creativos (angles, hooks, scripts, adCopy, L901–916) ───────────── */

export function angles(c: MkCtx): string[] {
  const base = [
    `Alivio: ${c.ben}`,
    `Problema → solución: adiós a ${c.dol}`,
    "Regalo perfecto",
    "Antes y después",
    "Confianza: pagas al recibir",
  ];
  return [...c.angs, ...base].slice(0, 7);
}

export function hooks(
  c: MkCtx,
  money: Fmt["money"],
  ang = "",
): { h: string; t: string }[] {
  const n = c.n;
  return (
    [
      [`¿Todavía con ${c.dol}? Mira esto 👇`, "Pregunta al dolor"],
      [`Esto cambió mi rutina: ${c.ben}`, "Resultado primero"],
      [`Esto es para ${c.pub} 👀`, "Llamar al público"],
      [`Pensé que era puro TikTok… hasta que lo probé`, "Escepticismo"],
      [`3 razones por las que todos están comprando ${n}`, "Lista"],
      [`Antes vs. después de usar ${n}`, "Contraste visual"],
      [
        `El regalo que sí van a usar (y cuesta menos de ${money(E.psych(c.p.precio * 1.05))})`,
        "Regalo",
      ],
      [`Deja de sufrir con ${c.dol} en 15 segundos`, "Promesa rápida"],
      [`Lo pides hoy y pagas cuando te llega 📦`, "Confianza contraentrega"],
      [`POV: por fin encontraste ${n}`, "Formato POV"],
    ] as [string, string][]
  ).map(([h, t]) => ({ h, t: t + (ang ? " · " + ang : "") }));
}

export function scripts(c: MkCtx): { t: string; d: string; s: string[] }[] {
  const n = c.n;
  return [
    {
      t: "Problema → solución",
      d: "15–20 s",
      s: [
        `0–3 s · Gancho: muestra el problema (${c.dol}). Texto en pantalla con el gancho.`,
        `3–8 s · Presenta ${n} en uso, plano cerrado.`,
        `8–14 s · 2 beneficios en texto grande: ${c.ben}; fácil de usar.`,
        `14–18 s · Prueba: reacción o resultado.`,
        `18–20 s · Llamado: “Pídelo hoy, pagas al recibir” + precio ${c.A ? `antes ${c.A}, ` : ""}hoy ${c.P}.`,
      ],
    },
    {
      t: "Demostración satisfactoria",
      d: "10–15 s",
      s: [
        "0–2 s · Primer plano del producto funcionando (sin hablar, música en tendencia).",
        `2–10 s · 3 tomas cortas de uso en ${c.N.escena}.`,
        "10–13 s · Texto: el beneficio en 5 palabras.",
        "13–15 s · Texto final: “Envío a toda Colombia · pagas al recibir”.",
      ],
    },
    {
      t: "Testimonio estilo UGC",
      d: "20–30 s",
      s: [
        "0–3 s · Persona a cámara: “No pensé que esto funcionara…”.",
        `3–10 s · Cuenta su problema: ${c.dol}.`,
        `10–20 s · Muestra cómo usa ${n} y qué cambió: ${c.ben}.`,
        "20–26 s · Responde la duda principal" +
          (c.objs[0] ? ` (${c.objs[0]})` : " (precio, calidad o envío)") +
          ".",
        "26–30 s · “Lo pedí y lo pagué cuando llegó. Te dejo el link”.",
      ],
    },
    {
      t: "Antes y después",
      d: "8–12 s",
      s: [
        "0–4 s · ANTES: la situación sin el producto (texto “Antes”).",
        `4–9 s · DESPUÉS: con ${n} (texto “Después”), mismo encuadre.`,
        "9–12 s · Precio y “pagas al recibir”.",
      ],
    },
  ];
}

/** Texto para copiar un guion (L907). */
export const scriptText = (x: { t: string; d: string; s: string[] }) =>
  x.t + " (" + x.d + ")\n" + x.s.map((l, i) => i + 1 + ". " + l).join("\n");

export function adCopy(c: MkCtx): { prim: string[]; head: string[] } {
  return {
    prim: [
      `${cap(c.ben)} ✨ ${c.n} es la forma más fácil de dejar atrás ${c.dol}.\n✅ Fácil de usar\n✅ Envío a toda Colombia\n✅ Pagas cuando te llega\n👉 Pide el tuyo hoy`,
      `“Lo compré con dudas y ahora no lo suelto” ⭐⭐⭐⭐⭐\nMiles de personas ya están usando ${c.n}. ${c.A ? `Antes ${c.A}, hoy ` : "Hoy "}${c.P}.\nPagas al recibir 📦`,
      `🎁 ¿Buscas un regalo que sí usen? ${c.n}: ${c.ben}.\nLlévate 2 con descuento. Unidades limitadas.\nPagas al recibir, sin riesgo.`,
    ],
    head: [
      `${c.n} · pagas al recibir`,
      `Adiós a ${c.dol}`,
      cap(c.ben),
      "Envío gratis a toda Colombia",
      "Hoy 2 con descuento",
    ],
  };
}

/** Matriz 3 × 3: ganchos 1, 2 y 9 contra el ángulo elegido y los dos siguientes (L912). */
export function matrix(c: MkCtx, ang: number, money: Fmt["money"]) {
  const H = hooks(c, money);
  const A = angles(c);
  return {
    rows: [H[0]!.h, H[1]!.h, H[8]!.h],
    cols: [A[ang]!, A[(ang + 1) % A.length]!, A[(ang + 2) % A.length]!],
  };
}

export const CREATIVE_CHECK = [
  "Vertical 9:16, 10–30 segundos",
  "Gancho visual en los primeros 3 segundos",
  "Producto en uso real (no solo fotos del proveedor)",
  "Texto en pantalla grande y corto",
  "Subtítulos (la mayoría lo ve sin sonido)",
  "Precio y “pagas al recibir” al final",
  "Música en tendencia o voz natural",
  "Una sola idea por video",
];

/* ───────────── Página y WhatsApp (renderPage, L918–925) ───────────── */

export function pageTexts(c: MkCtx, f: Fmt) {
  const p = c.p;
  const ancla = (p.ancla as number) || 0;
  const tit = `${c.n} · ${cap(c.ben)}`;
  const bul = [
    `✅ ${cap(c.ben)}`,
    `✅ Dile adiós a ${c.dol}`,
    ...c.angs.slice(0, 2).map((a) => `✅ ${a}`),
    "✅ Envío a toda Colombia y pagas al recibir",
    "✅ Garantía de satisfacción",
  ].slice(0, 6);
  const faq: [string, string][] = [
    ...c.objs.map((o): [string, string] => [
      o.endsWith("?") ? o : `¿${o}?`,
      "Responde aquí con un dato concreto, una foto o un testimonio.",
    ]),
    [
      "¿Pago cuando me llega?",
      "Sí. Pagas en efectivo al recibir el pedido en tu casa.",
    ],
    ["¿Cuánto se demora?", "Entre 2 y 5 días hábiles según tu ciudad."],
    [
      "¿Y si llega dañado?",
      "Te lo cambiamos sin costo. Escríbenos por WhatsApp con una foto.",
    ],
  ];
  const tachado = ancla > p.precio;
  const desc = `${tit}\n\n${tachado ? `Antes ${f.money(ancla)} · ` : ""}HOY ${f.money(p.precio)}\n\n${bul.join("\n")}\n\nPreguntas frecuentes\n${faq.map((x) => x[0] + "\n" + x[1]).join("\n")}`;
  return {
    tit,
    bul,
    faq,
    desc,
    tachado,
    ancla,
    ahorro: tachado ? 1 - p.precio / ancla : 0,
  };
}

export function waMessages(
  c: MkCtx,
  marca: string,
  money: Fmt["money"],
): [string, string][] {
  const p = c.p;
  const O = offerDefs(c, money);
  return [
    [
      "1 · Confirmación (en menos de 1 hora)",
      `¡Hola {nombre}! 👋 Te escribimos de ${marca || "nuestra tienda"} para confirmar tu pedido de ${c.n} por ${money(p.precio)}, pago contra entrega.\n📍 Dirección: {dirección}, {ciudad}\n¿Está todo correcto? Responde SÍ para despacharlo hoy 🚚`,
    ],
    ["2 · Upsell en la confirmación", O[3]!.guion],
    [
      "3 · Recordatorio si no responde (2–3 horas)",
      `Hola {nombre}, tu ${c.n} está reservado ⏳ Solo necesitamos tu SÍ para enviarlo. Si tienes alguna duda, te la resolvemos aquí.`,
    ],
    ["4 · Downsell si duda o no confirma", O[4]!.guion],
    [
      "5 · Aviso de envío",
      `¡Listo {nombre}! 📦 Tu pedido salió hoy con {transportadora}, guía {número}. Llega en 2–5 días. Ten listo ${money(p.precio)} en efectivo 🙌`,
    ],
    [
      "6 · Día de entrega",
      `Hola {nombre}, hoy te llega tu ${c.n} 🎉 Por favor ten disponible ${money(p.precio)}. Si no vas a estar, avísanos para reprogramar y no perder el envío.`,
    ],
    [
      "7 · Reseña y cross-sell (20–30 días)",
      O[5]!.guion +
        "\n\n¿Nos regalas una foto o un comentario de cómo te ha ido? ⭐",
    ],
  ];
}

/* ───────────── Plan de lanzamiento (renderLaunch, L927–939) ───────────── */

export function launch(p: Product, risk: number, money: Fmt["money"]) {
  const g = E.gate(p, risk),
    R = g.R,
    U = g.u;
  const dias = 4,
    diario = Math.max(20000, Math.round(g.presTest / dias / 1000) * 1000);
  const steps: [string, string][] = [
    [
      "Día 0 · Preparar",
      "3 videos (uno por gancho de la matriz), página lista, WhatsApp de confirmación activo y píxel probado con una compra de prueba.",
    ],
    [
      "Día 1 · Lanzar",
      `1 campaña de ventas · 1 conjunto con público amplio en Colombia (edad del público objetivo) · 3 anuncios · ${money(diario)} al día.`,
    ],
    [
      "Días 1–2 · No tocar",
      "El algoritmo está aprendiendo. Solo revisa que los anuncios estén activos y responde los WhatsApp rápido.",
    ],
    [
      "Día 3 · Primera lectura",
      `Apaga el anuncio con peor CTR si está por debajo de 0,8%. Si llevas ${money(R.killMult * U.cpaMax)} gastados sin pedidos, mata el test.`,
    ],
    [
      "Días 4–5 · Decidir",
      `Registra el resultado en 2 · Productos › Resultados de venta y aplica el veredicto. Escala solo si el CPA está bajo ${money(g.cpaObj)}.`,
    ],
  ];
  return { g, R, U, dias, diario, steps };
}
