import { describe, expect, it } from "vitest";
import {
  addMonthsClamped,
  isISODate,
  monthsBetweenCeil,
  weekStart,
} from "@/lib/finance/dates";
import {
  monthlyEquivalent,
  occurrences,
  virtualOccurrences,
} from "@/lib/finance/recurrence";
import type { EngineRule } from "@/lib/finance/types";

const rule = (over: Partial<EngineRule>): EngineRule => ({
  id: "r1",
  kind: "expense",
  amount: 100,
  currency: "COP",
  accountId: "a1",
  description: "x",
  frequency: "monthly",
  startDate: "2024-01-31",
  active: true,
  ...over,
});

describe("fechas", () => {
  it("valida fechas, incluidos años bisiestos", () => {
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("2023-02-29")).toBe(false);
    expect(isISODate("2024-13-01")).toBe(false);
  });
  it("suma meses ajustando al fin de mes", () => {
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsClamped("2023-01-31", 1)).toBe("2023-02-28");
    expect(addMonthsClamped("2024-12-15", 1)).toBe("2025-01-15");
    expect(addMonthsClamped("2024-03-31", -1)).toBe("2024-02-29");
  });
  it("calcula semana ISO y meses restantes", () => {
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // domingo → lunes anterior
    expect(monthsBetweenCeil("2026-01-15", "2026-07-15")).toBe(6);
    expect(monthsBetweenCeil("2026-01-15", "2026-07-16")).toBe(7);
  });
});

describe("recurrencias", () => {
  it("mensual anclada al día 31 vuelve al 31 cuando existe", () => {
    expect(occurrences(rule({}), "2024-01-01", "2024-04-30")).toEqual([
      "2024-01-31",
      "2024-02-29",
      "2024-03-31",
      "2024-04-30",
    ]);
  });
  it("quincenal colombiana: 15 y último día", () => {
    expect(
      occurrences(
        rule({ frequency: "semimonthly", startDate: "2025-02-01" }),
        "2025-02-01",
        "2025-03-31",
      ),
    ).toEqual(["2025-02-15", "2025-02-28", "2025-03-15", "2025-03-31"]);
  });
  it("respeta fecha final, anual en bisiesto y semanal", () => {
    expect(
      occurrences(
        rule({ frequency: "yearly", startDate: "2024-02-29" }),
        "2024-01-01",
        "2026-12-31",
      ),
    ).toEqual(["2024-02-29", "2025-02-28", "2026-02-28"]);
    expect(
      occurrences(
        rule({
          frequency: "weekly",
          startDate: "2026-01-05",
          endDate: "2026-01-20",
        }),
        "2026-01-01",
        "2026-12-31",
      ),
    ).toEqual(["2026-01-05", "2026-01-12", "2026-01-19"]);
  });
  it("no duplica ocurrencias ya materializadas (en cualquier estado)", () => {
    const r = rule({ startDate: "2026-01-10" });
    const existing = [{ recurrenceRuleId: "r1", occurrenceDate: "2026-02-10" }];
    const v = virtualOccurrences([r], existing, "2026-01-01", "2026-03-31");
    expect(v.map((t) => t.date)).toEqual(["2026-01-10", "2026-03-10"]);
    // reglas inactivas no generan nada
    expect(
      virtualOccurrences(
        [{ ...r, active: false }],
        [],
        "2026-01-01",
        "2026-03-31",
      ),
    ).toEqual([]);
  });
  it("equivalente mensual", () => {
    expect(monthlyEquivalent({ frequency: "yearly", amount: 1_200 })).toBe(100);
    expect(monthlyEquivalent({ frequency: "biweekly", amount: 100 })).toBe(217);
  });
});
