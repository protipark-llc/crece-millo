import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { E, setFormatters } from "@/lib/copiloto/engine";
import { diagnoseEsCO, formatFecha, formatMeses, formatMoney, formatPct, formatX } from "@/lib/copiloto/format";

/** Misma comparación que docs/copiloto/motor/verificar.mjs, dentro de la suite de pruebas. */
function compare(got: unknown, want: unknown, path: string, fails: string[]) {
  if (typeof want === "number" && typeof got === "number") {
    if (Math.abs(got - want) > 1e-6 * Math.max(1, Math.abs(want))) fails.push(`${path}: esperado ${want}, obtenido ${got}`);
    return;
  }
  if (want && typeof want === "object") {
    for (const k of Object.keys(want)) compare(got ? (got as Record<string, unknown>)[k] : undefined, (want as Record<string, unknown>)[k], `${path}.${k}`, fails);
    return;
  }
  if (got !== want) fails.push(`${path}: esperado ${JSON.stringify(want)}, obtenido ${JSON.stringify(got)}`);
}
const clean = (o: unknown) => JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === "number" && !isFinite(v) ? (v > 0 ? "Infinity" : "-Infinity") : v)));

describe("Co-Piloto · motor portado", () => {
  it("da exactamente los mismos resultados que el original (golden.json)", async () => {
    const path = "../../docs/copiloto/motor/casos.mjs";
    const { casos, fmt } = await import(/* @vite-ignore */ path);
    setFormatters(fmt);
    try {
      const want = JSON.parse(readFileSync("docs/copiloto/motor/golden.json", "utf8"));
      const fails: string[] = [];
      compare(clean(casos(E)), want, "E", fails);
      expect(fails.slice(0, 10)).toEqual([]);
    } finally {
      setFormatters({ money: (n) => String(n), pct: (n) => String(n) });
    }
  });
});

describe("Co-Piloto · formato es-CO", () => {
  it("dinero con espacio duro, punto de miles y menos real; USD con la TRM", () => {
    expect(formatMoney(129900)).toBe("$ 129.900");
    expect(formatMoney(1800000)).toBe("$ 1.800.000");
    expect(formatMoney(-12000)).toBe("−$ 12.000");
    expect(formatMoney(129900, { cur: "USD", trm: 3300 })).toBe("US$ 39");
    expect(formatMoney(Infinity)).toBe("—");
  });
  it("porcentaje, multiplicador, meses y fecha", () => {
    expect(formatPct(0.264)).toBe("26,4 %");
    expect(formatPct(-0.05)).toBe("−5 %");
    expect(formatX(3.3)).toBe("3,30×");
    expect(formatX(Infinity)).toBe("—");
    expect(formatX(0)).toBe("—");
    expect(formatMeses(0.5)).toBe("15 días");
    expect(formatMeses(1.02)).toBe("1 mes");
    expect(formatMeses(2.5)).toBe("2,5 meses");
    expect(formatMeses(null)).toBe("—");
    expect(formatFecha("2026-10-08")).toBe("8 oct 2026");
  });
  it("el diagnóstico sale en es-CO y no deja formateadores globales cambiados", () => {
    const demo = JSON.parse(readFileSync("docs/copiloto/motor/estado-demo.json", "utf8"));
    const ojos = demo.products.find((p: { id: string }) => p.id === "ojos");
    const out = diagnoseEsCO(E.agg(demo.tests), ojos, 5);
    const econ = out.find(([, t]) => t === "Unidad económica")!;
    expect(econ[2]).toMatch(/\$ [\d.]+/);
    expect(out.some(([, t]) => /CTR \d+,?\d* %/.test(t))).toBe(true);
    // Fuera de diagnoseEsCO el motor vuelve a sus formateadores neutros.
    const raw = E.diagnose(E.agg(demo.tests), ojos, 5);
    expect(raw.find(([, t]) => t === "Unidad económica")![2]).not.toContain("$");
  });
});
