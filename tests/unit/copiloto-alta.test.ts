import { describe, expect, it } from "vitest";
import { E } from "@/lib/copiloto/engine";
import {
  detect,
  qaBuild,
  qaParse,
  qaPrice,
  qaResult,
  type QaInput,
} from "@/lib/copiloto/alta";
import { defaultState } from "@/lib/copiloto/state";

const TODAY = "2026-10-14";
const S = defaultState(TODAY);
const base: QaInput = {
  nombre: "Masajeador de cuello eléctrico",
  costo: 45000,
  sug: 0,
  cat: "Bienestar",
  tam: 16000,
  desc: "6 modos de masaje, calor, recargable USB",
  link: "",
  stock: 0,
  combo: true,
};

function run(i: QaInput) {
  const p0 = qaBuild(i, TODAY, 1)!;
  const { p, R, via } = qaPrice(S, p0, i.combo);
  return { p, R, via, ...qaResult(S, p) };
}

/** Aceptación (especificación §5.3 y textos-con-demo/15-alta-rapida.txt). */
describe("Co-Piloto · Alta rápida", () => {
  it("Masajeador de cuello eléctrico a $ 45.000: precio, tachado, utilidad y combo", () => {
    const r = run(base);
    expect([
      r.p.precio,
      r.p.ancla,
      Math.round(r.u.utilidadPedido),
      r.via,
      r.R.range,
    ]).toEqual([169900, 239900, 76502, "recomendado", [156500, 189500]]);
    expect([
      Math.round(r.g.cpaObj),
      Math.round(r.g.presTest),
      Math.round(r.u.aov),
      r.p.upPrecio,
    ]).toEqual([56102, 561018, 195880, 129900]);
    expect(Math.round(r.e.mn * 1000) / 10).toBe(28.7);
  });

  it("clase A con 77 cuando la categoría queda en Hogar, como en la captura del original", () => {
    // En el original la categoría se detecta al escribir el nombre; la captura se tomó con «Hogar»
    // (primera opción) y por eso los criterios salen Factor 4 · Resuelve 5 · Valor 4 · Hay 4.
    const r = run({ ...base, cat: "Hogar" });
    expect(E.CRIT.map(([k]) => r.p.score[k as keyof typeof r.p.score])).toEqual(
      [4, 5, 4, 3, 3, 3, 3, 4, 3, 3],
    );
    expect([r.ev.clase, r.ev.total]).toEqual(["A", 77]);
    // Con la categoría detectada (Bienestar) el mismo producto queda en 76, también clase A.
    expect(run(base).ev.total).toBe(76);
  });

  it("detecta la categoría por palabras clave (la primera coincidencia gana)", () => {
    expect(detect("Masajeador de cuello eléctrico")?.cat).toBe("Bienestar");
    expect(detect("Lámpara proyector galaxia")?.cat).toBe("Hogar");
    expect(detect("Cepillo para perro")?.cat).toBe("Mascotas");
    expect(detect("algo raro")).toBeNull();
  });

  it("lee el texto pegado de Dropi", () => {
    const t =
      "MASAJEADOR DE CUELLO ELÉCTRICO\nPrecio proveedor: $45.000\nPrecio sugerido: $119.900\nStock: 320\n6 modos de masaje, calor";
    expect(qaParse(t)).toEqual({
      nombre: "MASAJEADOR DE CUELLO ELÉCTRICO",
      costo: 45000,
      sug: 119900,
      stock: 320,
      desc: "6 modos de masaje, calor",
      cat: "Bienestar",
    });
    // Nombre en mayúsculas → solo la primera letra en mayúscula; sin nombre o costo no arma nada.
    expect(
      qaBuild({ ...base, nombre: "MASAJEADOR DE CUELLO" }, TODAY, 1)!.nombre,
    ).toBe("Masajeador de cuello");
    expect(qaBuild({ ...base, costo: 0 }, TODAY, 1)).toBeNull();
  });
});
