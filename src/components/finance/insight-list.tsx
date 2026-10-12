import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, OctagonAlert } from "lucide-react";
import type { Insight } from "@/lib/finance/insights";
import { cn } from "../ui/cn";

const ICON = { critical: OctagonAlert, attention: AlertTriangle, info: Info } as const;
const LABEL = { critical: "Prioritario", attention: "Atención", info: "Sugerencia" } as const;
const TONE = { critical: "text-neg bg-neg-soft", attention: "text-warn bg-warn-soft", info: "text-info bg-info-soft" } as const;

/** Recomendaciones deterministas: observación, datos, explicación, acción, impacto e incertidumbre. */
export function InsightList({ insights, limit }: { insights: Insight[]; limit?: number }) {
  const list = limit ? insights.slice(0, limit) : insights;
  if (!list.length) return <p className="px-5 py-6 text-sm text-ink-2">No hay alertas por ahora. Sigue registrando tus movimientos para mantener el análisis al día.</p>;
  return (
    <ul className="divide-y divide-border">
      {list.map((i) => {
        const Icon = ICON[i.severity];
        return (
          <li key={i.id} className="px-5 py-4">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start gap-3">
                <span className={cn("mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", TONE[i.severity])}>
                  <Icon aria-hidden className="size-3" />
                  {LABEL[i.severity]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{i.title}</span>
                  <span className="block text-sm text-ink-2">{i.observation}</span>
                </span>
                <span className="text-xs text-muted group-open:hidden">Ver más</span>
              </summary>
              <div className="mt-3 space-y-2 pl-1 text-sm sm:pl-[88px]">
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
                <Link href={i.action.href} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                  {i.action.label} <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
