"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Trash2 } from "lucide-react";
import { DEFAULT_ASSUMPTIONS, DEFAULT_VARIANTS, runVariants, scenarioDrivers, type ScenarioAssumptions, type ScenarioBaseline, type VariantDeltas } from "@/lib/finance/scenarios";
import type { DebtForPlan } from "@/lib/finance/debt";
import { formatMoney, parseAmount, toInputString } from "@/lib/money/money";
import { addMonthsClamped, formatMonth, formatMonthShort } from "@/lib/finance/dates";
import { LineChart } from "@/components/charts/charts";
import { Alert, Badge, Card, CardHeader, InfoTip } from "@/components/ui/primitives";
import { ActionForm, ConfirmAction, SubmitButton, TextField, inputClass } from "@/components/ui/form";
import { deleteScenarioAction, saveScenarioAction } from "@/app/(app)/universidad/finanzas/actions";
import { cn } from "@/components/ui/cn";

interface Props {
  currency: string;
  locale: string;
  startDate: string;
  baseline: { liquidBalance: number; monthlyIncome: number; monthlyEssential: number; monthlyDiscretionary: number; otherAssets: number; source: string };
  debts: DebtForPlan[];
  saved: { id: string; name: string; assumptions: unknown }[];
}

interface FormState {
  liquidBalance: string;
  monthlyIncome: string;
  monthlyEssential: string;
  monthlyDiscretionary: string;
  horizon: string;
  incomePct: string;
  expensePct: string;
  lossAmount: string;
  lossStart: string;
  lossMonths: string;
  paymentAmount: string;
  paymentStart: string;
  paymentMonths: string;
  purchaseAmount: string;
  purchaseMonth: string;
  extraDebt: string;
  strategy: "avalanche" | "snowball";
  returnPct: string;
  favInc: string;
  favExp: string;
  unfInc: string;
  unfExp: string;
}

const num = (s: string, def = 0) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && s.trim() !== "" ? n : def;
};

