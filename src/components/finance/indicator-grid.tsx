import type { Indicator } from "@/lib/finance/indicators";
import type { Fmt } from "@/server/format";
import { InfoTip } from "../ui/primitives";
import { cn } from "../ui/cn";

export function formatIndicator(i: Indicator, f: Fmt): string {
  if (i.value === null) return i.status === "not_applicable" ? "No aplica" : "Datos insuficientes";
  switch (i.unit) {
    case "money":
      return f.money(i.value);
    case "percent":
      return f.pct(i.value);
    case "months":
      return f.months(i.value);
    case "count":
      return String(i.value);
  }
}

export function IndicatorGrid({ indicators, f, keys }: { indicators: Indicator[]; f: Fmt; keys?: string[] }) {
  const list = keys ? keys.map((k) => indicators.find((i) => i.key === k)!).filter(Boolean) : indicators;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {list.map((i) => {
        const missing = i.value === null;
        const negative = i.value !== null && i.value < 0 && (i.key === "net_flow" || i.key === "savings_rate" || i.key.startsWith("net_worth"));
        return (
          <div key={i.key} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-1.5 text-[13px] text-muted">
              <span>{i.label}</span>
              <InfoTip text={`${i.explanation} Fórmula: ${i.formula}. Periodo: ${i.period}.`} />
            </div>
            <div className={cn("mt-1", missing ? "text-sm font-semibold text-muted" : "t-kpi", negative ? "text-neg" : !missing ? "text-ink" : undefined)}>{formatIndicator(i, f)}</div>
            <div className="mt-0.5 text-xs text-muted">{missing && i.missing ? i.missing : i.period}</div>
          </div>
        );
      })}
    </div>
  );
}
