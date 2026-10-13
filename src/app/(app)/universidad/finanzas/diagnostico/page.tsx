import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { financePage } from "@/server/page-data";
import { buildOverview } from "@/server/services/dashboard";
import { DIAGNOSTIC_STEPS, type DiagnosticStepKey } from "@/server/services/settings";
import { settingsDefaults } from "@/server/settings-defaults";
import { Badge, ButtonLink, Card, CardHeader, PageHeader, buttonClass } from "@/components/ui/primitives";
import { ActionForm, InlineAction, SubmitButton } from "@/components/ui/form";
import { SettingsForm } from "@/components/finance/forms/settings-form";
import { AccountForm } from "@/components/finance/forms/account-form";
import { formatIndicator } from "@/components/finance/indicator-grid";
import { cn } from "@/components/ui/cn";
import { diagnosticStepAction } from "../actions";

export const metadata: Metadata = { title: "Diagnóstico financiero" };

const BASE = "/universidad/finanzas/diagnostico";

const STEP_INFO: Record<DiagnosticStepKey, { text: string; href?: string; cta?: string }> = {
  profile: { text: "País, moneda, estabilidad de tus ingresos y personas que dependen de ti." },
  accounts: { text: "Cada cuenta con el saldo que tiene hoy: efectivo, bancos, billeteras e inversiones." },
  income: { text: "Tus fuentes de ingreso. Si se repiten (salario, quincena), indícalo para que aparezcan solas.", href: "/universidad/finanzas/movimientos/nuevo?tipo=income", cta: "Registrar un ingreso" },
  expenses: { text: "Gastos fijos (arriendo, servicios, cuotas) y variables (mercado, transporte). Empieza por los fijos.", href: "/universidad/finanzas/movimientos/nuevo?tipo=expense", cta: "Registrar un gasto" },
  annual: { text: "Gastos que no son mensuales: SOAT, impuesto predial, matrículas, vacaciones. En el presupuesto se llevan como anual ÷ 12.", href: "/universidad/finanzas/presupuesto", cta: "Ir al presupuesto" },
  debts: { text: "Tarjetas, créditos y préstamos familiares, con su tasa y cuota mínima si las conoces.", href: "/universidad/finanzas/deudas/nueva", cta: "Registrar una deuda" },
  assets: { text: "Bienes y ahorros: inmuebles, vehículo, inversiones, cesantías, dinero que te deben.", href: "/universidad/finanzas/patrimonio/nuevo", cta: "Registrar un activo" },
  goals: { text: "Lo que quieres lograr, empezando por tu fondo de emergencia.", href: "/universidad/finanzas/objetivos/nuevo", cta: "Crear un objetivo" },
};

