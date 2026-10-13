"use client";

import { Construction } from "lucide-react";
import type { TabSlug } from "@/lib/copiloto/nav";
import { Card } from "@/components/ui/primitives";

/** Qué trae cada sección y en qué fase del plan (docs/copiloto/PROMPT-claude-code.md). */
const PLAN: Record<TabSlug, { fase: number; trae: string }> = {
  ruta: {
    fase: 9,
    trae: "Las 6 fases del método con sus 25 casillas, el ritmo operativo y los módulos.",
  },
  productos: {
    fase: 4,
    trae: "Tabla, ficha, evaluación inicial, resultados de venta, análisis y estrategia; Precio y margen en la fase 5.",
  },
  marketing: {
    fase: 7,
    trae: "Ofertas, creativos, página y WhatsApp, y plan de lanzamiento.",
  },
  test: {
    fase: 6,
    trae: "El formulario del test y su veredicto: escalar, optimizar o pausar.",
  },
  capital: {
    fase: 8,
    trae: "El plan de capital por mes o por semana con tu margen real.",
  },
  crecer: {
    fase: 8,
    trae: "El simulador de crecimiento con escenarios y sensibilidad.",
  },
  bitacora: {
    fase: 9,
    trae: "Historial de tests, planes y simulaciones, revisión semanal y respaldo.",
  },
};

export function SeccionPendiente({ slug }: { slug: TabSlug }) {
  const p = PLAN[slug];
  return (
    <Card className="flex gap-4 p-6">
      <Construction aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-2" />
      <div>
        <h2 className="text-base font-semibold text-ink">
          Esta sección llega en la fase {p.fase}
        </h2>
        <p className="mt-1 text-sm text-ink-2">{p.trae}</p>
        <p className="mt-2 text-sm text-ink-2">
          Tus datos ya están guardados en tu cuenta; el encabezado y «Tu
          siguiente paso» ya funcionan con ellos.
        </p>
      </div>
    </Card>
  );
}