export function Simulator({ currency, locale, startDate, baseline, debts, saved }: Props) {
  const m = (v: number) => toInputString(v, currency);
  const initial: FormState = {
    liquidBalance: m(baseline.liquidBalance),
    monthlyIncome: m(baseline.monthlyIncome),
    monthlyEssential: m(baseline.monthlyEssential),
    monthlyDiscretionary: m(baseline.monthlyDiscretionary),
    horizon: "12",
    incomePct: "0",
    expensePct: "0",
    lossAmount: "",
    lossStart: "1",
    lossMonths: "3",
    paymentAmount: "",
    paymentStart: "1",
    paymentMonths: "24",
    purchaseAmount: "",
    purchaseMonth: "1",
    extraDebt: "",
    strategy: "avalanche",
    returnPct: "0",
    favInc: String(DEFAULT_VARIANTS.favorable.incomePct),
    favExp: String(DEFAULT_VARIANTS.favorable.expensePct),
    unfInc: String(DEFAULT_VARIANTS.unfavorable.incomePct),
    unfExp: String(DEFAULT_VARIANTS.unfavorable.expensePct),
  };
  const [s, setS] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setS((p) => ({ ...p, [k]: e.target.value }));

  const computed = useMemo(() => {
    const errors: string[] = [];
    const money = (label: string, v: string) => {
      if (!v.trim()) return 0;
      try {
        return parseAmount(v.replace(/^-/, ""), currency) * (v.trim().startsWith("-") ? -1 : 1);
      } catch (e) {
        errors.push(`${label}: ${(e as Error).message}`);
        return 0;
      }
    };
    const base: ScenarioBaseline = {
      startDate,
      liquidBalance: money("Caja inicial", s.liquidBalance),
      monthlyIncome: money("Ingreso mensual", s.monthlyIncome),
      monthlyEssential: money("Gastos esenciales", s.monthlyEssential),
      monthlyDiscretionary: money("Gastos discrecionales", s.monthlyDiscretionary),
      otherAssets: baseline.otherAssets,
      debts,
    };
    const loss = money("Pérdida de ingreso", s.lossAmount);
    const pay = money("Nueva cuota", s.paymentAmount);
    const buy = money("Compra", s.purchaseAmount);
    const a: ScenarioAssumptions = {
      ...DEFAULT_ASSUMPTIONS,
      horizonMonths: Math.max(1, Math.min(120, Math.round(num(s.horizon, 12)))),
      incomeChangePct: num(s.incomePct),
      expenseChangePct: num(s.expensePct),
      incomeLoss: loss > 0 ? { amount: loss, startMonth: Math.max(1, Math.round(num(s.lossStart, 1))), months: Math.max(1, Math.round(num(s.lossMonths, 1))) } : null,
      newMonthlyPayment: pay > 0 ? { amount: pay, startMonth: Math.max(1, Math.round(num(s.paymentStart, 1))), months: Math.max(1, Math.round(num(s.paymentMonths, 1))) } : null,
      oneOffPurchase: buy > 0 ? { amount: buy, month: Math.max(1, Math.round(num(s.purchaseMonth, 1))) } : null,
      extraDebtPayment: Math.max(0, money("Abono extra", s.extraDebt)),
      debtStrategy: s.strategy,
      cashAnnualReturnPct: Math.max(0, Math.min(30, num(s.returnPct))),
    };
    const deltas: VariantDeltas = { favorable: { incomePct: num(s.favInc), expensePct: num(s.favExp) }, unfavorable: { incomePct: num(s.unfInc), expensePct: num(s.unfExp) } };
    const v = runVariants(base, a, deltas);
    return { errors, a, v, drivers: scenarioDrivers(base, a) };
  }, [s, currency, startDate, debts, baseline.otherAssets]);

  const fmt = (v: number) => formatMoney(v, currency, locale);
  const labels = computed.v.base.months.map((x) => formatMonthShort(x.date, locale));
  const variants = [
    { key: "unfavorable", label: "Desfavorable", r: computed.v.unfavorable, color: "var(--series-2)" },
    { key: "base", label: "Base", r: computed.v.base, color: "var(--series-1)" },
    { key: "favorable", label: "Favorable", r: computed.v.favorable, color: "var(--series-3)" },
  ] as const;
  const num2 = (label: string, k: keyof FormState, hint?: string, suffix?: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-ink">
        {label} {suffix && <span className="font-normal text-muted">({suffix})</span>}
      </span>
      <input className={cn(inputClass, "tabular")} inputMode="decimal" value={s[k]} onChange={set(k)} />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
  return (
    <div className="space-y-6">
      <Alert tone="info" title="Las simulaciones no modifican tus datos reales">
        Todo se calcula en tu navegador a partir de una copia de tu situación actual. Puedes guardar los supuestos para volver a ellos.
      </Alert>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Línea base" description={baseline.source} />
            <div className="grid gap-3 p-5">
              {num2("Caja inicial", "liquidBalance", undefined, currency)}
              {num2("Ingreso mensual", "monthlyIncome", undefined, currency)}
              {num2("Gastos esenciales al mes", "monthlyEssential", "Sin cuotas de deuda: las deudas se modelan aparte.", currency)}
              {num2("Gastos discrecionales al mes", "monthlyDiscretionary", undefined, currency)}
              <p className="text-xs text-muted">
                Deudas incluidas: {debts.length ? debts.map((x) => x.name).join(", ") : "ninguna"}. Otros activos ({fmt(baseline.otherAssets)}) se mantienen constantes, sin valorización supuesta.
              </p>
            </div>
          </Card>
          <Card>
            <CardHeader title="¿Qué pasa si…?" />
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <span className="font-medium text-ink">Horizonte</span>
                <select className={inputClass} value={s.horizon} onChange={set("horizon")}>
                  <option value="12">12 meses</option>
                  <option value="24">24 meses</option>
                  <option value="60">60 meses</option>
                </select>
              </label>
              {num2("Cambio en ingresos", "incomePct", "Ej. 10 = +10 %", "%")}
              {num2("Cambio en gastos", "expensePct", "Ej. 15 = +15 %", "%")}
              {num2("Pierdo ingresos por", "lossAmount", "Monto mensual que dejaría de recibir", currency)}
              <div className="grid grid-cols-2 gap-2">
                {num2("Desde el mes", "lossStart")}
                {num2("Durante", "lossMonths", undefined, "meses")}
              </div>
              {num2("Nueva cuota mensual", "paymentAmount", "¿Puedo asumirla?", currency)}
              <div className="grid grid-cols-2 gap-2">
                {num2("Desde el mes", "paymentStart")}
                {num2("Durante", "paymentMonths", undefined, "meses")}
              </div>
              {num2("Compra importante", "purchaseAmount", "Pago único de contado", currency)}
              {num2("En el mes", "purchaseMonth")}
              {num2("Abono extra a deudas", "extraDebt", "Mensual, adicional a las cuotas", currency)}
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">Estrategia de deudas</span>
                <select className={inputClass} value={s.strategy} onChange={set("strategy")}>
                  <option value="avalanche">Avalancha (mayor tasa)</option>
                  <option value="snowball">Bola de nieve (menor saldo)</option>
                </select>
              </label>
              {num2("Rendimiento supuesto de la caja", "returnPct", "0 por defecto. No es una garantía.", "% anual")}
            </div>
          </Card>
          <Card>
            <CardHeader title="Escenarios favorable y desfavorable" description="Se suman a tus supuestos." />
            <div className="grid grid-cols-2 gap-3 p-5">
              {num2("Favorable: ingresos", "favInc", undefined, "%")}
              {num2("Favorable: gastos", "favExp", undefined, "%")}
              {num2("Desfavorable: ingresos", "unfInc", undefined, "%")}
              {num2("Desfavorable: gastos", "unfExp", undefined, "%")}
            </div>
          </Card>
        </div>
        <div className="min-w-0 space-y-6">
          {computed.errors.map((e) => (
            <Alert key={e} tone="neg">
              {e}
            </Alert>
          ))}
          <div className="grid gap-3 sm:grid-cols-3">
            {variants.map(({ key, label, r }) => (
              <div key={key} className={cn("rounded-xl border bg-surface px-4 py-3.5", key === "base" ? "border-brand" : "border-border")}>
                <p className="text-sm text-muted">{label}</p>
                <p className={cn("mt-1 text-xl font-semibold tabular", r.finalCash < 0 ? "text-neg" : "text-ink")}>{fmt(r.finalCash)}</p>
                <p className="text-xs text-muted">caja al final ({computed.a.horizonMonths} meses)</p>
                <dl className="mt-2 space-y-0.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Caja mínima</dt>
                    <dd className={cn("tabular", r.minCash < 0 && "text-neg")}>{fmt(r.minCash)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Primer mes negativo</dt>
                    <dd>{r.firstNegativeMonth ? formatMonth(addMonthsClamped(startDate, r.firstNegativeMonth, 1), locale) : "Ninguno"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Deuda final</dt>
                    <dd className="tabular">{fmt(r.finalDebt)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Patrimonio final</dt>
                    <dd className="tabular">{fmt(r.finalNetWorth)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Sin deudas en</dt>
                    <dd>{debts.length === 0 ? "—" : r.debtFreeMonth ? `${r.debtFreeMonth} meses` : "No se completa"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <Card>
            <CardHeader title="Saldo de caja por escenario" />
            <div className="px-3 py-4 sm:px-5">
              <LineChart title="Caja proyectada por escenario" labels={labels} series={variants.map((x) => ({ key: x.key, label: x.label, color: x.color, values: x.r.months.map((mm) => mm.cash) }))} currency={currency} locale={locale} />
            </div>
          </Card>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Patrimonio (escenario base)" />
              <div className="px-3 py-4 sm:px-5">
                <LineChart title="Patrimonio neto proyectado" labels={labels} series={[{ key: "nw", label: "Patrimonio", color: "var(--series-1)", values: computed.v.base.months.map((x) => x.netWorth) }]} currency={currency} locale={locale} height={200} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Deudas (escenario base)" />
              <div className="px-3 py-4 sm:px-5">
                <LineChart title="Saldo de deudas proyectado" labels={labels} series={[{ key: "debt", label: "Deuda", color: "var(--series-2)", values: computed.v.base.months.map((x) => x.debt) }]} currency={currency} locale={locale} height={200} />
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader title="¿Qué variables pesan más?" description="Cuánto cambia la caja final si quitas cada supuesto (escenario base)." />
            {computed.drivers.length ? (
              <ul className="divide-y divide-border">
                {computed.drivers.map((x) => (
                  <li key={x.key} className="flex justify-between px-5 py-2.5 text-sm">
                    <span className="text-ink">{x.label}</span>
                    <span className={cn("tabular", x.impactOnCash < 0 ? "text-neg" : "text-pos")}>{formatMoney(x.impactOnCash, currency, locale, { signed: true })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-ink-2">Agrega algún supuesto para ver su impacto.</p>
            )}
          </Card>
          {[...new Set(computed.v.base.warnings)].map((w) => (
            <Alert key={w} tone="warn">
              {w}
            </Alert>
          ))}
          <Card>
            <CardHeader title="Guardar escenario" description="Solo se guardan los supuestos." />
            <div className="p-5">
              <ActionForm action={saveScenarioAction} resetOnSuccess className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="assumptions" value={JSON.stringify(s)} />
                <TextField label="Nombre" name="name" placeholder="Ej. Cambio de trabajo 2027" className="min-w-56 flex-1" />
                <SubmitButton variant="secondary">Guardar</SubmitButton>
              </ActionForm>
              {saved.length > 0 && (
                <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                  {saved.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <FlaskConical aria-hidden className="size-4 text-muted" />
                        {x.name}
                      </span>
                      <span className="flex gap-1">
                        <button type="button" className="rounded-lg px-2 py-1 text-sm text-brand hover:bg-surface-2" onClick={() => setS({ ...initial, ...(x.assumptions as Partial<FormState>) })}>
                          Cargar
                        </button>
                        <ConfirmAction action={deleteScenarioAction} fields={{ id: x.id }} label={<span className="sr-only">Eliminar {x.name}</span>} icon={<Trash2 aria-hidden className="size-3.5" />} title="Eliminar escenario" description="Se eliminarán estos supuestos guardados." confirmLabel="Eliminar" />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Badge>Supuestos</Badge> Gastos e ingresos constantes salvo los cambios indicados; deudas con tasa constante; sin inflación ni valorización de bienes.
            <InfoTip text="Caja_t = caja_{t−1} × (1 + rendimiento si caja > 0) + ingreso_t − gasto_t − pagos de deuda_t. Patrimonio = caja + otros activos − deudas." />
          </p>
        </div>
      </div>
    </div>
  );
}
