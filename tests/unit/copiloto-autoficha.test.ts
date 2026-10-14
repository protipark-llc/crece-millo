import { describe, expect, it } from "vitest";
import {
  applyIA,
  backToAuto,
  editField,
  enableAuto,
  faltantes,
  fijar,
  isIA,
  isManual,
  recompute,
} from "@/lib/copiloto/autoficha";
import { blankProduct } from "@/lib/copiloto/productos";
import { defaultState, type Product } from "@/lib/copiloto/state";
import type { MentorResult } from "@/lib/copiloto/mentor";

const TODAY = "2026-10-14";
const S = defaultState(TODAY);

/** Lo esencial de un producto nuevo, campo por campo como en la ficha. */
function esencial(over: Partial<Record<string, unknown>> = {}) {
  let p = blankProduct(TODAY, 1);
  const v = {
    nombre: "Masajeador de cuello eléctrico",
    costo: 45000,
    flete: 16000,
    fleteRet: 9000,
    com: 3,
    meta: 20,
    ...over,
  };
  for (const [k, x] of Object.entries(v)) p = editField(S, p, k, x);
  return p;
}

describe("Ficha dinámica · autocompletado", () => {
  it("un producto nuevo arranca con autocompletado y pide lo esencial", () => {
    const p = blankProduct(TODAY, 1);
    expect(p.auto).toBe(true);
    expect(faltantes(p)).toEqual(
      ["nombre", "costo", "meta"].filter(
        (k) => k !== "meta" || !(Number(p.meta) > 0),
      ),
    );
  });

  it("con nombre, costo, envíos, comisión y margen completa precio, combo, nicho y textos", () => {
    const p = esencial();
    expect(faltantes(p)).toEqual([]);
    expect(p.precio).toBeGreaterThan(p.costo * 1.5);
    expect(p.ancla).toBeGreaterThan(p.precio);
    expect(p.upPrecio).toBeLessThan(p.precio);
    expect(p.upCosto).toBe(45000);
    expect(p.categoria).toBe("Bienestar");
    expect(String(p.publico)).not.toBe("");
    expect(String(p.angulos)).not.toBe("");
    expect(String(p.objeciones)).not.toBe("");
    // Lo esencial no se toca.
    expect(p.fleteRet).toBe(9000);
    expect(p.com).toBe(3);
    expect(p.nombre).toBe("Masajeador de cuello eléctrico");
  });

  it("el margen que quieres es un piso: sube el precio solo si el óptimo no lo cumple", () => {
    const a = esencial({ meta: 10 });
    const b = esencial({ meta: 15 });
    const c = esencial({ meta: 32 });
    expect(b.precio).toBe(a.precio);
    expect(a.precioVia).toBe("precio recomendado");
    expect(c.precio).toBeGreaterThan(a.precio);
    expect(c.precioVia).toBe("para tu margen de 32 %");
    // Un margen imposible no dispara el precio: se queda en el recomendado (y la ficha avisa).
    const d = esencial({ meta: 60 });
    expect(d.precio).toBe(a.precio);
    expect(d.precio).toBeLessThanOrEqual(45000 * 6);
  });

  it("un campo editado queda fijo y vuelve con «Automático»", () => {
    let p = esencial();
    const auto = p.precio;
    p = editField(S, p, "precio", 129900);
    expect(isManual(p, "precio")).toBe(true);
    p = editField(S, p, "costo", 60000);
    expect(p.precio).toBe(129900);
    expect(p.upCosto).toBe(60000);
    p = backToAuto(S, p, "precio");
    expect(isManual(p, "precio")).toBe(false);
    expect(p.precio).not.toBe(129900);
    expect(p.precio).toBeGreaterThan(auto);
  });

  it("apagado no cambia nada; al encender no pisa lo que ya estaba lleno", () => {
    const legado = {
      ...esencial(),
      auto: undefined,
      manual: undefined,
      ia: undefined,
      precio: 99900,
      publico: "Mamás",
      beneficio: "",
    } as unknown as Product;
    expect(recompute(S, legado)).toBe(legado);
    const p = enableAuto(S, legado);
    expect(p.precio).toBe(99900);
    expect(p.publico).toBe("Mamás");
    expect(isManual(p, "precio")).toBe(true);
    expect(String(p.beneficio)).not.toBe("");
    expect(isManual(p, "beneficio")).toBe(false);
  });

  it("la IA no toca lo fijado ni el nombre, y lo suyo no se recalcula", () => {
    let p = editField(S, esencial(), "publico", "Oficinistas");
    const j = {
      nombre_corto: "Otro nombre",
      categoria: "Hogar",
      publico: "Adultos",
      beneficio: "Alivia la tensión en 10 minutos",
      dolor: "Dolor de cuello",
      angulos: ["Uno", "Dos"],
      objeciones: ["¿Sirve?"],
      invima: "No",
      score: { demanda: 5 },
    } as unknown as MentorResult<"alta">;
    p = applyIA(p, j);
    expect(p.nombre).toBe("Masajeador de cuello eléctrico");
    expect(p.publico).toBe("Oficinistas");
    expect(p.beneficio).toBe("Alivia la tensión en 10 minutos");
    expect(p.angulos).toBe("Uno · Dos");
    expect(p.categoria).toBe("Hogar");
    expect(isIA(p, "beneficio")).toBe(true);
    p = editField(S, p, "costo", 50000);
    expect(p.beneficio).toBe("Alivia la tensión en 10 minutos");
    expect(p.categoria).toBe("Hogar");
  });

  it("fijar marca campos cambiados en otras pantallas solo si hay autocompletado", () => {
    const p = esencial();
    expect(fijar(p, ["precio", "costo"])).toEqual({
      manual: ["precio"],
      ia: [],
    });
    expect(fijar({ ...p, auto: false }, ["precio"])).toEqual({});
  });
});
