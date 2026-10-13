"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, OctagonAlert, Trash2 } from "lucide-react";
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
  /** Supuestos activos (casillas de «¿Qué quieres probar?»). */
  on?: Partial<Record<Toggle, boolean>>;
}

type Toggle = "pay" | "loss" | "buy" | "extra" | "inc" | "exp";

/** Escenarios guardados antes de existir las casillas: se activan los supuestos con valor. */
function inferOn(x: Partial<FormState>): Partial<Record<Toggle, boolean>> {
  if (x.on) return x.on;
  const has = (v?: string) => !!v && v.trim() !== "" && v.trim() !== "0";
  return { pay: has(x.paymentAmount), loss: has(x.lossAmount), buy: has(x.purchaseAmount), extra: has(x.extraDebt), inc: has(x.incomePct), exp: has(x.expensePct) };
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
    on: {},
  };
  const [s, setS] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setS((p) => ({ ...p, [k]: e.target.value }));
  const isOn = (t: Toggle) => !!s.on?.[t];
  const toggle = (t: Toggle) => setS((p) => ({ ...p, on: { ...p.on, [t]: !p.on?.[t] } }));

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
    const on = (t: Toggle) => !!s.on?.[t];
    const loss = on("loss") ? money("Pérdida de ingreso", s.lossAmount) : 0;
    const pay = on("pay") ? money("Nueva cuota", s.paymentAmount) : 0;
    const buy = on("buy") ? money("Compra", s.purchaseAmount) : 0;
    const a: ScenarioAssumptions = {
      ...DEFAULT_ASSUMPTIONS,
      horizonMonths: Math.max(1, Math.min(120, Math.round(num(s.horizon, 12)))),
      incomeChangePct: on("inc") ? num(s.incomePct) : 0,
      expenseChangePct: on("exp") ? num(s.expensePct) : 0,
      incomeLoss: loss > 0 ? { amount: loss, startMonth: Math.max(1, Math.round(num(s.lossStart, 1))), months: Math.max(1, Math.round(num(s.lossMonths, 1))) } : null,
      newMonthlyPayment: pay > 0 ? { amount: pay, startMonth: Math.max(1, Math.round(num(s.paymentStart, 1))), months: Math.max(1, Math.round(num(s.paymentMonths, 1))) } : null,
      oneOffPurchase: buy > 0 ? { amount: buy, month: Math.max(1, Math.round(num(s.purchaseMonth, 1))) } : null,
      extraDebtPayment: on("extra") ? Math.max(0, money("Abono extra", s.extraDebt)) : 0,
      debtStrategy: s.strategy,
      cashAnnualReturnPct: Math.max(0, Math.min(30, num(s.returnPct))),
    };
    const deltas: VariantDeltas = { favorable: { incomePct: num(s.favInc), expensePct: num(s.favExp) }, unfavorable: { incomePct: num(s.unfInc), expensePct: num(s.unfExp) } };
    const v = runVariants(base, a, deltas);
    return { errors, a, v, drivers: scenarioDrivers(base, a) };
  }, [s, currency, startDate, debts, baseline.otherAssets]);

  const fmt = (v: number) => formatMoney(v, currency, locale);
  const monthLabel = (n: number) => formatMonth(addMonthsClamped(startDate, n, 1), locale, true).replace(" de ", " ").replace(".", "");
  const labels = computed.v.base.months.map((x) => formatMonthShort(x.date, locale));
  const variants = [
    { key: "unfavorable", label: "Desfavorable", r: computed.v.unfavorable, color: "var(--chart-2)" },
    { key: "base", label: "Base", r: computed.v.base, color: "var(--chart-1)" },
    { key: "favorable", label: "Favorable", r: computed.v.favorable, color: "var(--chart-3)" },
  ] as const;
  const { base: vb, unfavorable: vu } = computed.v;
  const verdict = vb.firstNegativeMonth
    ? { tone: "neg" as const, badge: "No alcanza", title: `En el escenario base la caja se agota en ${monthLabel(vb.firstNegativeMonth)}.` }
    : vu.firstNegativeMonth
      ? { tone: "warn" as const, badge: "Alcanza, pero con poco margen", title: `En el escenario base sí; en el desfavorable la caja se agota en ${monthLabel(vu.firstNegativeMonth)}.` }
      : { tone: "pos" as const, badge: "Alcanza", title: "Alcanza en los tres escenarios." };
  const unfInc = num(s.unfInc);
  const unfExp = num(s.unfExp);
  const unfText = `Si tus ingresos ${unfInc < 0 ? `bajan ${Math.abs(unfInc)}` : `suben ${unfInc}`} % y tus gastos ${unfExp >= 0 ? `suben ${unfExp}` : `bajan ${Math.abs(unfExp)}`} %, ${vu.firstNegativeMonth ? "no alcanzaría: tu fondo de emergencia sería el colchón." : "también alcanzaría."}`;
  const maxDriver = Math.max(1, ...computed.drivers.map((x) => Math.abs(x.impactOnCash)));

  const field = (label: string, k: keyof FormState, opts: { suffix?: string; prefix?: string; hint?: string } = {}) => (
    <label className="flex min-w-0 flex-col gap-1 text-xs">
      <span className="text-ink-2">
        {label} {opts.suffix && <span className="text-muted">({opts.suffix})</span>}
      </span>
      <span className="relative">
        {opts.prefix && (
          <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
            {opts.prefix}
          </span>
        )}
        <input className={cn(inputClass, "tabular", opts.prefix && "pl-7 text-right")} inputMode="decimal" value={String(s[k] ?? "")} onChange={set(k)} />
      </span>
      {opts.hint && <span className="text-muted">{opts.hint}</span>}
    </label>
  );
  const num2 = (label: string, k: keyof FormState, hint?: string, suffix?: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-ink">
        {label} {suffix && <span className="font-normal text-muted">({suffix})</span>}
      </span>
      <input className={cn(inputClass, "tabular")} inputMode="decimal" value={String(s[k] ?? "")} onChange={set(k)} />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
  const option = (t: Toggle, title: string, sub: string, body: React.ReactNode) => (
    <li className={cn("rounded-lg", isOn(t) ? "border-2 border-brand bg-surface-2" : "border border-border")}>
      <label className="flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3">
        <input type="checkbox" checked={isOn(t)} onChange={() => toggle(t)} className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" />
        <span>
          <span className="block font-semibold text-ink">{title}</span>
          <span className="block text-xs text-muted">{sub}</span>
        </span>
      </label>
      {isOn(t) && <div className="grid gap-2 px-4 pb-4">{body}</div>}
    </li>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,400px)_1fr]">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="t-section text-ink">¿Qué quieres probar?</h2>
            <label className="sr-only" htmlFor="sim-horizon">
              Horizonte
            </label>
            <select id="sim-horizon" className={cn(inputClass, "h-10 w-32")} value={s.horizon} onChange={set("horizon")}>
              <option value="12">12 meses</option>
              <option value="24">24 meses</option>
              <option value="60">60 meses</option>
            </select>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm">
            {option(
              "pay",
              "Nueva cuota mensual",
              "¿Puedo asumirla?",
              <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
                {field("Cuota", "paymentAmount", { prefix: "$" })}
                {field("Desde el mes", "paymentStart")}
                {field("Durante", "paymentMonths", { suffix: "meses" })}
              </div>,
            )}
            {option(
              "loss",
              "Pierdo ingresos un tiempo",
              "Monto mensual que dejaría de recibir",
              <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
                {field("Monto", "lossAmount", { prefix: "$" })}
                {field("Desde el mes", "lossStart")}
                {field("Durante", "lossMonths", { suffix: "meses" })}
              </div>,
            )}
            {option(
              "buy",
              "Compra importante",
              "Pago único de contado",
              <div className="grid grid-cols-2 gap-2">
                {field("Valor", "purchaseAmount", { prefix: "$" })}
                {field("En el mes", "purchaseMonth")}
              </div>,
            )}
            {option(
              "extra",
              "Abono extra a deudas",
              "Mensual, además de las cuotas",
              <div className="grid grid-cols-2 gap-2">
                {field("Abono", "extraDebt", { prefix: "$" })}
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-ink-2">Estrategia</span>
                  <select className={inputClass} value={s.strategy} onChange={set("strategy")}>
                    <option value="avalanche">Avalancha</option>
                    <option value="snowball">Bola de nieve</option>
                  </select>
                </label>
              </div>,
            )}
            {option("inc", "Cambio en ingresos", "Ej. 10 = +10 %", field("Cambio", "incomePct", { suffix: "%" }))}
            {option("exp", "Cambio en gastos", "Ej. 15 = +15 %", field("Cambio", "expensePct", { suffix: "%" }))}
          </ul>
        </Card>
        <details className="group rounded-lg border border-border bg-surface">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-base font-semibold text-ink">
            Línea base y escenarios
            <span className="text-xs font-normal text-muted group-open:hidden">Editar</span>
          </summary>
          <div className="grid gap-3 border-t border-border p-5">
            <p className="text-xs text-muted">{baseline.source}</p>
            {num2("Caja inicial", "liquidBalance", undefined, currency)}
            {num2("Ingreso mensual", "monthlyIncome", undefined, currency)}
            {num2("Gastos esenciales al mes", "monthlyEssential", "Sin cuotas de deuda: las deudas se modelan aparte.", currency)}
            {num2("Gastos discrecionales al mes", "monthlyDiscretionary", undefined, currency)}
            {num2("Rendimiento supuesto de la caja", "returnPct", "0 por defecto. No es una garantía.", "% anual")}
            <p className="pt-2 text-sm font-semibold text-ink">Escenarios favorable y desfavorable</p>
            <div className="grid grid-cols-2 gap-3">
              {num2("Favorable: ingresos", "favInc", undefined, "%")}
              {num2("Favorable: gastos", "favExp", undefined, "%")}
              {num2("Desfavorable: ingresos", "unfInc", undefined, "%")}
              {num2("Desfavorable: gastos", "unfExp", undefined, "%")}
            </div>
            <p className="text-xs text-muted">
              Deudas incluidas: {debts.length ? debts.map((x) => x.name).join(", ") : "ninguna"}. Otros activos ({fmt(baseline.otherAssets)}) se mantienen constantes, sin valorización supuesta.
            </p>
          </div>
        </details>
      </div>

      <div className="min-w-0 space-y-5">
        {computed.errors.map((e) => (
          <Alert key={e} tone="neg">
            {e}
          </Alert>
        ))}
        <Card className="p-5 sm:p-6">
          <Badge tone={verdict.tone}>
            {verdict.tone === "pos" ? <CheckCircle2 aria-hidden className="size-3" /> : verdict.tone === "warn" ? <AlertTriangle aria-hidden className="size-3" /> : <OctagonAlert aria-hidden className="size-3" />}
            {verdict.badge}
          </Badge>
          <h2 className="t-answer mt-3 text-ink">{verdict.title}</h2>
          <p className="mt-3 text-sm text-ink-2">
            Tu caja termina en <strong className="tabular text-ink">{fmt(vb.finalCash)}</strong> y nunca baja de <strong className="tabular text-ink">{fmt(vb.minCash)}</strong>. {unfText}
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {variants.map(({ key, label, r, color }) => (
              <li key={key} className={cn("rounded-lg p-4", key === "base" ? "border-2 border-brand" : "bg-surface-2")}>
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <svg aria-hidden width="18" height="6">
                    <line x1="0" y1="3" x2="18" y2="3" stroke={color} strokeWidth="2.5" strokeDasharray={key === "unfavorable" ? "2 3" : key === "favorable" ? "5 3" : undefined} />
                  </svg>
                  {label}
                </p>
                <p className={cn("t-kpi mt-1", r.finalCash < 0 ? "text-neg" : "text-ink")}>{fmt(r.finalCash)}</p>
                <p className="text-xs text-muted">caja al final ({computed.a.horizonMonths} meses)</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                  <dt className="text-muted">Caja mínima</dt>
                  <dd className={cn("text-right tabular", r.minCash < 0 ? "text-neg" : "text-ink")}>{fmt(r.minCash)}</dd>
                  <dt className="text-muted">Primer mes negativo</dt>
                  <dd className={cn("text-right", r.firstNegativeMonth ? "text-neg" : "text-ink")}>{r.firstNegativeMonth ? monthLabel(r.firstNegativeMonth) : "Ninguno"}</dd>
                  <dt className="text-muted">Deuda final</dt>
                  <dd className="text-right text-ink tabular">{fmt(r.finalDebt)}</dd>
                  <dt className="text-muted">Patrimonio final</dt>
                  <dd className="text-right text-ink tabular">{fmt(r.finalNetWorth)}</dd>
                  <dt className="text-muted">Sin deudas en</dt>
                  <dd className="text-right text-ink">{debts.length === 0 ? "—" : r.debtFreeMonth ? `${r.debtFreeMonth} meses` : "No se completa"}</dd>
                </dl>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <LineChart title="Caja proyectada por escenario" labels={labels} series={variants.map((x) => ({ key: x.key, label: x.label, color: x.color, values: x.r.months.map((mm) => mm.cash) }))} currency={currency} locale={locale} />
          </div>
          <details className="group mt-3">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center text-sm font-semibold text-ink">
              <span className="group-open:hidden">Ver patrimonio y deudas</span>
              <span className="hidden group-open:inline">Ocultar patrimonio y deudas</span>
            </summary>
            <div className="mt-3 grid gap-5 xl:grid-cols-2">
              <LineChart title="Patrimonio neto proyectado (base)" labels={labels} series={[{ key: "nw", label: "Patrimonio", color: "var(--chart-1)", values: vb.months.map((x) => x.netWorth) }]} currency={currency} locale={locale} height={200} />
              <LineChart title="Saldo de deudas proyectado (base)" labels={labels} series={[{ key: "debt", label: "Deuda", color: "var(--chart-2)", values: vb.months.map((x) => x.debt) }]} currency={currency} locale={locale} height={200} />
            </div>
          </details>
        </Card>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">¿Qué pesa más?</h2>
            <p className="mt-1 text-xs text-muted">Cuánto cambia tu caja final (escenario base) por cada supuesto.</p>
            {computed.drivers.length ? (
              <ul className="mt-3 space-y-3">
                {computed.drivers.map((x) => (
                  <li key={x.key} className="text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-ink">{x.label}</span>
                      <span className={cn("font-semibold tabular", x.impactOnCash < 0 ? "text-neg" : "text-pos")}>{formatMoney(x.impactOnCash, currency, locale, { signed: true })}</span>
                    </div>
                    <div aria-hidden className="mt-1 h-1.5 rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${(Math.abs(x.impactOnCash) / maxDriver) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-2">Activa algún supuesto para ver su impacto.</p>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Guardar escenario</h2>
            <p className="mt-1 text-xs text-muted">Solo se guardan los supuestos.</p>
            <ActionForm action={saveScenarioAction} resetOnSuccess className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="assumptions" value={JSON.stringify(s)} />
              <TextField label="Nombre" name="name" placeholder="Ej. Cambio de trabajo 2027" className="min-w-48 flex-1" />
              <SubmitButton variant="secondary">Guardar</SubmitButton>
            </ActionForm>
            {saved.length > 0 && (
              <ul className="mt-4 divide-y divide-border rounded-md border border-border">
                {saved.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <FlaskConical aria-hidden className="size-4 shrink-0 text-muted" />
                      <span className="truncate">{x.name}</span>
                    </span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-md px-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
                        onClick={() => {
                          const a = x.assumptions as Partial<FormState>;
                          setS({ ...initial, ...a, on: inferOn(a) });
                        }}
                      >
                        Cargar
                      </button>
                      <ConfirmAction action={deleteScenarioAction} fields={{ id: x.id }} label={<span className="sr-only">Eliminar {x.name}</span>} icon={<Trash2 aria-hidden className="size-3.5" />} title="Eliminar escenario" description="Se eliminarán estos supuestos guardados." confirmLabel="Eliminar" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        {[...new Set(vb.warnings)].map((w) => (
          <Alert key={w} tone="warn">
            {w}
          </Alert>
        ))}
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Badge>Supuestos</Badge> Gastos e ingresos constantes salvo los cambios indicados; deudas con tasa constante; sin inflación ni valorización de bienes.
          <InfoTip text="Caja_t = caja_{t−1} × (1 + rendimiento si caja > 0) + ingreso_t − gasto_t − pagos de deuda_t. Patrimonio = caja + otros activos − deudas." />
        </p>
      </div>
    </div>
  );
}
