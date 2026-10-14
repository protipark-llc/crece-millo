import { describe, expect, it } from "vitest";
import {
  panelHeadline,
  shortCategory,
  type HeadlineInput,
} from "@/lib/finance/headline";

const base: HeadlineInput = {
  hasAccounts: true,
  firstNegativeDate: null,
  lines: [],
  formatDate: (d) => d,
  formatPct: (v) => `${Math.round(v * 100)} %`,
  formatMoney: (m) => `$ ${m / 100}`,
};
const text = (h: ReturnType<typeof panelHeadline>) =>
  h.segments.map((s) => s.text).join("");
const line = (
  label: string,
  planned: number,
  executed: number,
  projectedOverLimit = false,
) => ({
  label,
  planned,
  executed,
  overLimit: executed > planned,
  projectedOverLimit,
});

describe("respuesta principal del Panel", () => {
  it("sin cuentas invita a registrarlas", () => {
    expect(panelHeadline({ ...base, hasAccounts: false }).tone).toBe("neutral");
  });
  it("el déficit de caja tiene prioridad sobre el presupuesto", () => {
    const h = panelHeadline({
      ...base,
      firstNegativeDate: "2026-12-07",
      lines: [line("Alimentación › Mercado", 75000000, 90000000)],
    });
    expect(h.tone).toBe("neg");
    expect(text(h)).toContain("negativo el 2026-12-07");
  });
  it("una categoría excedida va antes que una sobre su ritmo", () => {
    const h = panelHeadline({
      ...base,
      lines: [
        line("Alimentación › Mercado", 75000000, 62000000, true),
        line("Ocio › Salidas", 10000000, 12000000, true),
      ],
    });
    expect(text(h)).toBe(
      "Tu caja cubre el mes, pero Salidas ya pasó lo planeado por $ 20000.",
    );
  });
  it("categoría sobre su ritmo: «Ojo con Mercado, que ya va en 83 %»", () => {
    const h = panelHeadline({
      ...base,
      lines: [
        line("Alimentación › Mercado", 75000000, 62000000, true),
        line("Servicios › Energía", 20000000, 18500000),
      ],
    });
    expect(h.tone).toBe("warn");
    expect(text(h)).toBe(
      "Vas bien: tu caja cubre el mes. Ojo con Mercado, que ya va en 83 %.",
    );
    expect(h.segments.find((s) => s.emphasis)?.text).toBe("Ojo con Mercado,");
  });
  it("en orden y sin presupuesto", () => {
    expect(text(panelHeadline(base))).toContain("presupuesto va en orden");
    expect(text(panelHeadline({ ...base, lines: null }))).toContain(
      "próximos 90 días",
    );
  });
  it("nombre corto de categoría", () => {
    expect(shortCategory("Alimentación › Mercado")).toBe("Mercado");
    expect(shortCategory("Vivienda")).toBe("Vivienda");
  });
});
