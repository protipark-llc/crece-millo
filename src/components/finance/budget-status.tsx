import { AlertTriangle, Check, Clock, Minus, OctagonAlert, type LucideIcon } from "lucide-react";
import type { BudgetLineResult } from "@/lib/finance/budget";
import type { Fmt } from "@/server/format";
import { cn } from "../ui/cn";

export interface LineStatus {
  tone: "pos" | "warn" | "neg" | "info" | "muted";
  icon: LucideIcon;
  text: string;
  meter: "brand" | "warn" | "neg";
}

/**
 * Estado escrito de una línea de presupuesto (guía de contenido: «Pagado completo», «Quedan $ X»,
 * «Comprometido, falta pagar», «Al cierre te pasarías $ X»). Siempre ícono + texto.
 * `pace` muestra el ritmo («83 % usado con el 39 % del mes») en lugar de la proyección al cierre.
 */
export function budgetLineStatus(l: BudgetLineResult, f: Fmt, opts: { monthPct: number; currency?: string; pace?: boolean }): LineStatus {
  const m = (x: number) => f.money(x, opts.currency);
  if (l.planned <= 0) return { tone: "muted", icon: Minus, text: "Sin monto asignado", meter: "brand" };
  if (l.overLimit) return { tone: "neg", icon: OctagonAlert, text: `Excedido por ${m(l.executed - l.planned)}`, meter: "neg" };
  if (l.executed >= l.planned) return { tone: "pos", icon: Check, text: "Pagado completo", meter: "brand" };
  if (l.projectedOverLimit)
    return opts.pace
      ? { tone: "warn", icon: AlertTriangle, text: `${f.pct(l.executed / l.planned, 0)} usado con el ${f.pct(opts.monthPct, 0)} del mes`, meter: "warn" }
      : { tone: "warn", icon: AlertTriangle, text: `Al cierre te pasarías ${m(l.projectedClose - l.planned)}`, meter: "warn" };
  if (l.committed > 0 && l.executed + l.committed >= l.planned) return { tone: "info", icon: Clock, text: "Comprometido, falta pagar", meter: "brand" };
  if (l.executed === 0) return { tone: "muted", icon: Minus, text: "Sin movimientos aún", meter: "brand" };
  return { tone: "pos", icon: Check, text: `${f.pct(l.executed / l.planned, 0)} usado · quedan ${m(l.planned - l.executed)}`, meter: "brand" };
}

const TONE = { pos: "text-pos", warn: "text-warn", neg: "text-neg", info: "text-info", muted: "text-muted" } as const;

export function LineStatusText({ status, className }: { status: LineStatus; className?: string }) {
  const Icon = status.icon;
  return (
    <p className={cn("inline-flex items-start gap-1 text-xs font-semibold", TONE[status.tone], className)}>
      <Icon aria-hidden className="mt-px size-3.5 shrink-0" /> <span>{status.text}</span>
    </p>
  );
}
