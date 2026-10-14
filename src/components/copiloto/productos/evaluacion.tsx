"use client";

import { E } from "@/lib/copiloto/engine";
import { activeProduct } from "@/lib/copiloto/logic";
import { fijar } from "@/lib/copiloto/autoficha";
import { claseText, claseTone } from "@/lib/copiloto/productos";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import { ToneBadge } from "../tone";
import { Kpi, Segmented, ToneAlert } from "../ui";

const RING = {
  g: "border-pos",
  a: "border-warn",
  r: "border-neg",
  b: "border-info",
} as const;

/** Evaluación inicial y unidad económica (renderEval, L720–729). */
export function Evaluacion() {
  const { S, fmt, updateProduct } = useCopiloto();
  const p = activeProduct(S);
  const ev = E.evaluate(p, S.risk);
  const g = ev.g,
    u = g.u,
    R = g.R;
  const tone = claseTone(ev.clase);
  const score = p.score as Record<string, number>;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          <h3 className="t-overline text-muted">
            Criterios (1 = malo · 5 = excelente)
          </h3>
          <div className="mt-2">
            {E.CRIT.map(([k, label, w]) => (
              <Segmented
                key={k}
                label={label}
                hint={`(${w} %)`}
                value={Math.max(1, Math.min(5, Number(score[k]) || 3))}
                onChange={(v) =>
                  updateProduct(p.id, {
                    score: { ...p.score, [k]: v },
                    ...fijar(p, ["score"]),
                  })
                }
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            El puntaje combina estos criterios (65 %) con la economía del
            producto (35 %). Si no pasa la validación de margen, queda en clase
            C aunque los criterios sean buenos.
          </p>
        </div>
        <div className="space-y-3">
          <div
            className={cn(
              "rounded-lg border-2 bg-surface p-5 text-center",
              RING[tone],
            )}
          >
            <p className="t-overline text-muted">
              Puntaje de evaluación inicial
            </p>
            <p className="mt-1 font-title text-6xl leading-none font-medium text-ink tabular">
              {ev.total}
            </p>
            <p className="mt-3">
              <ToneBadge tone={tone}>
                Clase {ev.clase} · {claseText(ev.clase)}
              </ToneBadge>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left">
              <div className="rounded-md bg-surface-2 px-3 py-2">
                <p className="text-xs text-muted">Criterios</p>
                <p className="text-sm">
                  <strong className="text-base text-ink tabular">
                    {Math.round(ev.cual * 0.65)}/65
                  </strong>{" "}
                  <span className="text-xs text-muted">
                    atractivo comercial
                  </span>
                </p>
              </div>
              <div className="rounded-md bg-surface-2 px-3 py-2">
                <p className="text-xs text-muted">Economía</p>
                <p className="text-sm">
                  <strong className="text-base text-ink tabular">
                    {Math.round(ev.econ * 0.35)}/35
                  </strong>{" "}
                  <span className="text-xs text-muted">
                    {fmt.pct(u.margenPct)} del ticket
                  </span>
                </p>
              </div>
            </div>
          </div>
          {ev.warn.map(([t, m], i) => (
            <ToneAlert
              key={i}
              tone={t}
              title={
                t === "r"
                  ? "Riesgo."
                  : t === "a"
                    ? "Atención."
                    : t === "g"
                      ? "Bien."
                      : "Info."
              }
            >
              {m}
            </ToneAlert>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="t-section text-ink">Unidad económica</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            t="Utilidad por pedido"
            v={fmt.money(u.utilidadPedido)}
            s="antes de publicidad"
            tone={u.utilidadPedido > 0 ? "g" : "r"}
          />
          <Kpi t="CPA máximo" v={fmt.money(u.cpaMax)} s="punto de equilibrio" />
          <Kpi
            t="CPA objetivo"
            v={fmt.money(g.cpaObj)}
            s={`deja ${fmt.pct(R.holguraCPA)} de holgura`}
            tone="g"
          />
          <Kpi t="ROAS mínimo" v={fmt.x(u.roasMin)} s="sobre lo entregado" />
        </div>
        {g.pass ? (
          <ToneAlert
            tone="g"
            title={`Pasa la validación para riesgo ${S.risk}/10.`}
          >
            Utilidad por pedido {fmt.pct(u.margenPct)} del ticket (mínimo{" "}
            {fmt.pct(R.margenMin)}). Para testear, apunta a un CPA de{" "}
            {fmt.money(g.cpaObj)} o menos.
          </ToneAlert>
        ) : (
          <ToneAlert tone="r" title="No pasa la validación.">
            {!g.ok1
              ? "Pierde dinero aunque la publicidad fuera gratis."
              : `La utilidad por pedido es ${fmt.pct(u.margenPct)} del ticket y tu riesgo exige al menos ${fmt.pct(R.margenMin)}.`}{" "}
            Sube el precio, agrega un combo, negocia el costo o busca otro
            producto.
          </ToneAlert>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            t="Ticket esperado"
            v={fmt.money(u.aov)}
            s={
              (p.upTasa as number) > 0
                ? `incluye upsell (${p.upTasa}%)`
                : "sin upsell"
            }
          />
          <Kpi t="Margen por entregado" v={fmt.money(u.margenEntregado)} />
          <Kpi
            t="Pérdida por devolución"
            v={fmt.money(u.perdidaDevuelto)}
            s="flete perdido"
            tone="a"
          />
          <Kpi
            t="Presupuesto por test"
            v={fmt.money(g.presTest)}
            s={`${R.pedidosDecidir} pedidos a CPA objetivo`}
          />
          <Kpi
            t="Fondo de aprendizaje"
            v={fmt.money(g.fondo)}
            s="5 tests"
            tone="a"
          />
          <Kpi
            t="Corte sin ventas"
            v={fmt.money(R.killMult * u.cpaMax)}
            s={`${R.killMult.toFixed(1).replace(".", ",")}× CPA máximo`}
            tone="r"
          />
        </div>
      </div>
    </div>
  );
}
