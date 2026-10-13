"use client";

import { Construction } from "lucide-react";
import { E } from "@/lib/copiloto/engine";
import { prodTests } from "@/lib/copiloto/logic";
import type { TabSlug } from "@/lib/copiloto/nav";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "./store";
import { ToneBadge } from "./tone";

/** Qué trae cada sección y en qué fase del plan (docs/copiloto/PROMPT-claude-code.md). */
const PLAN: Record<TabSlug, { fase: number; trae: string }> = {
  ruta: { fase: 9, trae: "Las 6 fases del método con sus 25 casillas, el ritmo operativo y los módulos." },
  productos: { fase: 4, trae: "Tabla, ficha, evaluación inicial, resultados de venta, análisis y estrategia; Precio y margen en la fase 5." },
  marketing: { fase: 7, trae: "Ofertas, creativos, página y WhatsApp, y plan de lanzamiento." },
  test: { fase: 6, trae: "El formulario del test y su veredicto: escalar, optimizar o pausar." },
  capital: { fase: 8, trae: "El plan de capital por mes o por semana con tu margen real." },
  crecer: { fase: 8, trae: "El simulador de crecimiento con escenarios y sensibilidad." },
  bitacora: { fase: 9, trae: "Historial de tests, planes y simulaciones, revisión semanal y respaldo." },
};

export function SeccionPendiente({ slug }: { slug: TabSlug }) {
  const p = PLAN[slug];
  return (
    <Card className="flex gap-4 p-6">
      <Construction aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-2" />
      <div>
        <h2 className="text-base font-semibold text-ink">Esta sección llega en la fase {p.fase}</h2>
        <p className="mt-1 text-sm text-ink-2">{p.trae}</p>
        <p className="mt-2 text-sm text-ink-2">Tus datos ya están guardados en tu cuenta; el encabezado y «Tu siguiente paso» ya funcionan con ellos.</p>
      </div>
    </Card>
  );
}

const etTone = (e: string) => (/Ganador|Escalando/.test(e) ? "pos" : /Descartado|Pausado/.test(e) ? "neg" : /En test|Validado/.test(e) ? "warn" : "neutral");

/** Vista previa de solo lectura de Productos: para revisar que los datos migraron bien. */
export function ProductosPreview() {
  const { S, fmt, setSettings } = useCopiloto();
  return (
    <div className="space-y-4">
      <SeccionPendiente slug="productos" />
      <Card>
        <CardHeader title="Tus productos" description="Vista previa de solo lectura con tus datos guardados. Toca un producto para hacerlo el activo." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                {["Producto", "Etapa", "Clase", "Costo", "Precio", "Utilidad por pedido", "Tests", "Utilidad neta real"].map((h, i) => (
                  <th key={h} className={cn("border-b border-border px-4 py-2.5 font-medium", i >= 3 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {S.products.map((p) => {
                const ev = E.evaluate(p, S.risk);
                const a = E.agg(prodTests(S, p.id));
                const active = p.id === S.active;
                return (
                  <tr key={p.id} className={cn(active && "bg-surface-2")}>
                    <td className="border-b border-border px-4 py-2.5">
                      <button type="button" onClick={() => setSettings({ active: p.id })} aria-pressed={active} className="text-left font-semibold text-ink hover:underline">
                        {p.nombre}
                      </button>
                    </td>
                    <td className="border-b border-border px-4 py-2.5">
                      <Badge tone={etTone(p.etapa)}>{p.etapa}</Badge>
                    </td>
                    <td className="border-b border-border px-4 py-2.5">
                      <ToneBadge tone={ev.clase === "A" ? "g" : ev.clase === "B" ? "a" : "r"}>
                        Clase {ev.clase} · {ev.total}
                      </ToneBadge>
                    </td>
                    <td className="border-b border-border px-4 py-2.5 text-right tabular">{fmt.money(p.costo)}</td>
                    <td className="border-b border-border px-4 py-2.5 text-right tabular">{fmt.money(p.precio)}</td>
                    <td className="border-b border-border px-4 py-2.5 text-right tabular">{fmt.money(ev.g.u.utilidadPedido)}</td>
                    <td className="border-b border-border px-4 py-2.5 text-right tabular">{a ? a.n : 0}</td>
                    <td className={cn("border-b border-border px-4 py-2.5 text-right tabular", a ? (a.neta >= 0 ? "text-pos" : "text-neg") : "text-muted")}>{a ? fmt.money(a.neta) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
