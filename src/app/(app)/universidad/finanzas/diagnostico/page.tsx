import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { financePage } from "@/server/page-data";
import { buildOverview } from "@/server/services/dashboard";
import { DIAGNOSTIC_STEPS, type DiagnosticStepKey } from "@/server/services/settings";
import { settingsDefaults } from "@/server/settings-defaults";
import { Card, CardHeader, Meter, PageHeader, Badge } from "@/components/ui/primitives";
import { InlineAction } from "@/components/ui/form";
import { SettingsForm } from "@/components/finance/forms/settings-form";
import { formatIndicator } from "@/components/finance/indicator-grid";
import { diagnosticStepAction } from "../actions";

export const metadata: Metadata = { title: "Diagnóstico financiero" };

const STEP_INFO: Record<DiagnosticStepKey, { text: string; href: string; cta: string }> = {
  profile: { text: "País, moneda, estabilidad de tus ingresos y personas que dependen de ti.", href: "#perfil", cta: "Completar abajo" },
  accounts: { text: "Cada cuenta con el saldo que tiene hoy: efectivo, bancos, billeteras e inversiones.", href: "/universidad/finanzas/cuentas", cta: "Registrar cuentas" },
  income: { text: "Tus fuentes de ingreso. Si se repiten (salario, quincena), crea una recurrencia.", href: "/universidad/finanzas/movimientos/nuevo?tipo=income", cta: "Registrar ingresos" },
  expenses: { text: "Gastos fijos (arriendo, servicios, cuotas) y variables (mercado, transporte). Empieza por los fijos.", href: "/universidad/finanzas/movimientos/nuevo?tipo=expense", cta: "Registrar gastos" },
  annual: { text: "Gastos que no son mensuales: SOAT, impuesto predial, matrículas, vacaciones. Preséntalos al presupuesto como anual ÷ 12.", href: "/universidad/finanzas/presupuesto", cta: "Ir al presupuesto" },
  debts: { text: "Tarjetas, créditos y préstamos familiares, con su tasa y cuota mínima si las conoces.", href: "/universidad/finanzas/deudas/nueva", cta: "Registrar deudas" },
  assets: { text: "Bienes y ahorros: inmuebles, vehículo, inversiones, cesantías, dinero que te deben.", href: "/universidad/finanzas/patrimonio/nuevo", cta: "Registrar activos" },
  goals: { text: "Lo que quieres lograr, empezando por tu fondo de emergencia.", href: "/universidad/finanzas/objetivos/nuevo", cta: "Crear objetivo" },
};

export default async function DiagnosticPage() {
  const { d, f, o } = await financePage(async ({ d, f, tx, userId }) => ({ d, f, o: await buildOverview(tx, userId, d) }));
  const detected: Record<DiagnosticStepKey, string | null> = {
    profile: d.settings.incomeStability ? "Perfil con estabilidad de ingresos" : null,
    accounts: d.accountRows.length ? `${d.accountRows.length} cuenta(s)` : null,
    income: d.txs.some((t) => t.kind === "income") || d.rules.some((r) => r.kind === "income") ? `${d.txs.filter((t) => t.kind === "income").length} ingreso(s), ${d.rules.filter((r) => r.kind === "income").length} recurrente(s)` : null,
    expenses: d.txs.some((t) => t.kind === "expense") ? `${d.txs.filter((t) => t.kind === "expense").length} gasto(s)` : null,
    annual: null,
    debts: d.debtRows.length ? `${d.debtRows.length} deuda(s)` : null,
    assets: d.assetRows.length ? `${d.assetRows.length} activo(s)` : null,
    goals: d.goalRows.length ? `${d.goalRows.length} objetivo(s)` : null,
  };
  const done = new Set(d.settings.diagnosticSteps);
  const reliable = o.indicators.filter((i) => i.status === "ok");
  const missing = o.indicators.filter((i) => i.status !== "ok");
  return (
    <>
      <PageHeader
        eyebrow="Paso a paso"
        title="Diagnóstico financiero"
        description="No tienes que completarlo de una vez. Cada dato que registras se guarda y mejora el análisis. Nunca inventamos valores para llenar huecos."
      />
      <Card className="mb-6 p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-ink">Avance</span>
          <span className="text-muted">
            {done.size} de {DIAGNOSTIC_STEPS.length} pasos
          </span>
        </div>
        <Meter value={done.size} max={DIAGNOSTIC_STEPS.length} label="Avance del diagnóstico" />
      </Card>
      <ol className="mb-8 space-y-3">
        {DIAGNOSTIC_STEPS.map((s, i) => {
          const isDone = done.has(s.key);
          const info = STEP_INFO[s.key];
          return (
            <li key={s.key}>
              <Card className="flex flex-wrap items-start gap-4 px-5 py-4">
                {isDone ? <CheckCircle2 aria-label="Completado" className="mt-0.5 size-5 text-pos" /> : <Circle aria-label="Pendiente" className="mt-0.5 size-5 text-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {i + 1}. {s.label}
                  </p>
                  <p className="text-sm text-ink-2">{info.text}</p>
                  {detected[s.key] && <Badge tone="info" className="mt-1.5">Registrado: {detected[s.key]}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={info.href} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                    {info.cta} <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                  <InlineAction action={diagnosticStepAction} fields={{ step: s.key, done: isDone ? "" : "on" }}>
                    {isDone ? "Marcar pendiente" : "Marcar listo"}
                  </InlineAction>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="perfil">
          <CardHeader title="Tu perfil financiero" description="Esta información personaliza las sugerencias. Es privada." />
          <div className="p-5">
            <SettingsForm defaults={settingsDefaults(d.settings)} markProfile compact />
          </div>
        </Card>
        <Card>
          <CardHeader title="¿Qué podemos calcular con fiabilidad?" description="Según los datos registrados hasta hoy." />
          <div className="space-y-4 p-5 text-sm">
            <div>
              <p className="mb-2 font-medium text-pos">Disponibles ({reliable.length})</p>
              <ul className="space-y-1">
                {reliable.map((i) => (
                  <li key={i.key} className="flex justify-between gap-2">
                    <span className="text-ink-2">{i.label}</span>
                    <span className="tabular text-ink">{formatIndicator(i, f)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {missing.length > 0 && (
              <div>
                <p className="mb-2 font-medium text-warn">Falta información ({missing.length})</p>
                <ul className="space-y-1.5">
                  {missing.map((i) => (
                    <li key={i.key}>
                      <span className="text-ink">{i.label}:</span> <span className="text-ink-2">{i.missing ?? "Datos insuficientes"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
