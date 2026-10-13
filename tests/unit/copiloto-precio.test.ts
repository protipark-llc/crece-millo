import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { E } from "@/lib/copiloto/engine";
import { activeProduct, pcQ } from "@/lib/copiloto/logic";
import {
  breakdown,
  health,
  priceSims,
  priceTable,
  reinvOf,
  sliderMaxes,
} from "@/lib/copiloto/precio";
import { parseBackup } from "@/lib/copiloto/state";

const TODAY = "2026-10-13";
const demo = () =>
  parseBackup(
    JSON.parse(readFileSync("docs/copiloto/motor/estado-demo.json", "utf8")),
    TODAY,
  );
const f = {
  money: (n: number) => `$${Math.round(n)}`,
  pct: (n: number) => `${Math.round(n * 1000) / 10}%`,
  x: (n: number) => `${n.toFixed(2)}×`,
};

/** Cifras de docs/copiloto/original/textos-con-demo/06-productos-precio.txt (el original con la demostración). */
describe("Co-Piloto · Precio y margen con la demostración", () => {
  const S = demo();
  const p = activeProduct(S);
  const q = pcQ(S, p) as ReturnType<typeof pcQ> & { P: number };
  const R = E.pricing(q);
  const ev = E.priceEval(q, q.P);

  it("precios clave y precio evaluado", () => {
    expect([R.be, R.pMin, R.rec, R.pObj, R.range]).toEqual([
      123500,
      153500,
      179900,
      null,
      [167000, 194000],
    ]);
    expect(Math.round(ev.pi)).toBe(2485);
    expect(Math.round(ev.mes)).toBe(143386);
    expect(Math.round(ev.pedidos)).toBe(58);
  });

  it("desglose por pedido entregado", () => {
    expect(breakdown(ev).map(([n, v]) => [n, Math.round(v)])).toEqual([
      ["Producto", 56000],
      ["Flete", 16000],
      ["Devoluciones", 5667],
      ["Comisión e impuestos", 3897],
      ["Empaque", 1000],
      ["Confirmación", 0],
      ["Publicidad", 38519],
      ["Fijos", 5136],
      ["Utilidad", 3682],
    ]);
  });

  it("salud del precio: 1/6 en verde, solo la competencia", () => {
    const H = health(q, ev, p, reinvOf(S), f);
    expect(H.map((h) => h[0])).toEqual([
      false,
      false,
      false,
      false,
      true,
      false,
    ]);
    expect(H[4]![1]).toBe("Precio ≤ competencia + 15% (competencia $169900)");
  });

  it("estrategia de inversión por precio (patrimonio, tasa y escenario pesimista)", () => {
    const { rows, best } = priceSims(S, p, q, R);
    expect(
      rows.map((r) => [
        r.n,
        r.P,
        Math.round(r.r.patrimonio),
        r.pe.quiebra === null ? "sostenible" : `m${r.pe.quiebra.toFixed(1)}`,
      ]),
    ).toEqual([
      ["Precio actual", 179900, 32997807, "sostenible"],
      ["Mínimo saludable", 153500, 23436214, "sostenible"],
      ["Evaluado", 129900, 10351320, "m4.3"],
    ]);
    expect(best?.n).toBe("Precio actual");
  });

  it("tabla de precios: muestra del grid más los precios clave, en orden", () => {
    const T = priceTable(q, R);
    expect(T.slice(0, 7).map((g) => g.P)).toEqual([
      62000, 72500, 83000, 93500, 104000, 114500, 123500,
    ]);
    expect(T.some((g) => g.P === 153500) && T.some((g) => g.P === 179900)).toBe(
      true,
    );
    expect(Math.round(T[6]!.mes)).toBe(1741);
  });

  it("los máximos de los controles dependen del precio, no cambian al mover", () => {
    const m = sliderMaxes(q);
    expect(m.P).toBe(Math.round(R.hi));
    expect(m.upTasa).toBe(80);
  });
});
