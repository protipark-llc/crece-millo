/**
 * Lógica de la interfaz del original que no está en el motor pero define números que se
 * muestran o se guardan. Portada sin cambios; las líneas son de CoPiloto_Trendo_v5.html.
 */
import { E } from "./engine";
import type { CopilotState, Product, Test } from "./state";

/** Tests de un producto en orden cronológico (prodTests, L702). */
export function prodTests(S: Pick<CopilotState, "tests">, id: string): Test[] {
  return S.tests.filter((t) => t.productId === id).sort((a, b) => String(a.form.fecha || "").localeCompare(String(b.form.fecha || "")) || a.ts - b.ts);
}

/** Supuestos por defecto de Precio y margen (pcDefaults, L786). */
export function pcDefaults(S: Pick<CopilotState, "tests" | "risk" | "simForm">, p: Product) {
  const a = E.agg(prodTests(S, p.id));
  const n = E.rn(S.risk);
  return {
    costo: p.costo,
    P: p.precio,
    upPrecio: p.upPrecio || 0,
    upCosto: p.upCosto || 0,
    upTasa: p.upTasa || 0,
    cpa0: Math.round((a && a.ped >= 3 ? a.cpa : p.precio * 0.2) / 100) * 100,
    p0: p.precio,
    elast: 1.2,
    techo: (p.precioComp as number) > 0 ? Math.round(((p.precioComp as number) * 1.15) / 1000) * 1000 : (p.ancla as number) > p.precio ? (p.ancla as number) : 0,
    presupuesto: 1500000,
    conf: p.conf ?? 90,
    entrega: a && a.conf >= 5 ? Math.round(a.tasaEntrega * 100) : p.entrega,
    flete: p.flete,
    fleteRet: p.fleteRet,
    empaque: p.empaque || 0,
    costoConf: p.costoConf || 0,
    com: p.com,
    imp: p.imp || 0,
    fijosMes: (S.simForm.fijos as number) || 200000,
    margenMin: Math.round(14 - 6 * n),
    margenObj: 20,
  };
}

const num = (v: unknown) => {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
};
const cl = (v: unknown) => String(v ?? "").replace(/[;\n\r]+/g, " ");

/**
 * «Productos para Notion» (exportProductsCSV, L772): separador «;», columnas exactas y números
 * con punto decimal (es un archivo para importar, no texto para leer: no lleva formato es-CO).
 */
export function productsCsv(S: CopilotState): string {
  const h =
    [
      "Producto",
      "Etapa",
      "Categoría",
      "Sub-nicho",
      "SKU Dropi",
      "Costo proveedor (COP)",
      "Precio venta (COP)",
      "Precio tachado (COP)",
      "Flete (COP)",
      "% Entrega",
      "Puntaje evaluación",
      "Clase",
      "Utilidad por pedido (COP)",
      "Requiere INVIMA",
      "Público objetivo",
      "Ángulo de venta",
      "Link Dropi",
      "Gasto ads real (COP)",
      "Utilidad neta real (COP)",
      "ROAS real",
      "Notas",
    ].join(";") + "\n";
  return (
    h +
    S.products
      .map((p) => {
        const ev = E.evaluate(p, S.risk),
          a = E.agg(prodTests(S, p.id));
        return [
          p.nombre,
          p.etapa,
          p.categoria,
          p.subnicho,
          p.sku,
          p.costo,
          p.precio,
          p.ancla,
          p.flete,
          (p.entrega / 100).toFixed(2),
          ev.total,
          ev.clase,
          Math.round(ev.g.u.utilidadPedido),
          p.invima,
          p.publico,
          p.angulos,
          p.linkDropi,
          a ? Math.round(a.ads) : "",
          a ? Math.round(a.neta) : "",
          a ? a.roas.toFixed(2) : "",
          p.notas,
        ]
          .map(cl)
          .join(";");
      })
      .join("\n")
  );
}

/** «Tests a CSV» (exportTestsCSV, L1142). */
export function testsCsv(S: CopilotState): string {
  const h = "Test;Producto;Canal;Fecha inicio;Presupuesto/día (COP);Gasto total (COP);CPA (COP);Ventas;Pedidos entregados;Pedidos devueltos;Resultado;Aprendizaje\n";
  const map = (v: string) => (/Escalar/.test(v) ? "Escalar" : /matar/i.test(v) ? "Matar" : /Optimizar|Mantener/.test(v) ? "Iterar" : "En curso");
  return (
    h +
    S.tests
      .map((t) => {
        const c = t.c as Record<string, number>;
        return [
          t.form.nombre || t.producto,
          t.producto,
          t.form.canal,
          new Date(t.ts).toISOString().slice(0, 10),
          Math.round(c.ads! / Math.max(1, num(t.form.dias))),
          Math.round(c.ads!),
          Math.round(c.cpa!),
          c.ped,
          Math.round(c.ent!),
          Math.round(c.dev!),
          map(t.verdict),
          t.verdict,
        ].join(";");
      })
      .join("\n")
  );
}
