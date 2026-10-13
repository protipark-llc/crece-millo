import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BackupError, DEF_FORMS, ETAPAS, PRESET, defaultState, parseBackup, withDefaults } from "@/lib/copiloto/state";
import { pcDefaults, prodTests, productsCsv, testsCsv } from "@/lib/copiloto/logic";

const demo = () => JSON.parse(readFileSync("docs/copiloto/motor/estado-demo.json", "utf8"));
const TODAY = "2026-10-13";

describe("Co-Piloto · estado inicial (igual al original)", () => {
  it("6 productos por defecto con sus preajustes y los formularios del original", () => {
    const S = defaultState(TODAY);
    expect(S.products.map((p) => p.id)).toEqual(["ojos", "cuello", "lampara", "mopa", "difusor", "mascarilla"]);
    const ojos = S.products[0]!;
    expect(ojos).toMatchObject({ nombre: "Masajeador de ojos térmico", costo: 56000, precio: 129900, flete: 16000, entrega: 75, com: 3, conf: 90, empaque: 1000, ancla: 179900, categoria: "Bienestar", etapa: "Investigando", fecha: TODAY });
    expect(ojos.score).toEqual({ ...PRESET.ojos!.score });
    expect(S).toMatchObject({ v: 4, risk: 5, cur: "COP", trm: 3300, active: "ojos", tab: "ruta", ptab: "ficha" });
    expect(DEF_FORMS.simForm).toMatchObject({ cpa: null, asig: 72, reinv: 72, ciclo: 10, ntest: 3, meses: 6, cdt: 9 });
    expect(ETAPAS).toHaveLength(8);
  });
  it("withDefaults combina PDEF + preajuste + producto y conserva la fecha", () => {
    const p = withDefaults({ id: "x", nombre: "Nuevo", costo: 1, precio: 2, flete: 3, fleteRet: 0, entrega: 75, com: 3, fecha: "2026-01-02", score: { wow: 5 } } as never, TODAY);
    expect(p.score).toMatchObject({ wow: 5, problema: 3 });
    expect(p.fecha).toBe("2026-01-02");
    expect(p.invima).toBe("No sé");
  });
});

describe("Co-Piloto · respaldo", () => {
  it("acepta el estado de demostración (v4) sin perder datos", () => {
    const d = demo();
    const S = parseBackup(d, TODAY);
    expect(S.products).toHaveLength(6);
    expect(S.tests).toHaveLength(3);
    expect(S.pc.ojos).toEqual(d.pc.ojos);
    expect(S.mk.ojos).toEqual(d.mk.ojos);
    expect(S.marca).toBe(d.marca);
    expect(S.tests[0]).toEqual(d.tests[0]);
  });
  it("migra un respaldo v3 como el original (v=4, ptab y filtros reiniciados)", () => {
    const d = { ...demo(), v: 3, ptab: "precio", pf: { q: "x", etapa: "Idea", sort: "nombre" } };
    const S = parseBackup(d, TODAY);
    expect(S).toMatchObject({ v: 4, ptab: "ficha", pf: { q: "", etapa: "", sort: "score" } });
  });
  it("rechaza archivos que no son respaldos", () => {
    expect(() => parseBackup({ v: 5, products: [] }, TODAY)).toThrow(BackupError);
    expect(() => parseBackup({ hola: 1 }, TODAY)).toThrow(BackupError);
    const d = demo();
    d.products[1].id = d.products[0].id;
    expect(() => parseBackup(d, TODAY)).toThrow(/repetido/);
    const big = demo();
    big.products[0].costo = "mucho";
    expect(() => parseBackup(big, TODAY)).toThrow(BackupError);
  });
});

describe("Co-Piloto · exportaciones y supuestos", () => {
  it("CSV de productos: columnas exactas, «;» y punto decimal", () => {
    const S = parseBackup(demo(), TODAY);
    const lines = productsCsv(S).split("\n");
    expect(lines[0]).toBe(
      "Producto;Etapa;Categoría;Sub-nicho;SKU Dropi;Costo proveedor (COP);Precio venta (COP);Precio tachado (COP);Flete (COP);% Entrega;Puntaje evaluación;Clase;Utilidad por pedido (COP);Requiere INVIMA;Público objetivo;Ángulo de venta;Link Dropi;Gasto ads real (COP);Utilidad neta real (COP);ROAS real;Notas",
    );
    const ojos = lines[1]!.split(";");
    expect(ojos[0]).toBe("Masajeador de ojos térmico");
    expect(ojos[9]).toBe("0.83");
    expect(ojos[19]).toMatch(/^\d+\.\d\d$/);
    expect(lines).toHaveLength(7);
  });
  it("CSV de tests: resultado mapeado como en el original", () => {
    const S = parseBackup(demo(), TODAY);
    const lines = testsCsv(S).split("\n");
    expect(lines[0]!.startsWith("Test;Producto;Canal;Fecha inicio")).toBe(true);
    expect(lines.slice(1).map((l) => l.split(";")[10])).toContain("Escalar");
  });
  it("pcDefaults usa el CPA real con 3+ pedidos y la entrega real con 5+ confirmados", () => {
    const S = parseBackup(demo(), TODAY);
    const ojos = S.products.find((p) => p.id === "ojos")!;
    expect(prodTests(S, "ojos").map((t) => t.form.fecha)).toEqual([...prodTests(S, "ojos").map((t) => t.form.fecha)].sort());
    const q = pcDefaults(S, ojos);
    expect(q.cpa0 % 100).toBe(0);
    expect(q.entrega).not.toBe(ojos.entrega);
    expect(q).toMatchObject({ costo: 56000, P: ojos.precio, p0: ojos.precio, elast: 1.2, presupuesto: 1500000, margenMin: 11, margenObj: 20 });
  });
});
