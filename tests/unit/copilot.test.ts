import { describe, expect, it } from "vitest";
import {
  analyzePrice,
  checkPrice,
  judgeTest,
  planCapital,
  priceForMargin,
  returnLossPerOrder,
  shelfPrice,
  type PricingInput,
} from "@/lib/copilot/engine";

const cop = (pesos: number) => pesos * 100;
const base: PricingInput = {
  productCost: cop(45_000),
  shippingCost: cop(15_000),
  otherCosts: cop(3_000),
  returnShippingCost: cop(15_000),
  paymentFeeBps: 300,
  platformFeeBps: 200,
  returnRateBps: 2_000,
  expectedCpa: cop(25_000),
  targetMarginBps: 2_000,
};

describe("Co-Piloto · precio", () => {
  it("devoluciones: 20 % de rechazo reparte 1/4 del flete de ida y vuelta en cada entrega", () => {
    expect(returnLossPerOrder(base)).toBe(cop(7_500));
    expect(returnLossPerOrder({ ...base, returnRateBps: 0 })).toBe(0);
  });
  it("precio para un margen = costos / (1 − comisiones − margen)", () => {
    // costos = 45.000 + 15.000 + 3.000 + 7.500 + 25.000 = 95.500; / (1 − 0,05 − 0,20) = 127.333
    expect(priceForMargin(base, 2_000)).toBe(cop(127_333.33));
    expect(priceForMargin(base, 0)).toBe(cop(100_526.32));
    expect(
      priceForMargin({ ...base, platformFeeBps: 9_000 }, 2_000),
    ).toBeNull();
  });
  it("precio de vitrina nunca baja y termina en 900", () => {
    expect(shelfPrice(cop(127_333.33), "COP")).toBe(cop(127_900));
    expect(shelfPrice(cop(127_900), "COP")).toBe(cop(127_900));
    expect(shelfPrice(cop(127_950), "COP")).toBe(cop(128_900));
    expect(shelfPrice(1234, "USD")).toBe(1299);
  });
  it("análisis: recomendado dentro del rango y el rango ordenado", () => {
    const a = analyzePrice(base, "COP");
    expect(a.recommendedPrice).toBe(cop(127_900));
    expect(a.range!.low).toBeLessThan(a.recommendedPrice!);
    expect(a.range!.high).toBeGreaterThan(a.recommendedPrice!);
    expect(a.warnings).toEqual([]);
  });
  it("revisar un precio: contribución = CPA de equilibrio y margen con el CPA esperado", () => {
    const c = checkPrice(base, cop(127_900));
    // comisiones 6.395; contribución = 127.900 − 6.395 − 63.000 − 7.500 = 51.005
    expect(c.contribution).toBe(cop(51_005));
    expect(c.targetCpa).toBe(cop(51_005 - 25_580));
    expect(c.profitPerOrder).toBe(cop(26_005));
    expect(c.marginBps).toBe(2033);
  });
});

describe("Co-Piloto · veredicto del test", () => {
  const t = { breakEvenCpa: cop(18_000), targetCpa: cop(12_000) };
  it("sin ventas: falta información hasta gastar 2 × CPA de equilibrio, luego parar", () => {
    expect(
      judgeTest({ ...t, adSpend: cop(30_000), orders: 0, days: 2 }).verdict,
    ).toBe("falta_info");
    expect(
      judgeTest({ ...t, adSpend: cop(36_000), orders: 0, days: 2 }).verdict,
    ).toBe("parar");
  });
  it("con pocos datos no decide", () => {
    expect(
      judgeTest({ ...t, adSpend: cop(20_000), orders: 1, days: 1 }).verdict,
    ).toBe("falta_info");
  });
  it("CPA 21.400 con máximo 18.000 → optimizar; 10.000 → seguir; 30.000 → parar", () => {
    const r = judgeTest({ ...t, adSpend: cop(85_600), orders: 4, days: 4 });
    expect(r.cpa).toBe(cop(21_400));
    expect(r.verdict).toBe("optimizar");
    expect(
      judgeTest({ ...t, adSpend: cop(40_000), orders: 4, days: 4 }).verdict,
    ).toBe("seguir");
    expect(
      judgeTest({ ...t, adSpend: cop(120_000), orders: 4, days: 4 }).verdict,
    ).toBe("parar");
  });
  it("si el producto no deja margen, parar", () => {
    expect(
      judgeTest({
        breakEvenCpa: 0,
        targetCpa: 0,
        adSpend: 0,
        orders: 0,
        days: 0,
      }).verdict,
    ).toBe("parar");
  });
});

describe("Co-Piloto · plan de capital", () => {
  it("reserva 30 %, costos fijos y número de pruebas", () => {
    const p = planCapital({
      capital: cop(2_000_000),
      reserveBps: 3_000,
      monthlyFixed: cop(150_000),
      testBudget: cop(150_000),
    });
    expect(p.reserve).toBe(cop(600_000));
    expect(p.available).toBe(cop(1_250_000));
    expect(p.productsTestable).toBe(8);
    expect(p.maxLoss).toBe(cop(1_200_000));
    expect(p.warnings).toEqual([]);
  });
  it("avisa con poca reserva o pocas pruebas", () => {
    expect(
      planCapital({
        capital: cop(300_000),
        reserveBps: 1_000,
        monthlyFixed: 0,
        testBudget: cop(150_000),
      }).warnings,
    ).toHaveLength(2);
  });
});

import {
  enabledSections,
  homeHref,
  normalizeSections,
  VIEW_PRESETS,
} from "@/lib/sections";

describe("vistas y secciones", () => {
  it("esencial: flujo de caja mensual y dropshipping", () => {
    const e = enabledSections({ viewMode: "esencial" });
    expect(e).toEqual(VIEW_PRESETS.esencial);
    expect(e).toContain("flujo");
    expect(e).toContain("copiloto");
    expect(e).not.toContain("presupuesto");
    expect(homeHref(e)).toBe("/universidad/finanzas");
  });
  it("personalizada: filtra claves desconocidas y siempre incluye Configuración", () => {
    expect(normalizeSections(["copiloto", "inexistente"])).toEqual([
      "copiloto",
      "configuracion",
    ]);
    expect(
      homeHref(
        enabledSections({ viewMode: "personalizada", sections: ["copiloto"] }),
      ),
    ).toBe("/comunidad/emprendedores/copiloto");
  });
  it("pro (o sin valor) muestra todo", () => {
    expect(enabledSections({ viewMode: "pro" })).toHaveLength(
      VIEW_PRESETS.pro.length,
    );
    expect(enabledSections({})).toHaveLength(VIEW_PRESETS.pro.length);
  });
});
