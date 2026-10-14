import { describe, expect, it } from "vitest";
import { formatNum, parseNum, stepNum } from "@/lib/copiloto/numero";

describe("Co-Piloto · campos numéricos es-CO", () => {
  it("entiende miles con punto o sin separador en campos enteros", () => {
    expect(parseNum("56.000", false)).toBe(56000);
    expect(parseNum("56000", false)).toBe(56000);
    expect(parseNum("$ 1.500.000", false)).toBe(1500000);
    expect(parseNum("", false)).toBeNull();
    expect(parseNum("abc", false)).toBeNull();
  });
  it("entiende coma o punto decimal en campos con decimales", () => {
    expect(parseNum("1,2", true)).toBe(1.2);
    expect(parseNum("1.2", true)).toBe(1.2);
    expect(parseNum("0,5", true)).toBe(0.5);
    expect(parseNum("3", true)).toBe(3);
  });
  it("muestra miles con punto y coma decimal", () => {
    expect(formatNum(56000)).toBe("56.000");
    expect(formatNum(1.2, 2)).toBe("1,2");
  });
  it("paso con flechas, Shift ×10 y límites", () => {
    expect(stepNum(0.2, 0.1, 1, false)).toBe(0.3);
    expect(stepNum(56000, 500, 1, true)).toBe(61000);
    expect(stepNum(2, 1, -1, true, 0)).toBe(0);
    expect(stepNum(79, 1, 1, false, 0, 80)).toBe(80);
  });
});
