import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MENTOR_ACTIONS,
  MENTOR_BASE,
  MENTOR_SCHEMAS,
  applyAlta,
  mentorPrompt,
} from "@/lib/copiloto/mentor";
import { activeProduct } from "@/lib/copiloto/logic";
import { parseBackup } from "@/lib/copiloto/state";

const S = parseBackup(
  JSON.parse(readFileSync("docs/copiloto/motor/estado-demo.json", "utf8")),
  "2026-10-14",
);
const f = {
  money: (n: number) => `$${Math.round(n)}`,
  pct: (n: number) => `${Math.round(n * 1000) / 10}%`,
  x: (n: number) => `${n.toFixed(2)}×`,
};

describe("Co-Piloto · Mentor: prompts del original armados en el servidor", () => {
  it("cada acción lleva BASE, el contexto del negocio y la forma JSON pedida", () => {
    for (const a of MENTOR_ACTIONS) {
      const p = mentorPrompt(a, S, {}, f);
      expect(p.startsWith(MENTOR_BASE)).toBe(true);
      expect(p).toContain(
        a === "alta"
          ? "Responde SOLO JSON válido:"
          : "Responde SOLO JSON válido con esta forma:",
      );
      if (a !== "alta") expect(p).toContain("Nivel de riesgo: 5/10 (Normal)");
    }
  });
  it("el análisis del test usa el formulario recibido", () => {
    const p = mentorPrompt(
      "test",
      S,
      {
        testForm: {
          nombre: "Ojos · Meta",
          canal: "Meta Ads",
          dias: 4,
          ads: 650000,
          ped: 18,
          conf: 16,
          ent: 13,
          aov: "",
          meta: 20,
        },
      },
      f,
    );
    expect(p).toContain(
      'Analiza este test: "Ojos · Meta" en Meta Ads, 4 días. Ads $650000, pedidos 18',
    );
    expect(p).toContain("Veredicto del modelo: Escalar.");
  });
  it("valida y aplica la respuesta de «Mejorar textos con IA»", () => {
    const j = MENTOR_SCHEMAS.alta.parse({
      nombre_corto: "Masajeador cervical",
      categoria: "Bienestar",
      publico: "p",
      beneficio: "b",
      dolor: "d",
      angulos: ["a", "b"],
      objeciones: ["x"],
      invima: "No",
      score: {
        wow: 5,
        problema: 9,
        valor: 4,
        demanda: 4,
        competencia: 3,
        envio: 3,
        recompra: 3,
        creativos: 4,
        devol: 3,
        prov: 3,
      },
    });
    const out = applyAlta(activeProduct(S), j);
    expect([
      out.nombre,
      out.angulos,
      out.invima,
      out.score.wow,
      out.score.problema,
    ]).toEqual([
      "Masajeador cervical",
      "a · b",
      "No",
      5,
      activeProduct(S).score.problema,
    ]);
    expect(MENTOR_SCHEMAS.test.safeParse({ veredicto: 1 }).success).toBe(false);
  });
});
