"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Save, Shield, Sparkles } from "lucide-react";
import { E, type SimInput, type SimResult } from "@/lib/copiloto/engine";
import { activeProduct } from "@/lib/copiloto/logic";
import {
  SENS_ENTREGA,
  cpaHolgura,
  cpaSuggest,
  growthPoints,
  realism,
  riskSim,
  scenarios,
  sensitivity,
  simCsv,
  simForm,
  simParams,
  type SimForm,
} from "@/lib/copiloto/capital";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import { ToneBadge } from "../tone";
import {
  Kpi,
  LabeledField,
  NumberSlider,
  TONE_ICON,
  TONE_TEXT,
  ToneAlert,
  downloadText,
  useToast,
  MobileSheet,
  NumInput,
} from "../ui";

const card = "rounded-lg border border-border bg-surface p-4 sm:p-5";
const th =
  "border-b border-border px-3 py-2 text-xs font-medium whitespace-nowrap text-muted";
const td = "border-b border-border px-3 py-2 whitespace-nowrap tabular";

/** Crecer: simulador de crecimiento compuesto (renderSim, L1105–1126). */
export function Crecer() {
  const { S, fmt, setSettings, addSaved } = useCopiloto();
  const toast = useToast();
  const p0 = activeProduct(S);
  const f = simForm(S, p0);
  const p = simParams(S, p0);
  const r = E.sim(p);
  const u = r.u;
  const L = r.rows[r.rows.length - 1]!;
  const H = cpaHolgura(p, r, S.risk);
  const esc = scenarios(p);
  const rl = realism(r, esc[0]!.s);
  const set = (patch: Partial<SimForm>) =>
    setSettings({
      simForm: { ...(S.simForm as SimForm), cpa: f.cpa, ...patch },
    });

  const slider = (
    k: keyof SimForm,
    label: string,
    min: number,
    max: number,
    step: number,
    money = true,
  ) => (
    <NumberSlider
      key={`${p0.id}-${k}`}
      label={label}
      value={Number(f[k]) || 0}
      min={min}
      max={Math.max(max, Number(f[k]) || 0)}
      step={step}
      display={money ? fmt.money(Number(f[k]) || 0) : `${f[k]} %`}
      onChange={(v) => set({ [k]: v } as Partial<SimForm>)}
      suffix={money ? undefined : "%"}
    />
  );
  const field = (
    k: keyof SimForm,
    label: string,
    opts: {
      step?: number;
      min?: number;
      max?: number;
      hint?: string;
      suffix?: string;
    } = {},
  ) => (
    <LabeledField key={k} label={label} hint={opts.hint}>
      {(id) => (
        <NumInput
          id={id}
          step={opts.step}
          min={opts.min}
          max={opts.max}
          suffix={opts.suffix}
          value={f[k] as number}
          onChange={(n) => set({ [k]: n === "" ? 0 : n } as Partial<SimForm>)}
        />
      )}
    </LabeledField>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <MobileSheet
          title="Supuestos del simulador"
          summary={`Capital ${fmt.money(p.cap)} · CPA ${fmt.money(p.cpa)} · ${p.meses} meses`}
        >
          <form
            aria-label="Supuestos del simulador"
            className={cn(card, "h-fit space-y-4")}
            onSubmit={(e) => e.preventDefault()}
          >
            <p className="text-sm text-ink-2">
              Usa la unidad económica del producto activo. El CPA sale de tus
              tests si tienes; si no, del CPA objetivo según tu riesgo.
            </p>
            <h2 className="text-lg font-semibold text-ink">Publicidad</h2>
            {slider(
              "cpa",
              "CPA por pedido",
              0,
              Math.max(u.cpaMax * 1.5, 50000),
              500,
            )}
            <button
              type="button"
              className={buttonClass("secondary", "md")}
              onClick={() => {
                const s = cpaSuggest(S, p0);
                set({ cpa: s.cpa });
                toast.show(
                  s.real
                    ? "CPA real de tus tests"
                    : "CPA objetivo según tu riesgo",
                );
              }}
            >
              <Sparkles aria-hidden className="size-4" /> Sugerir CPA
            </button>
            {slider("deg", "Encarecimiento CPA al duplicar %", 0, 60, 1, false)}
            {slider("tope", "Tope de pauta diaria", 0, 2000000, 10000)}
            <h2 className="pt-2 text-lg font-semibold text-ink">
              Capital y reinversión
            </h2>
            {slider("cap", "Capital inicial", 100000, 50000000, 100000)}
            {slider(
              "asig",
              "% del capital a pauta por ciclo",
              0,
              100,
              5,
              false,
            )}
            {slider("reinv", "% de utilidad que reinviertes", 0, 100, 5, false)}
            <button
              type="button"
              className={buttonClass("secondary", "md")}
              onClick={() => set(riskSim(S.risk))}
            >
              <Shield aria-hidden className="size-4" /> Aplicar mi perfil de
              riesgo
            </button>
            <div className="grid grid-cols-2 gap-3">
              {field("fijos", "Costos fijos mensuales", {
                step: 10000,
                min: 0,
              })}
              {field("ciclo", "Ciclo de caja (días)", { step: 1, min: 3 })}
            </div>
            <h2 className="pt-2 text-lg font-semibold text-ink">
              Fase de testeo y horizonte
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {field("ntest", "Productos a testear antes del ganador", {
                step: 1,
                min: 0,
                hint: "Se descuenta del capital antes de escalar. 0 = ya tienes ganador.",
              })}
              {field("meses", "Meses", { step: 1, min: 1, max: 36 })}
            </div>
            {field("cdt", "CDT E.A.", { step: 0.5, min: 0, suffix: "%" })}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className={buttonClass("primary", "md")}
                onClick={() => {
                  addSaved("sim", {
                    id: `s${Date.now()}`,
                    ts: Date.now(),
                    tipo: "Simulación",
                    risk: S.risk,
                    producto: p0.nombre,
                    form: { ...f },
                    resumen: {
                      patrimonio: r.patrimonio,
                      roi: r.roi,
                      tm: r.tm,
                      quiebra: r.quiebra,
                    },
                  });
                  toast.show("Simulación guardada");
                }}
              >
                <Save aria-hidden className="size-4" /> Guardar simulación
              </button>
              <button
                type="button"
                className={buttonClass("ghost", "md")}
                onClick={() =>
                  downloadText("simulacion_copiloto.csv", simCsv(r))
                }
              >
                <Download aria-hidden className="size-4" /> Exportar CSV
              </button>
            </div>
          </form>
        </MobileSheet>

        <div className="order-first min-w-0 space-y-4 lg:order-none">
          <ToneAlert
            tone={rl.tone}
            title={rl.tone === "a" ? "Atención." : "Info."}
          >
            Es una simulación con tus supuestos, no una promesa. El CPA sube a
            medida que escalas y en la vida real hay meses malos: decide mirando
            primero el escenario pesimista.
            {rl.tone === "a" &&
              ` Una tasa de ${fmt.pct(r.tm)} al mes es muy difícil de sostener: la competencia copia, el público se satura y el tope de pauta llega antes.`}
          </ToneAlert>
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            <Kpi
              t="Patrimonio final"
              v={fmt.money(r.patrimonio)}
              s="capital + retirado"
              tone={r.patrimonio > p.cap ? "g" : "r"}
            />
            <Kpi
              t="ROI total"
              v={fmt.pct(r.roi)}
              s={`en ${fmt.meses(L.mes)}`}
              tone={r.roi > 0 ? "g" : "r"}
            />
            <Kpi
              t="Tasa compuesta mensual"
              v={fmt.pct(r.tm)}
              s={
                r.ta > 3
                  ? "no la anualices: horizonte corto"
                  : `≈ ${fmt.pct(r.ta)} anual`
              }
              tone={r.tm > 0 ? "g" : "r"}
            />
            <Kpi
              t="Recuperas lo invertido"
              v={fmt.meses(r.payback)}
              s="incluye lo gastado en testeo"
              tone={r.payback !== null ? "g" : "a"}
            />
            <Kpi
              t="Duplicas"
              v={fmt.meses(r.dup)}
              s="capital + retirado = 2×"
            />
            <Kpi
              t="vs. CDT"
              v={fmt.money(r.patrimonio - r.cdt)}
              s={`CDT: ${fmt.money(r.cdt)}`}
              tone={r.patrimonio > r.cdt ? "g" : "r"}
            />
            <Kpi
              t="Fase de testeo"
              v={fmt.money(r.testeo)}
              s={`${f.ntest} producto(s)`}
              tone="a"
            />
            <Kpi
              t="Pauta diaria final"
              v={fmt.money(L.pauta / p.ciclo)}
              s={`CPA final ${fmt.money(L.cpa)}`}
            />
          </div>
          {H.tone === "r" ? (
            <ToneAlert tone="r">
              El CPA ({fmt.money(p.cpa)}) supera el CPA máximo (
              {fmt.money(u.cpaMax)}). No escales este producto.
            </ToneAlert>
          ) : H.tone === "a" ? (
            <ToneAlert tone="a">
              Holgura de {fmt.pct(H.ms)}: menor a la que exige tu riesgo (
              {fmt.pct(H.exig)}).
            </ToneAlert>
          ) : (
            <ToneAlert tone="g">
              Holgura de {fmt.pct(H.ms)} sobre el CPA máximo: dentro de tu
              perfil.
            </ToneAlert>
          )}
          {r.quiebra !== null && (
            <ToneAlert tone="r">
              Con estos supuestos el capital se agota{" "}
              {r.quiebra === 0
                ? "en la fase de testeo"
                : `hacia el mes ${r.quiebra.toFixed(1).replace(".", ",")}`}
              .
            </ToneAlert>
          )}
          <section aria-labelledby="gc-t" className={card}>
            <h3 id="gc-t" className="mb-3 text-lg font-semibold text-ink">
              Crecimiento del capital
            </h3>
            <GrowthChart r={r} p={p} money={fmt.money} />
          </section>
        </div>
      </div>

      <section aria-labelledby="es-t" className={card}>
        <h3 id="es-t" className="mb-3 text-lg font-semibold text-ink">
          Escenarios
        </h3>
        <div
          tabIndex={0}
          role="region"
          aria-label="Tabla con desplazamiento"
          className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus"
        >
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left">
                {[
                  "Escenario",
                  "% entrega",
                  "CPA",
                  "Utilidad/pedido",
                  "Patrimonio",
                  "ROI",
                  "Tasa mensual",
                  "Resultado",
                ].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(th, i > 0 && i < 7 && "text-right")}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {esc.map(({ n, q, s }) => (
                <tr key={n} className={cn(n === "Base" && "bg-surface-2")}>
                  <th scope="row" className={cn(td, "text-left font-semibold")}>
                    {n}
                  </th>
                  <td className={cn(td, "text-right")}>{String(q.entrega)}%</td>
                  <td className={cn(td, "text-right")}>{fmt.money(q.cpa)}</td>
                  <td className={cn(td, "text-right")}>
                    {fmt.money(s.u.utilidadPedido)}
                  </td>
                  <td className={cn(td, "text-right")}>
                    {fmt.money(s.patrimonio)}
                  </td>
                  <td
                    className={cn(
                      td,
                      "text-right",
                      s.roi > 0 ? "text-pos" : "text-neg",
                    )}
                  >
                    {fmt.pct(s.roi)}
                  </td>
                  <td className={cn(td, "text-right")}>{fmt.pct(s.tm)}</td>
                  <td className={td}>
                    {s.quiebra !== null ? (
                      <ToneBadge tone="r">
                        se agota{" "}
                        {s.quiebra === 0
                          ? "en testeo"
                          : `m${s.quiebra.toFixed(1).replace(".", ",")}`}
                      </ToneBadge>
                    ) : (
                      <ToneBadge tone="g">sostenible</ToneBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          Pesimista: entrega −10 pp y CPA +25%. Optimista: entrega +5 pp y CPA
          −15%.
        </p>
      </section>

      <Sensitivity p={p} />

      <details className={cn(card, "group")}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-lg font-semibold text-ink">
          Detalle por ciclo{" "}
          <ChevronDown
            aria-hidden
            className="size-5 text-muted transition-transform group-open:rotate-180"
          />
        </summary>
        <div
          tabIndex={0}
          role="region"
          aria-label="Tabla con desplazamiento"
          className="relative mt-3 overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus"
        >
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="text-left">
                {[
                  "Ciclo",
                  "Mes",
                  "Pauta",
                  "CPA",
                  "Pedidos",
                  "Entregados",
                  "Ventas",
                  "ROAS",
                  "Utilidad",
                  "Retiro",
                  "Capital",
                  "Retirado",
                ].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(th, i > 0 && "text-right")}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.ciclo}>
                  <th scope="row" className={cn(td, "text-left font-normal")}>
                    {x.ciclo}
                  </th>
                  <td className={cn(td, "text-right")}>
                    {x.mes.toFixed(1).replace(".", ",")}
                  </td>
                  <td className={cn(td, "text-right")}>{fmt.money(x.pauta)}</td>
                  <td className={cn(td, "text-right")}>{fmt.money(x.cpa)}</td>
                  <td className={cn(td, "text-right")}>
                    {x.pedidos.toFixed(0)}
                  </td>
                  <td className={cn(td, "text-right")}>
                    {x.entregados.toFixed(0)}
                  </td>
                  <td className={cn(td, "text-right")}>
                    {fmt.money(x.ventas)}
                  </td>
                  <td className={cn(td, "text-right")}>{fmt.x(x.roas)}</td>
                  <td
                    className={cn(
                      td,
                      "text-right",
                      x.utilidad >= 0 ? "text-pos" : "text-neg",
                    )}
                  >
                    {fmt.money(x.utilidad)}
                  </td>
                  <td className={cn(td, "text-right")}>
                    {fmt.money(x.retiro)}
                  </td>
                  <td className={cn(td, "text-right")}>
                    {fmt.money(x.capital)}
                  </td>
                  <td className={cn(td, "text-right")}>
                    {fmt.money(x.retirado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {toast.node}
    </div>
  );
}

function Sensitivity({ p }: { p: SimInput }) {
  const { S, fmt } = useCopiloto();
  const rows = sensitivity(p);
  const big = 1000000;
  const compact = (v: number) =>
    S.cur === "COP" && Math.abs(v) >= 100000
      ? `${v < 0 ? "−" : ""}$ ${(Math.abs(v) / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} M`
      : fmt.money(v);
  const tone = (v: number) => (v <= 0 ? "r" : v < big ? "a" : "g");
  const SOFT = {
    r: "bg-neg-soft",
    a: "bg-warn-soft",
    g: "bg-pos-soft",
  } as const;
  return (
    <section aria-labelledby="se-t" className={card}>
      <h3 id="se-t" className="mb-3 text-lg font-semibold text-ink">
        Sensibilidad · utilidad mensual según CPA y % de entrega
      </h3>
      <div
        tabIndex={0}
        role="region"
        aria-label="Tabla con desplazamiento"
        className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus"
      >
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr>
              <th scope="col" className={cn(th, "text-left")}>
                CPA \ entrega
              </th>
              {SENS_ENTREGA.map((e) => (
                <th key={e} scope="col" className={cn(th, "text-right")}>
                  {e}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.cpa}
                className={cn(row.base && "bg-surface-2")}
                aria-current={row.base ? "true" : undefined}
              >
                <th scope="row" className={cn(td, "text-left font-normal")}>
                  {fmt.money(row.cpa)}
                </th>
                {row.vals.map((v, i) => {
                  const t = tone(v);
                  const Icon = TONE_ICON[t];
                  return (
                    <td key={i} className="border-b border-border p-1">
                      <span
                        className={cn(
                          "flex items-center justify-end gap-1 rounded-sm px-2 py-1.5 tabular",
                          SOFT[t],
                        )}
                      >
                        <Icon
                          aria-hidden
                          className={cn("size-3", TONE_TEXT[t])}
                        />
                        <span aria-hidden className="text-ink">
                          {compact(v)}
                        </span>
                        <span className="sr-only">{fmt.money(v)}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>Utilidad mensual promedio.</span>
        <span className="inline-flex items-center gap-1">
          <TONE_ICON.r aria-hidden className="size-3 text-neg" /> pierdes
        </span>
        <span className="inline-flex items-center gap-1">
          <TONE_ICON.a aria-hidden className="size-3 text-warn" /> menos de{" "}
          {fmt.money(big)}
        </span>
        <span className="inline-flex items-center gap-1">
          <TONE_ICON.g aria-hidden className="size-3 text-pos" />{" "}
          {fmt.money(big)} o más
        </span>
        <span>Fila resaltada: tu CPA actual.</span>
      </p>
    </section>
  );
}

/** Capital en el negocio, capital + retirado y el mismo dinero en CDT (drawChart, L1113–1118). */
function GrowthChart({
  r,
  p,
  money,
}: {
  r: SimResult;
  p: SimInput;
  money: (n: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(280, Math.round(e!.contentRect.width))),
    );
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const H = 290,
    pd = { l: 84, r: 12, t: 12, b: 28 };
  const pts = growthPoints(r, p);
  const mx = Math.max(1, pts[pts.length - 1]!.m),
    my = Math.max(...pts.map((q) => Math.max(q.t, q.c, q.d))) * 1.06,
    mn = Math.min(0, ...pts.map((q) => q.c));
  const X = (m: number) => pd.l + (m / mx) * (W - pd.l - pd.r),
    Y = (v: number) =>
      H - pd.b - ((v - mn) / (my - mn || 1)) * (H - pd.t - pd.b);
  const every = Math.max(
    1,
    Math.ceil(Math.ceil(mx) / Math.max(1, Math.floor((W - pd.l) / 48))),
  );
  const series: [
    keyof (typeof pts)[0],
    string,
    string,
    string | undefined,
    number,
  ][] = [
    ["t", "Capital + retirado", "var(--chart-1)", undefined, 3],
    ["c", "Capital en el negocio", "var(--chart-2)", "6 5", 2.5],
    ["d", "Mismo dinero en CDT", "var(--chart-axis)", "2 4", 2],
  ];
  const last = pts[pts.length - 1]!;
  return (
    <figure className="min-w-0">
      <ul
        aria-label="Leyenda"
        className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2"
      >
        {series.map(([k, l, c, d]) => (
          <li key={k} className="flex items-center gap-1.5">
            <svg aria-hidden width="18" height="6">
              <line
                x1="0"
                y1="3"
                x2="18"
                y2="3"
                stroke={c}
                strokeWidth="2.5"
                strokeDasharray={d}
              />
            </svg>
            {l}
          </li>
        ))}
        {r.testeo > 0 && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-1 bg-neg" /> Fin de
            la fase de testeo
          </li>
        )}
      </ul>
      <div
        ref={ref}
        className="w-full min-w-0 overflow-hidden"
        style={{ minHeight: H }}
      >
        {W > 0 && (
          <svg
            width={W}
            height={H}
            role="img"
            aria-label={`Crecimiento del capital. Al final: capital + retirado ${money(last.t)}, capital en el negocio ${money(last.c)}, mismo dinero en CDT ${money(last.d)}.`}
          >
            {[0, 1, 2, 3, 4].map((i) => {
              const v = mn + ((my - mn) * i) / 4;
              return (
                <g key={i}>
                  <line
                    x1={pd.l}
                    x2={W - pd.r}
                    y1={Y(v)}
                    y2={Y(v)}
                    stroke="var(--chart-grid)"
                  />
                  <text
                    x={pd.l - 8}
                    y={Y(v) + 4}
                    fontSize="11"
                    textAnchor="end"
                    fill="var(--muted)"
                    className="tabular"
                  >
                    {money(v)}
                  </text>
                </g>
              );
            })}
            {Array.from({ length: Math.ceil(mx) + 1 }, (_, m) =>
              m % every === 0 ? (
                <text
                  key={m}
                  x={X(m)}
                  y={H - 8}
                  fontSize="11"
                  textAnchor={
                    m === 0 ? "start" : m >= Math.ceil(mx) ? "end" : "middle"
                  }
                  fill="var(--muted)"
                >
                  mes {m}
                </text>
              ) : null,
            )}
            {r.testeo > 0 && (
              <line
                x1={X(0)}
                x2={X(0)}
                y1={Y(p.cap)}
                y2={Y(p.cap - r.testeo)}
                stroke="var(--neg)"
                strokeWidth={5}
              />
            )}
            {[...series].reverse().map(([k, , c, d, w]) => (
              <polyline
                key={k}
                fill="none"
                stroke={c}
                strokeWidth={w}
                strokeDasharray={d}
                strokeLinejoin="round"
                points={pts.map((q) => `${X(q.m)},${Y(q[k])}`).join(" ")}
              />
            ))}
          </svg>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        {r.testeo > 0
          ? `La fase de testeo (${money(r.testeo)}) se descuenta al inicio. `
          : ""}
        Los valores por ciclo están en «Detalle por ciclo».
      </p>
    </figure>
  );
}
