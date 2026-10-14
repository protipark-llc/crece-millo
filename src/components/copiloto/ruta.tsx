"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { E } from "@/lib/copiloto/engine";
import { activeProduct } from "@/lib/copiloto/logic";
import { copilotoHref } from "@/lib/copiloto/nav";
import { ruta } from "@/lib/copiloto/ruta";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "./store";
import { ToneBadge } from "./tone";
import { ToneAlert } from "./ui";

const card = "rounded-lg border border-border bg-surface p-4 sm:p-5";

const RITMO: [string, string, string][] = [
  [
    "Diario (1–3 h)",
    "Aprender 20 min · investigar 20 min · crear 30–60 min · revisar métricas de ayer y tomar UNA decisión · cerrar el día",
    "Notion › Plan de Acción",
  ],
  [
    "Cada test (3–5 días)",
    "Cargar el test aquí, leer el veredicto, registrar en Notion › Pruebas",
    "Productos y Analizar test",
  ],
  [
    "Semanal (45 min)",
    "Revisión con el mentor: qué escalar, qué matar, cuánto capital mover",
    "Bitácora · Revisión semanal",
  ],
  [
    "Mensual",
    "Re-planificar capital con datos reales y decidir si el ganador pasa a importación",
    "Planificar capital y Crecer",
  ],
];

/** Ruta del método (t-ruta, L191–222; renderRuta, L675–686). */
export function Ruta() {
  const { S, fmt, setSettings } = useCopiloto();
  const R = ruta(S);
  const [sel, setSel] = useState<number | null>(null);
  const shown = sel ?? R.cur;
  const F = R.fases[shown]!;
  const p = activeProduct(S);
  const g = E.gate(p, S.risk);
  const rp = E.riskProfile(S.risk);
  const toggle = (id: string, v: boolean) =>
    setSettings({
      checks: { ...(S.checks as Record<string, boolean>), [id]: v },
    });

  return (
    <div className="space-y-4">
      <ToneAlert tone="b">
        <strong>Estás en la Fase {R.completa ? 5 : R.cur}.</strong> Riesgo{" "}
        {S.risk}/10 ({rp.label}) · producto activo: <strong>{p.nombre}</strong>{" "}
        {g.pass ? (
          <ToneBadge tone="g">pasa validación</ToneBadge>
        ) : (
          <ToneBadge tone="r">no pasa validación</ToneBadge>
        )}{" "}
        · CPA objetivo {fmt.money(g.cpaObj)} · presupuesto por test{" "}
        {fmt.money(g.presTest)}.
      </ToneAlert>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="mt-t" className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="mt-t" className="text-xl font-semibold text-ink">
              El método en 6 fases
            </h2>
            <p className="text-sm text-muted tabular">
              {R.hechos} de {R.total} pasos
            </p>
          </div>
          <ol
            className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6"
            aria-label="Fases del método"
          >
            {R.fases.map((x) => {
              const active = x.fi === shown;
              return (
                <li key={x.f.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-current={
                      x.fi === R.cur && !R.completa ? "step" : undefined
                    }
                    onClick={() => setSel(x.fi)}
                    className={cn(
                      "flex h-full w-full flex-col gap-1.5 rounded-md p-2 text-left text-xs",
                      active ? "bg-surface-2" : "hover:bg-surface-2/60",
                    )}
                  >
                    <span
                      aria-hidden
                      className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
                    >
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          x.pc === 1 ? "bg-pos" : "bg-ink",
                        )}
                        style={{ width: `${x.pc * 100}%` }}
                      />
                    </span>
                    <span
                      className={cn(
                        "leading-tight text-ink",
                        active && "font-semibold",
                      )}
                    >
                      {x.pc === 1 && (
                        <Check
                          aria-hidden
                          className="mr-0.5 inline size-3 text-pos"
                        />
                      )}
                      {x.fi} · {x.f.t.replace(/ \(.*\)$/, "")}
                    </span>
                    <span className="text-muted tabular">
                      {x.done}/{x.items.length} · {fmt.pct(x.pc)}
                      <span className="sr-only">
                        {x.pc === 1 ? " · completa" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 rounded-lg bg-surface-2 p-4">
            <p className="t-overline text-muted">
              Fase {F.fi} · {Math.round(F.pc * 100)}%
            </p>
            <h3 className="mt-0.5 text-lg font-semibold text-ink">{F.f.t}</h3>
            <p className="text-sm text-ink-2">{F.f.s}</p>
            <ul className="mt-3 space-y-2">
              {F.items.map((x) => (
                <li key={x.id}>
                  <label
                    className={cn(
                      "flex min-h-12 items-start gap-3 rounded-md bg-surface p-3 text-sm text-ink",
                      x.auto ? "cursor-default" : "cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={x.v}
                      disabled={x.auto}
                      onChange={(e) => toggle(x.id, e.target.checked)}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--ink)] disabled:opacity-100"
                      aria-describedby={x.auto ? `${x.id}-auto` : undefined}
                    />
                    <span className="min-w-0 flex-1">{x.text}</span>
                    {x.auto && (
                      <span
                        id={`${x.id}-auto`}
                        className="shrink-0 rounded-sm bg-info-soft px-1.5 py-0.5 text-[11px] font-semibold text-info"
                      >
                        automático
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
            {F.f.tab && (
              <Link
                href={copilotoHref(F.f.tab)}
                className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink hover:underline"
              >
                Ir a la herramienta de esta fase{" "}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section aria-labelledby="ro-t" className={card}>
            <h2 id="ro-t" className="mb-3 text-lg font-semibold text-ink">
              Ritmo operativo
            </h2>
            <dl className="space-y-3 text-sm">
              {RITMO.map(([k, v, d]) => (
                <div key={k} className="grid grid-cols-[110px_1fr] gap-3">
                  <dt className="font-semibold text-ink">{k}</dt>
                  <dd className="text-ink-2">
                    {v}
                    <span className="mt-0.5 block text-xs text-muted">{d}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="md-t" className={card}>
            <h2 id="md-t" className="mb-3 text-lg font-semibold text-ink">
              Módulos
            </h2>
            <ul className="space-y-2">
              <li className="flex items-center justify-between gap-2 rounded-md border-2 border-ink p-3">
                <span>
                  <strong className="block text-ink">Dropshipping</strong>
                  <span className="text-xs text-muted">
                    Shopify + Dropi · Colombia
                  </span>
                </span>
                <ToneBadge tone="g">Activo</ToneBadge>
              </li>
              {[
                [
                  "Bolsa",
                  "Cartera, riesgo y rebalanceo con la misma barra 1–10",
                ],
                ["Propiedad raíz", "Cap rate, flujo y apalancamiento"],
              ].map(([t, d]) => (
                <li
                  key={t}
                  className="flex items-center justify-between gap-2 rounded-md bg-surface-2 p-3"
                >
                  <span>
                    <strong className="block text-ink">{t}</strong>
                    <span className="text-xs text-muted">{d}</span>
                  </span>
                  <span className="rounded-sm bg-surface-3 px-2 py-0.5 text-xs font-semibold text-ink-2">
                    Próximamente
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
