"use client";

import { Mentor } from "../mentor";
import Link from "next/link";
import { Flag, Truck } from "lucide-react";
import { E, type Tone } from "@/lib/copiloto/engine";
import { diagnoseEsCO } from "@/lib/copiloto/format";
import { activeProduct, prodTests } from "@/lib/copiloto/logic";
import {
  STAGE_FROM,
  evolution,
  expectedVsReal,
  strategyPlan,
  suggestion,
} from "@/lib/copiloto/productos";
import { copilotoHref } from "@/lib/copiloto/nav";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import { ToneBadge } from "../tone";
import { CopLineChart } from "../chart";
import { Kpi, TONE_ICON, TONE_TEXT, ToneAlert, useToast } from "../ui";

const card = "rounded-lg border border-border bg-surface p-4 sm:p-5";

/** Análisis y estrategia (renderAnalysis, L741–763). */
export function Analisis() {
  const { S, fmt, updateProduct } = useCopiloto();
  const toast = useToast();
  const p = activeProduct(S);
  const T = prodTests(S, p.id);
  const a = E.agg(T);
  const g = E.gate(p, S.risk);

  if (!a)
    return (
      <ToneAlert tone="b">
        Aún no hay resultados de venta para este producto. Registra el primero
        en{" "}
        <Link
          href={copilotoHref("producto", "res")}
          scroll={false}
          className="font-semibold underline"
        >
          3 · Resultados de venta
        </Link>{" "}
        y aquí verás métricas, embudo, evolución y estrategia.
      </ToneAlert>
    );

  const meta = (p.meta as number) || 20;
  const v = E.verdict(a, meta, S.risk, p);
  const D = diagnoseEsCO(a, p, S.risk, { cur: S.cur, trm: S.trm });
  const plan = strategyPlan(v, g, D, fmt.money);
  const vs = expectedVsReal(a, g, fmt);
  const F = (
    [
      ["Impresiones", a.imp],
      ["Clics", a.clics],
      ["Pedidos", a.ped],
      ["Confirmados", a.conf],
      ["Entregados", a.ent],
    ] as [string, number][]
  ).filter((x) => x[1] > 0);
  const mx = Math.max(...F.map((x) => x[1]), 1);
  const pts = evolution(T);
  const sg = suggestion(S, p);
  const stage = STAGE_FROM[sg.label];
  const vTone: Tone = v.tone;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi
          t="Gasto en ads"
          v={fmt.money(a.ads)}
          s={`${a.n} registro(s)${a.dias ? ` · ${a.dias} días` : ""}`}
        />
        <Kpi
          t="Recaudo"
          v={fmt.money(a.ingresos)}
          s={`AOV ${fmt.money(a.aov)}`}
        />
        <Kpi
          t="Utilidad neta"
          v={fmt.money(a.neta)}
          s={`rentabilidad ${fmt.pct(a.rent / 100)} · meta ${meta}%`}
          tone={a.neta >= 0 ? "g" : "r"}
        />
        <Kpi
          t="ROAS"
          v={fmt.x(a.roas)}
          s={`equilibrio ${fmt.x(a.roasEq)}`}
          tone={a.roas >= a.roasEq ? "g" : "r"}
        />
        <Kpi
          t="CPA real"
          v={fmt.money(a.cpa)}
          s={`objetivo ${fmt.money(g.cpaObj)}`}
          tone={a.cpa <= g.cpaObj ? "g" : a.cpa <= a.cpaMax ? "a" : "r"}
        />
        <Kpi
          t="CTR"
          v={a.ctr === null ? "—" : fmt.pct(a.ctr)}
          s={
            a.cpc === null
              ? "registra impresiones y clics"
              : `CPC ${fmt.money(a.cpc)}`
          }
          tone={
            a.ctr === null
              ? ""
              : a.ctr >= 0.012
                ? "g"
                : a.ctr >= 0.008
                  ? "a"
                  : "r"
          }
        />
        <Kpi
          t="Conversión"
          v={a.cvr === null ? "—" : fmt.pct(a.cvr)}
          s="pedidos / clics"
          tone={
            a.cvr === null
              ? ""
              : a.cvr >= 0.015
                ? "g"
                : a.cvr >= 0.008
                  ? "a"
                  : "r"
          }
        />
        <Kpi
          t="% confirmación"
          v={fmt.pct(a.tasaConf)}
          s={`${Math.round(a.conf)} de ${a.ped}`}
          tone={a.tasaConf >= 0.8 ? "g" : "a"}
        />
        <Kpi
          t="% entrega"
          v={fmt.pct(a.tasaEntrega)}
          s={`${Math.round(a.ent)} entregados · ${Math.round(a.dev)} devueltos`}
          tone={a.tasaEntrega >= 0.8 ? "g" : a.tasaEntrega >= 0.7 ? "a" : "r"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="fun-t" className={card}>
          <h3 id="fun-t" className="mb-3 text-base font-semibold text-ink">
            Embudo
          </h3>
          <ol className="space-y-2">
            {F.map(([name, val], i) => (
              <li
                key={name}
                className="grid grid-cols-[96px_1fr] items-center gap-3 text-sm sm:grid-cols-[110px_1fr_auto]"
              >
                <span className="text-ink-2">{name}</span>
                <span
                  aria-hidden
                  className="h-5 rounded-sm bg-brand"
                  style={{
                    width: `${Math.max(2, Math.sqrt(val / mx) * 100)}%`,
                  }}
                />
                <span className="col-start-2 text-xs text-ink tabular sm:col-start-auto sm:text-sm">
                  {Math.round(val).toLocaleString("es-CO")}
                  {i > 0 ? ` · ${fmt.pct(val / F[i - 1]![1])}` : ""}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            El ancho usa raíz cuadrada para que se vean todas las etapas. El %
            es la conversión frente a la etapa anterior.
          </p>
        </section>

        <section aria-labelledby="vs-t" className={card}>
          <h3 id="vs-t" className="mb-3 text-base font-semibold text-ink">
            Esperado vs. real
          </h3>
          <div
            tabIndex={0}
            role="region"
            aria-label="Tabla con desplazamiento"
            className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Métrica
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Esperado
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Real
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">Comparación</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {vs.map((r) => (
                  <tr key={r.m} className="border-t border-border">
                    <th
                      scope="row"
                      className="py-2 pr-3 text-left font-normal text-ink"
                    >
                      {r.m}
                    </th>
                    <td className="py-2 pr-3 text-right whitespace-nowrap tabular">
                      {r.e}
                    </td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap tabular">
                      {r.r}
                    </td>
                    <td className="py-2">
                      {r.ok ? (
                        <ToneBadge tone="g">Mejor o igual</ToneBadge>
                      ) : (
                        <ToneBadge tone="r">Por debajo</ToneBadge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className={buttonClass("secondary", "md", "mt-3")}
            disabled={!a.conf}
            onClick={() => {
              const entrega = Math.round(a.tasaEntrega * 100);
              updateProduct(p.id, { entrega });
              toast.show(`% de entrega esperado actualizado a ${entrega}%`);
            }}
          >
            <Truck aria-hidden className="size-4" /> Usar el % de entrega real
            como esperado
          </button>
        </section>
      </div>

      <section aria-labelledby="evo-t" className={card}>
        <h3 id="evo-t" className="mb-3 text-base font-semibold text-ink">
          Evolución
        </h3>
        <CopLineChart
          title="Evolución acumulada: utilidad neta, recaudo y gasto en ads"
          labels={pts.map((q) => (q.l ? q.l.slice(5) : ""))}
          xLabel="Fecha"
          money={fmt.money}
          series={[
            {
              key: "n",
              label: "Utilidad neta acumulada",
              color: "var(--pos)",
              values: pts.map((q) => q.n),
            },
            {
              key: "i",
              label: "Recaudo acumulado",
              color: "var(--info)",
              values: pts.map((q) => q.i),
            },
            {
              key: "g",
              label: "Gasto en ads acumulado",
              color: "var(--neg)",
              values: pts.map((q) => q.g),
              dashed: true,
            },
          ]}
        />
      </section>

      <section aria-labelledby="dia-t" className={cn(card, "space-y-3")}>
        <h3 id="dia-t" className="text-base font-semibold text-ink">
          Diagnóstico y estrategia
        </h3>
        <ToneAlert tone={vTone} title={`Estrategia sugerida · ${v.label}.`}>
          {v.why} {plan}
        </ToneAlert>
        <ul className="space-y-2">
          {D.map(([t, ti, m], i) => {
            const Icon = TONE_ICON[t];
            return (
              <li
                key={i}
                className="flex gap-3 rounded-md border border-border px-3 py-2.5 text-sm"
              >
                <Icon
                  aria-hidden
                  className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT[t])}
                />
                <p>
                  <strong className="block font-semibold text-ink">{ti}</strong>
                  <span className="text-ink-2">{m}</span>
                </p>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Mentor
            compact
            action="producto"
            label="Pedir estrategia al mentor"
          />
          <button
            type="button"
            className={buttonClass("ghost", "md")}
            disabled={!stage}
            onClick={() => {
              if (!stage) return;
              updateProduct(p.id, { etapa: stage });
              toast.show(`Etapa: ${stage}`);
            }}
          >
            <Flag aria-hidden className="size-4" /> Aplicar etapa sugerida
            {stage ? `: ${stage}` : ""}
          </button>
        </div>
      </section>
      {toast.node}
    </div>
  );
}
