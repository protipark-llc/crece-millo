/**
 * Planificar capital (L1077–1096) y Crecer (L1098–1131) del original: parámetros del simulador,
 * sugerencias, escenarios, sensibilidad, puntos de la gráfica y CSV. El motor (E.plan, E.sim) no cambia.
 */
import { E, type SimInput, type SimResult } from "./engine";
import type { CopilotState, Product } from "./state";

export type SimForm = {
  cpa: number | null;
  deg: number;
  tope: number;
  cap: number;
  asig: number;
  reinv: number;
  fijos: number;
  ciclo: number;
  ntest: number;
  meses: number;
  cdt: number;
};
export type PlanFormT = {
  unidad: string;
  R: number;
  modo: string;
  m: number;
  fijos: number;
  cap: number;
  N: number;
  ret: number;
  ree: number;
};

/** CPA por defecto del simulador: CPA objetivo redondeado a 500 (fillSim, L1100). */
export const defaultCpa = (p: Product, risk: number) =>
  Math.floor(E.gate(p, risk).cpaObj / 500) * 500;

export function simForm(
  S: Pick<CopilotState, "simForm" | "risk">,
  p: Product,
): SimForm & { cpa: number } {
  const f = S.simForm as SimForm;
  return {
    ...f,
    cpa: f.cpa === null || f.cpa === undefined ? defaultCpa(p, S.risk) : f.cpa,
  };
}

/** Parámetros de E.sim con el producto activo (simParams, L1102). Aplica los mínimos de readSim. */
export function simParams(
  S: Pick<CopilotState, "simForm" | "risk">,
  p: Product,
  over: Partial<SimInput> = {},
): SimInput {
  const f = simForm(S, p);
  const g = E.gate(p, S.risk);
  return {
    ...p,
    cpa: f.cpa,
    deg: f.deg,
    tope: f.tope,
    cap: f.cap <= 0 ? 1 : f.cap,
    asig: f.asig,
    reinv: f.reinv,
    fijos: f.fijos,
    ciclo: Math.max(1, f.ciclo),
    meses: Math.max(1, f.meses),
    cdt: f.cdt,
    testeo: g.presTest * f.ntest,
    ...over,
  } as SimInput;
}

/** «Sugerir CPA»: CPA real de los tests del producto o CPA objetivo según el riesgo (cpaSuggest, L1103). */
export function cpaSuggest(
  S: Pick<CopilotState, "tests" | "risk">,
  p: Product,
): { cpa: number; real: boolean } {
  const real = E.real(S.tests.filter((t) => t.productId === p.id));
  return real
    ? { cpa: Math.round(real.cpa / 100) * 100, real: true }
    : { cpa: defaultCpa(p, S.risk), real: false };
}

/** «Aplicar mi perfil de riesgo» (applyRiskSim, L1104). */
export function riskSim(risk: number) {
  const R = E.rules(risk);
  return {
    asig: Math.round(R.asignacion / 5) * 5,
    reinv: Math.round(R.reinversion / 5) * 5,
  };
}

/** Holgura del CPA frente al máximo (L1106). */
export function cpaHolgura(
  p: SimInput,
  r: SimResult,
  risk: number,
): { tone: "r" | "a" | "g"; ms: number; exig: number } {
  const ms = r.u.cpaMax > 0 ? (r.u.cpaMax - p.cpa) / r.u.cpaMax : -1;
  const exig = E.rules(risk).holguraCPA;
  return { tone: ms <= 0 ? "r" : ms < exig ? "a" : "g", ms, exig };
}

export function scenarios(p: SimInput) {
  const defs: [string, Partial<SimInput>][] = [
    [
      "Pesimista",
      { entrega: Math.max(1, (p.entrega as number) - 10), cpa: p.cpa * 1.25 },
    ],
    ["Base", {}],
    [
      "Optimista",
      { entrega: Math.min(100, (p.entrega as number) + 5), cpa: p.cpa * 0.85 },
    ],
  ];
  return defs.map(([n, d]) => {
    const q = { ...p, ...d } as SimInput;
    return { n, q, s: E.sim(q) };
  });
}

export const SENS_CPA = [0.6, 0.8, 1, 1.2, 1.4];
export const SENS_ENTREGA = [60, 65, 70, 75, 80, 85, 90];

/** Sensibilidad: utilidad mensual promedio por CPA × % de entrega (L1110–1111). */
export function sensitivity(
  p: SimInput,
): { cpa: number; base: boolean; vals: number[] }[] {
  return SENS_CPA.map((f) => {
    const c = p.cpa * f;
    return {
      cpa: c,
      base: f === 1,
      vals: SENS_ENTREGA.map((e) => {
        const s = E.sim({ ...p, cpa: c, entrega: e });
        const L = s.rows[s.rows.length - 1]!;
        return L.mes > 0 ? s.totUtil / L.mes : s.totUtil;
      }),
    };
  });
}

/** Puntos de «Crecimiento del capital» (drawChart, L1114–1116). */
export function growthPoints(r: SimResult, p: SimInput) {
  const pts = [{ m: 0, c: p.cap, t: p.cap, d: p.cap }];
  if (r.rows.length && r.rows[0]!.ciclo !== 0)
    pts.push({ m: 0.001, c: p.cap - r.testeo, t: p.cap - r.testeo, d: p.cap });
  r.rows.forEach((x) => {
    if (x.ciclo > 0)
      pts.push({
        m: x.mes,
        c: x.capital,
        t: x.capital + x.retirado,
        d: p.cap * Math.pow(1 + p.cdt / 100, x.mes / 12),
      });
  });
  return pts;
}

/** CSV del detalle por ciclo (exportSimCSV, L1126). */
export function simCsv(r: SimResult): string {
  const h =
    "ciclo;mes;pauta;cpa;pedidos;entregados;ventas;roas;utilidad;retiro;capital;retirado\n";
  return (
    h +
    r.rows
      .map((x) =>
        [
          x.ciclo,
          x.mes.toFixed(2),
          Math.round(x.pauta),
          Math.round(x.cpa),
          x.pedidos.toFixed(1),
          x.entregados.toFixed(1),
          Math.round(x.ventas),
          x.roas.toFixed(2),
          Math.round(x.utilidad),
          Math.round(x.retiro),
          Math.round(x.capital),
          Math.round(x.retirado),
        ].join(";"),
      )
      .join("\n")
  );
}

/**
 * Lectura de realismo (decisión de Crece Millo, sin cambiar el modelo): la tasa compuesta mensual
 * que el simulador proyecta frente a lo que suele sostenerse. Solo agrega un aviso.
 */
export function realism(
  r: SimResult,
  pes: SimResult,
): { tone: "b" | "a"; strong: boolean } {
  return {
    tone: r.tm > 0.15 ? "a" : "b",
    strong: r.tm > 0.15 || pes.quiebra !== null,
  };
}
