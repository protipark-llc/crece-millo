import { describe, expect, it } from "vitest";
import {
  allocateEvenly,
  applyPercentChange,
  formatMoney,
  mulRatio,
  parseAmount,
  ratio,
  roundMinor,
  sum,
  toInputString,
} from "@/lib/money/money";

describe("money", () => {
  it("parsea formatos colombianos y genéricos a unidades menores", () => {
    expect(parseAmount("1.200.000", "COP")).toBe(120_000_000);
    expect(parseAmount("1.200.000,50", "COP")).toBe(120_000_050);
    expect(parseAmount("$ 3.000.000", "COP")).toBe(300_000_000);
    expect(parseAmount("1200", "COP")).toBe(120_000);
    expect(parseAmount("1.200", "COP")).toBe(120_000);
    expect(parseAmount("12.5", "USD")).toBe(1250);
    expect(parseAmount("0,99", "USD")).toBe(99);
    expect(parseAmount("1500", "CLP")).toBe(1500);
  });

  it("rechaza entradas inválidas", () => {
    expect(() => parseAmount("", "COP")).toThrow();
    expect(() => parseAmount("-100", "COP")).toThrow(/negativo/);
    expect(() => parseAmount("abc", "COP")).toThrow();
    expect(() => parseAmount("1,234", "USD")).toThrow(/decimales/);
    expect(() => parseAmount("10,5", "CLP")).toThrow(/decimales/);
    expect(() => parseAmount("1.2.3", "COP")).toThrow();
    expect(() => parseAmount("99999999999999999999", "COP")).toThrow();
  });

  it("redondea half-up simétrico y evita errores binarios", () => {
    expect(roundMinor(2.5)).toBe(3);
    expect(roundMinor(-2.5)).toBe(-3);
    expect(roundMinor(1.005 * 100)).toBe(101);
    expect(roundMinor(-0.4)).toBe(0);
  });

  it("multiplica por razones con BigInt exacto", () => {
    expect(mulRatio(1000, 1, 3)).toBe(333);
    expect(mulRatio(2000, 1, 3)).toBe(667);
    expect(applyPercentChange(100_000, 10)).toBe(110_000);
    expect(applyPercentChange(100_000, -15)).toBe(85_000);
  });

  it("reparte sin perder unidades y nunca divide por cero", () => {
    expect(allocateEvenly(100, 3)).toEqual([34, 33, 33]);
    expect(sum(allocateEvenly(100, 3))).toBe(100);
    expect(ratio(5, 0)).toBeNull();
  });

  it("formatea COP sin centavos y USD con centavos", () => {
    expect(
      formatMoney(180_000_000, "COP", "es-CO").replace(/\s/g, " "),
    ).toMatch(/1\.800\.000/);
    expect(formatMoney(1250, "USD", "en-US")).toBe("$12.50");
    expect(toInputString(120_000_050, "COP")).toBe("1200000,5");
  });
});
