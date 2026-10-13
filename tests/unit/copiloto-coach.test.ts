import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { coach, verdictTone } from "@/lib/copiloto/logic";
import { copilotoHref } from "@/lib/copiloto/nav";
import { defaultState, parseBackup, type CopilotState } from "@/lib/copiloto/state";

const TODAY = "2026-10-13";
const demo = () => parseBackup(JSON.parse(readFileSync("docs/copiloto/motor/estado-demo.json", "utf8")), TODAY);
const money = (n: number) => `$${Math.round(n)}`;
const text = (S: CopilotState) => coach(S, money).text.map((x) => x.t).join("");

describe("Co-Piloto · Tu siguiente paso (misma cascada que el original)", () => {
  it("menos de 3 productos → alta rápida", () => {
    const S = defaultState(TODAY);
    S.products = S.products.slice(0, 2);
    expect(coach(S, money)).toMatchObject({ icon: "zap", action: { kind: "alta", label: "Alta rápida" } });
  });
  it("costos estimados y sin tests → ficha", () => {
    const s = coach(defaultState(TODAY), money);
    expect(s).toMatchObject({ icon: "search", action: { label: "Ir a la ficha", tab: "producto", vista: "ficha" } });
    expect(text(defaultState(TODAY))).toBe("Masajeador de ojos térmico: los costos son estimados. Busca el producto en Dropi y carga el costo real y el link en la ficha.");
  });
  it("con la demostración (ojos con SKU, sin upsell) → combo o upsell, como el original", () => {
    const s = coach(demo(), money);
    expect(s).toMatchObject({ icon: "gift", action: { label: "Ver ofertas", tab: "marketing", vista: "ofertas" } });
  });
  it("con upsell y un test que gana → escalar", () => {
    const S = demo();
    const p = S.products.find((x) => x.id === S.active)!;
    p.upTasa = 30;
    p.upPrecio = 60000;
    p.upCosto = 20000;
    const s = coach(S, money);
    expect(["rocket", "trending", "coins"]).toContain(s.icon);
  });
  it("no pasa la validación → Precio y margen", () => {
    const S = demo();
    const p = S.products.find((x) => x.id === S.active)!;
    p.precio = 60000;
    expect(coach(S, money)).toMatchObject({ icon: "calculator", action: { vista: "precio" } });
  });
  it("tono de un veredicto guardado y URLs de las secciones", () => {
    expect(["Escalar", "Escalar con cautela", "Optimizar", "Mantener y optimizar", "Pausar / matar", "Seguir midiendo", "Faltan datos"].map(verdictTone)).toEqual(["g", "g", "a", "a", "r", "b", "b"]);
    expect(copilotoHref("producto", "ana")).toBe("/comunidad/emprendedores/copiloto/productos?vista=analisis");
    expect(copilotoHref("plan")).toBe("/comunidad/emprendedores/copiloto/capital");
    expect(copilotoHref("marketing", "lanz")).toBe("/comunidad/emprendedores/copiloto/marketing?vista=lanzamiento");
  });
});