export default async function DiagnosticPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { d, f, o } = await financePage(async ({ d, f, tx, userId }) => ({ d, f, o: await buildOverview(tx, userId, d) }));
  const done = new Set(d.settings.diagnosticSteps);
  const stepParam = Number(Array.isArray(params.paso) ? params.paso[0] : params.paso);
  const step = Number.isInteger(stepParam) && stepParam >= 1 && stepParam <= DIAGNOSTIC_STEPS.length ? stepParam : null;
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

  /* 1. Bienvenida: aún no hay pasos completos y no se eligió un paso. */
  if (step === null && done.size === 0) {
    return (
      <div className="grid gap-10 py-4 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-12">
        <div>
          <p className="t-overline text-ink">Bienvenida</p>
          <h1 className="mt-4 font-title text-[34px] leading-[40px] font-medium tracking-[-0.02em] text-ink sm:text-[44px] sm:leading-[50px]">
            Antes de cualquier plan, veamos dónde estás.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-7 text-ink-2">
            El diagnóstico tiene 8 pasos. Con los primeros 4, en unos 3 minutos, ya ves tu punto de partida. Los otros 4 los haces cuando quieras.
          </p>
          <ul className="mt-6 space-y-3 text-[15px]">
            <li className="flex items-start gap-3">
              <Badge>3 min</Badge>
              <span className="text-ink">
                <strong className="font-semibold">Tu punto de partida:</strong> cuánto te entra, cuánto te cuesta vivir un mes y cuánto te queda.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Badge>Sin juicios</Badge>
              <span className="text-ink">No hay respuestas buenas ni malas. Si no sabes un dato, lo saltas y vuelves luego.</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge>Privado</Badge>
              <span className="text-ink">Tus datos son tuyos. Nunca inventamos valores para llenar huecos.</span>
            </li>
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href={`${BASE}?paso=1`} size="lg">
              Empezar mi diagnóstico
            </ButtonLink>
            <Link href="/universidad/finanzas" className={buttonClass("ghost", "lg")}>
              Prefiero explorar primero
            </Link>
          </div>
        </div>
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">Los 8 pasos</h2>
          <ol className="mt-4 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            {DIAGNOSTIC_STEPS.map((s, i) => (
              <li key={s.key} className="flex gap-2">
                <span className={cn("tabular w-4 font-semibold", i < 4 ? "text-ink" : "text-muted")}>{i + 1}</span>
                <span className="text-ink-2">{s.label}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">Los pasos 1 a 4 arman tu primer resultado.</p>
        </Card>
      </div>
    );
  }

  /* 2. Paso guiado en la misma pantalla. */
  if (step !== null) {
    const s = DIAGNOSTIC_STEPS[step - 1]!;
    const info = STEP_INFO[s.key];
    const nextHref = step < DIAGNOSTIC_STEPS.length ? `${BASE}?paso=${step + 1}` : BASE;
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <p className="t-overline text-muted">
            Diagnóstico · paso {step} de {DIAGNOSTIC_STEPS.length}
          </p>
          <Link href={BASE} className="inline-flex min-h-9 items-center text-sm font-semibold text-ink hover:underline">
            Ver todos los pasos
          </Link>
        </div>
        <ol aria-label="Avance del diagnóstico" className="mt-3 grid grid-cols-8 gap-1.5">
          {DIAGNOSTIC_STEPS.map((x, i) => (
            <li key={x.key} className={cn("h-1.5 rounded-full", i + 1 === step ? "bg-accent" : done.has(x.key) ? "bg-brand" : "bg-surface-3")}>
              <span className="sr-only">
                {x.label}: {done.has(x.key) ? "completo" : i + 1 === step ? "en curso" : "pendiente"}
              </span>
            </li>
          ))}
        </ol>
        <h1 className="t-page mt-6 text-ink">{s.label}</h1>
        <p className="mt-2 text-ink-2">{info.text}</p>
        {detected[s.key] && (
          <Badge tone="info" className="mt-3">
            Ya registrado: {detected[s.key]}
          </Badge>
        )}

        <Card className="mt-6 p-5 sm:p-6">
          {s.key === "profile" ? (
            <SettingsForm defaults={settingsDefaults(d.settings)} markProfile compact />
          ) : s.key === "accounts" ? (
            <>
              {d.accountRows.length > 0 && (
                <ul className="mb-5 divide-y divide-border rounded-lg border border-border text-sm">
                  {d.accountRows.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3 px-4 py-2.5">
                      <span className="text-ink">{a.name}</span>
                      <span className="text-muted">{a.currency}</span>
                    </li>
                  ))}
                </ul>
              )}
              <AccountForm defaultCurrency={d.base} today={d.today} />
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-ink-2">Ábrelo en una pestaña nueva o ve y vuelve: tu avance se guarda.</p>
              <ButtonLink href={info.href!} variant="secondary">
                {info.cta} <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            </div>
          )}
        </Card>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <ActionForm action={diagnosticStepAction} onSuccessHref={nextHref}>
            <input type="hidden" name="step" value={s.key} />
            <input type="hidden" name="done" value="on" />
            <SubmitButton size="lg" className="w-full sm:w-auto">
              {step < DIAGNOSTIC_STEPS.length ? "Guardar y seguir" : "Terminar"}
            </SubmitButton>
          </ActionForm>
          <Link href={nextHref} className={buttonClass("ghost", "lg")}>
            Saltar por ahora
          </Link>
          {step > 1 && (
            <Link href={`${BASE}?paso=${step - 1}`} className="text-sm font-medium text-ink-2 hover:text-ink sm:ml-auto">
              Paso anterior
            </Link>
          )}
        </div>
      </div>
    );
  }

  /* 3. Resumen: avance y punto de partida. */
  const reliable = o.indicators.filter((i) => i.status === "ok");
  const missing = o.indicators.filter((i) => i.status !== "ok");
  const nextStep = DIAGNOSTIC_STEPS.findIndex((s) => !done.has(s.key));
  return (
    <>
      <PageHeader
        eyebrow="Finanzas personales · Diagnóstico"
        title={done.size >= 4 ? "Este es tu punto de partida." : "Tu diagnóstico"}
        description="No tienes que completarlo de una vez. Cada dato que registras se guarda y mejora el análisis. Nunca inventamos valores para llenar huecos."
        actions={
          nextStep >= 0 ? (
            <ButtonLink href={`${BASE}?paso=${nextStep + 1}`}>
              Seguir con el paso {nextStep + 1} <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          ) : undefined
        }
      />
      <ol aria-label="Pasos del diagnóstico" className="mb-8 grid gap-3 md:grid-cols-2">
        {DIAGNOSTIC_STEPS.map((s, i) => {
          const isDone = done.has(s.key);
          return (
            <li key={s.key}>
              <Card className="flex h-full items-start gap-3 px-5 py-4">
                {isDone ? <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-pos" /> : <Circle aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {i + 1}. {s.label} <span className="sr-only">({isDone ? "completo" : "pendiente"})</span>
                  </p>
                  <p className="text-sm text-ink-2">{STEP_INFO[s.key].text}</p>
                  {detected[s.key] && (
                    <Badge tone="info" className="mt-2">
                      Registrado: {detected[s.key]}
                    </Badge>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link href={`${BASE}?paso=${i + 1}`} className="inline-flex min-h-9 items-center text-sm font-semibold text-ink hover:underline">
                      {isDone ? "Revisar" : "Completar"}
                    </Link>
                    <InlineAction action={diagnosticStepAction} fields={{ step: s.key, done: isDone ? "" : "on" }}>
                      {isDone ? "Marcar pendiente" : "Marcar listo"}
                    </InlineAction>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
      <Card>
        <CardHeader title="¿Qué podemos calcular con fiabilidad?" description="Según los datos registrados hasta hoy." />
        <div className="grid gap-6 p-5 text-sm md:grid-cols-2">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 font-semibold text-pos">
              <CheckCircle2 aria-hidden className="size-4" /> Disponibles ({reliable.length})
            </p>
            <ul className="space-y-1.5">
              {reliable.map((i) => (
                <li key={i.key} className="flex justify-between gap-2">
                  <span className="text-ink-2">{i.label}</span>
                  <span className="tabular font-medium text-ink">{formatIndicator(i, f)}</span>
                </li>
              ))}
            </ul>
          </div>
          {missing.length > 0 && (
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 font-semibold text-warn">
                <Circle aria-hidden className="size-4" /> Falta información ({missing.length})
              </p>
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
    </>
  );
}
