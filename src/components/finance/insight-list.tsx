import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, OctagonAlert } from "lucide-react";
import type { Insight } from "@/lib/finance/insights";
import { cn } from "../ui/cn";

const ICON = { critical: OctagonAlert, attention: AlertTriangle, info: Info } as const;
const LABEL = { critical: "Prioritario", attention: "Atención", info: "Dato" } as const;
const TONE = { critical: "text-neg bg-neg-soft", attention: "text-warn bg-warn-soft", info: "text-info bg-info-soft" } as const;

/** Recomendaciones deterministas: observación, datos, explicación, acción, impacto e incertidumbre. */
export function InsightList({ insights, limit }: { insights: Insight[]; limit?: number }) {
  const list = limit ? insights.slice(0, limit) : insights;
  if (!list.length) return <p className="px-5 py-6 text-sm text-ink-2">No hay alertas por ahora. Sigue registrando tus movimientos para mantener el análisis al día.</p>;
  return (
    <ul className="space-y-3 p-4 sm:p-5">
      {list.map((i) => {
        const Icon = ICON[i.severity];
        return (
          <li key={i.id} className="rounded-lg bg-surface-2 p-4">
            <span className={cn("inline-flex h-6 items-center gap-1 rounded-sm px-2 text-xs font-semibold", TONE[i.severity])}>
              <Icon aria-hidden className="size-3.5" />
              {LABEL[i.severity]}
            </span>
            <p className="mt-2 text-base leading-[22px] font-semibold text-ink">{i.title}</p>
            <p className="mt-1 text-sm text-ink-2">{i.observation}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href={i.action.href} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-ink hover:underline">
                {i.action.label} <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </div>
            <details className="group">
              <summary className="inline-flex min-h-9 cursor-pointer list-none items-center text-xs font-medium text-muted hover:text-ink">
                <span className="group-open:hidden">Por qué te lo decimos</span>
                <span className="hidden group-open:inline">Ocultar explicación</span>
              </summary>
              <div className="mt-1 space-y-2 text-sm">
                {i.data.length > 0 && (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    {i.data.map((x) => (
                      <div key={x.label} className="contents">
                        <dt className="text-muted">{x.label}</dt>
                        <dd className="tabular text-ink">{x.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="text-ink-2">
                  <span className="font-medium text-ink">Por qué importa: </span>
                  {i.explanation}
                </p>
                {i.impact && (
                  <p className="text-ink-2">
                    <span className="font-medium text-ink">Impacto estimado: </span>
                    {i.impact}
                  </p>
                )}
                {i.uncertainty && <p className="text-xs text-muted">Incertidumbre: {i.uncertainty}</p>}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
