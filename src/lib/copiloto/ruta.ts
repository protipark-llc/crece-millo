/**
 * Ruta del método (FASES, autoCheck y renderRuta, L654–686 de CoPiloto_Trendo_v5.html):
 * 6 fases y 25 casillas. Las marcadas «automático» se calculan con tus datos.
 */
import { E } from "./engine";
import { activeProduct } from "./logic";
import type { CopilotState } from "./state";
import type { TabCode } from "./nav";

export interface Fase {
  id: string;
  t: string;
  s: string;
  tab?: TabCode;
  items: [id: string, text: string, auto?: boolean][];
}

export const FASES: Fase[] = [
  {
    id: "f0",
    t: "Fundamentos",
    s: "Define tu riesgo y separa el capital de aprendizaje",
    items: [
      ["f0a", "Elegí mi nivel de riesgo en la barra superior"],
      [
        "f0b",
        "Separé el capital de aprendizaje (dinero que puedo perder) del capital de la tienda",
      ],
      ["f0c", "Tengo Notion (HQ) y Drive (carpeta Dropshipping) organizados"],
      ["f0d", "Entiendo CPA, AOV, ROAS, margen de contribución y % de entrega"],
    ],
  },
  {
    id: "f1",
    t: "Validar producto (margen primero)",
    s: "Ningún producto entra a test si no pasa la validación",
    tab: "producto",
    items: [
      ["f1a", "Tengo al menos 3 productos candidatos cargados", true],
      [
        "f1b",
        "Reemplacé los costos estimados por el precio real de Dropi",
        true,
      ],
      [
        "f1c",
        "Mi producto activo pasa la validación para mi nivel de riesgo",
        true,
      ],
      [
        "f1d",
        "Revisé la competencia en la biblioteca de anuncios de Meta y en TikTok",
      ],
    ],
  },
  {
    id: "f2",
    t: "Montar la tienda",
    s: "Shopify + Dropi + confirmación por WhatsApp",
    tab: "marketing",
    items: [
      ["f2a", "Tienda en Shopify con dominio, tema limpio y páginas legales"],
      [
        "f2b",
        "Producto importado desde Dropi con página de producto completa (fotos, video, beneficios, reseñas, oferta)",
      ],
      ["f2c", "Contraentrega activa y confirmación de pedidos por WhatsApp"],
      ["f2d", "Píxeles de Meta y TikTok instalados antes de pautar"],
      ["f2e", "3–4 creatividades listas (pestaña 3 · Marketing)"],
    ],
  },
  {
    id: "f3",
    t: "Testear",
    s: "3–5 días por producto, decisión con datos",
    tab: "test",
    items: [
      ["f3a", "Lancé el primer test con el presupuesto recomendado"],
      ["f3b", "Guardé al menos un test en el Co-Piloto", true],
      [
        "f3c",
        "Apliqué el veredicto (escalar / optimizar / matar) sin enamorarme del producto",
      ],
      ["f3d", "Registré el test en Notion › Pruebas"],
    ],
  },
  {
    id: "f4",
    t: "Escalar",
    s: "Solo lo que el veredicto dice Escalar",
    tab: "plan",
    items: [
      ["f4a", "Tengo un test con veredicto Escalar", true],
      ["f4b", "Hice el plan de capital con mis datos reales"],
      ["f4c", "Subo el presupuesto de forma gradual según mi riesgo"],
      [
        "f4d",
        "Simulé el crecimiento y defino cuánto retiro y cuánto reinvierto",
      ],
    ],
  },
  {
    id: "f5",
    t: "Sistematizar",
    s: "Del producto ganador a un negocio y un método",
    items: [
      [
        "f5a",
        "Cotizo importar el ganador por volumen (Trendo / Protipark Supply) para subir margen",
      ],
      [
        "f5b",
        "Documenté lo que funcionó (creativos, ángulos, proveedores) en Notion",
      ],
      ["f5c", "Abro el siguiente producto con el mismo ciclo"],
      ["f5d", "Mido 90 días de resultados propios antes de enseñar el método"],
    ],
  },
];

/** Casillas automáticas (autoCheck, L674); null = la marca la persona. */
export function autoCheck(
  S: Pick<CopilotState, "products" | "active" | "risk" | "tests">,
  id: string,
): boolean | null {
  const p = activeProduct(S);
  if (id === "f1a") return S.products.length >= 3;
  if (id === "f1b") return !!(p.costoReal || p.sku || p.linkDropi);
  if (id === "f1c") return E.gate(p, S.risk).pass;
  if (id === "f3b") return S.tests.length > 0;
  if (id === "f4a") return S.tests.some((t) => /Escalar/.test(t.verdict || ""));
  return null;
}

export interface FaseState {
  f: Fase;
  fi: number;
  items: { id: string; text: string; auto: boolean; v: boolean }[];
  done: number;
  pc: number;
}

/** Estado de la ruta: fases con su avance y la fase actual (la primera sin completar). */
export function ruta(
  S: Pick<CopilotState, "products" | "active" | "risk" | "tests" | "checks">,
) {
  let cur: number | null = null;
  const fases: FaseState[] = FASES.map((f, fi) => {
    const items = f.items.map(([id, text, auto]) => {
      const a = auto ? autoCheck(S, id) : null;
      return {
        id,
        text,
        auto: !!auto,
        v: a !== null ? a : !!(S.checks as Record<string, boolean>)[id],
      };
    });
    const done = items.filter((x) => x.v).length;
    const pc = done / items.length;
    if (pc < 1 && cur === null) cur = fi;
    return { f, fi, items, done, pc };
  });
  const total = fases.reduce((s, x) => s + x.items.length, 0);
  const hechos = fases.reduce((s, x) => s + x.done, 0);
  return {
    fases,
    cur: cur ?? FASES.length - 1,
    completa: cur === null,
    total,
    hechos,
  };
}
