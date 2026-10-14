import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { E } from "@/lib/copiloto/engine";
import { activeProduct } from "@/lib/copiloto/logic";
import {
  cpaHolgura,
  cpaSuggest,
  riskSim,
  scenarios,
  sensitivity,
  simCsv,
  simParams,
  type PlanFormT,
} from "@/lib/copiloto/capital";
import { parseBackup } from "@/lib/copiloto/state";

const S = parseBackup(
  JSON.parse(readFileSync("docs/copiloto/motor/estado-demo.json", "utf8")),
  "2026-10-13",
);
const p0 = activeProduct(S);

/** Cifras de textos-con-demo/13-crecer.txt y 12-plan.txt (el original con la demostración). */
describe("Co-Piloto · Crecer con la demostración", () => {
  const p = simParams(S, p0);
  const r = E.sim(p);

  it("indicadores y holgura", () => {
    expect(Math.round(r.patrimonio)).toBe(23960228);
    expect(Math.round(r.testeo)).toBe(1610878);
    expect(Math.round(r.cdt)).toBe(3445301);
    const H = cpaHolgura(p, r, S.risk);
    expect(H.tone).toBe("g");
    expect(Math.round(H.ms * 1000) / 10).toBe(46.1);
  });

  it("escenarios pesimista, base y optimista", () => {
    expect(
      scenarios(p).map(({ n, q, s }) => [
        n,
        q.entrega,
        Math.round(q.cpa),
        Math.round(s.patrimonio),
        s.quiebra,
      ]),
    ).toEqual([
      ["Pesimista", 73, 49375, 4134058, null],
      ["Base", 83, 39500, 23960228, null],
      ["Optimista", 88, 33575, 43706343, null],
    ]);
  });

  it("sensibilidad CPA × entrega", () => {
    const T = sensitivity(p);
    expect(T.map((x) => Math.round(x.cpa))).toEqual([
      23700, 31600, 39500, 47400, 55300,
    ]);
    expect(T[0]!.vals.map(Math.round)).toEqual([
      5061592, 6590608, 8122754, 9653682, 11190365, 12732699, 14280591,
    ]);
    expect(T[4]!.vals.map(Math.round)).toEqual([
      -381449, -244499, 25085, 195041, 405694, 678784, 1176821,
    ]);
    expect(T[2]!.base).toBe(true);
  });

  it("CSV del detalle por ciclo", () => {
    const lines = simCsv(r).split("\n");
    expect(lines[0]).toBe(
      "ciclo;mes;pauta;cpa;pedidos;entregados;ventas;roas;utilidad;retiro;capital;retirado",
    );
    expect(lines[1]).toBe(
      "1;0.33;1168168;39500;29.6;22.1;3974293;3.40;930616;260572;2359165;260572",
    );
  });

  it("sugerir CPA y perfil de riesgo", () => {
    expect(cpaSuggest(S, p0)).toEqual({ cpa: 39500, real: true });
    expect(riskSim(5)).toEqual({ asig: 70, reinv: 70 });
  });
});

describe("Co-Piloto · Planificar capital con la demostración", () => {
  it("plan por intervalo", () => {
    const pl = E.plan(S.planForm as PlanFormT, S.risk);
    expect([
      Math.round(pl.tot),
      Math.round(pl.fullNet),
      Math.round(pl.cum),
      pl.self,
    ]).toEqual([1068455, 493636, 1211545, 2]);
    expect(pl.rows.map((r) => Math.round(r.inject))).toEqual([
      0, 0, 539091, 529364,
    ]);
  });
});
