"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  RotateCcw,
  Tag,
  Target,
  XCircle,
} from "lucide-react";
import {
  E,
  type PriceEval,
  type PriceQ,
  type Pricing,
} from "@/lib/copiloto/engine";
import { activeProduct, pcQ } from "@/lib/copiloto/logic";
import {
  PCF,
  PCH,
  PC_MONEY,
  PC_TO_FICHA,
  breakdown,
  health,
  priceSims,
  priceTable,
  reinvOf,
  sliderMaxes,
} from "@/lib/copiloto/precio";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import { ToneBadge } from "../tone";
import { Kpi, TONE_ICON, TONE_TEXT, ToneAlert, useToast } from "../ui";

type Q = PriceQ & { P: number };
const card = "rounded-lg border border-border bg-surface p-4 sm:p-5";
const th =
  "border-b border-border px-3 py-2 text-xs font-medium whitespace-nowrap text-muted";
const td = "border-b border-border px-3 py-2 whitespace-nowrap tabular";

/** Precio y margen (pd-precio, L268–287; renderPricing, L800–848). */
export function Precio() {
  const { S, fmt, updateProduct, setProductState } = useCopiloto();
  const toast = useToast();
  const p = activeProduct(S);
  const q = pcQ(S, p) as Q;
  // Los máximos de los controles se fijan al construir el formulario (como el original), no en cada movimiento.
  const [build, setBuild] = useState(0);
  const maxes = useMemo(() => sliderMaxes(q), [p.id, build]);
  const R = E.pricing(q);
  const ev = E.priceEval(q, q.P);
  const rec = R.rec ? E.priceEval(q, R.rec) : null;
  const reinv = reinvOf(S);
  const comp = (p.precioComp as number) || 0;

  const setQ = (k: string, v: number) =>
    setProductState(p.id, "pc", { ...q, [k]: v });
  const applyPrice = (which: "rec" | "eval") => {
    const P = which === "rec" ? R.rec : q.P;
    if (!P) return;
    updateProduct(p.id, { precio: P });
    setProductState(p.id, "pc", { ...q, P });
    setBuild((b) => b + 1);
    toast.show(`Precio de venta: ${fmt.money(P)}`);
  };

  const resetQ = () => {
    setProductState(p.id, "pc", null);
    setBuild((b) => b + 1);
  };
  const saveToFicha = () => {
    const patch: Record<string, number> = {};
    for (const k of PC_TO_FICHA) patch[k] = Number(q[k]) || 0;
    updateProduct(p.id, patch);
    toast.show("Supuestos guardados en la ficha");
  };
  const evTone = ev.mn >= q.margenMin / 100 ? "g" : ev.pi > 0 ? "a" : "r";

  return (
    <div className="space-y-4">
      <ToneAlert tone="b">
        Mueve los controles y mira cómo cambia el rango de precios.{" "}
        <strong>
          Subir el precio deja más por pedido, pero encarece el CPA
        </strong>{" "}
        porque menos gente compra. El mejor precio es el que deja más utilidad
        total al mes <strong>sin bajar del margen saludable</strong>, porque esa
        utilidad es la que reinviertes para crecer de forma compuesta.
      </ToneAlert>

      <section
        aria-labelledby="rec-t"
        className={cn(
          card,
          "grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]",
        )}
      >
        <div className="min-w-0">
          <h3 id="rec-t" className="t-overline text-muted">
            ¿Cuánto cobro? · Precio recomendado
          </h3>
          <p className="mt-1 font-title text-5xl leading-tight font-medium break-words text-ink tabular sm:text-6xl">
            {R.rec ? fmt.money(R.rec) : "—"}
          </p>
          <p className="mt-2">
            {R.range ? (
              <ToneBadge tone="g">
                Rango saludable {fmt.money(R.range[0])} –{" "}
                {fmt.money(R.range[1])}
              </ToneBadge>
            ) : (
              <ToneBadge tone="r">No hay rango saludable</ToneBadge>
            )}
          </p>
          {rec && (
            <p className="mt-3 text-sm text-ink-2">
              Margen neto {fmt.pct(rec.mn)} · {fmt.money(rec.mes)} de utilidad
              al mes con {fmt.money(q.presupuesto)} de pauta.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border">
          <MiniStat
            t="Precio de equilibrio"
            v={R.be ? fmt.money(R.be) : "—"}
            s="por debajo pierdes dinero"
            tone="r"
          />
          <MiniStat
            t="Mínimo saludable"
            v={R.pMin ? fmt.money(R.pMin) : "—"}
            s={`margen neto ≥ ${q.margenMin}%`}
            tone="a"
            className="border-l"
          />
          <MiniStat
            t="Para margen objetivo"
            v={R.pObj ? fmt.money(R.pObj) : "—"}
            s={`margen neto ${q.margenObj}%`}
            className="border-t"
          />
          <MiniStat
            t="Utilidad al mes (recomendado)"
            v={rec ? fmt.money(rec.mes) : "—"}
            s={`con ${fmt.money(q.presupuesto)} de pauta`}
            tone={rec && rec.mes > 0 ? "g" : null}
            className="border-t border-l"
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          t="Precio evaluado"
          v={fmt.money(q.P)}
          s={`margen neto ${fmt.pct(ev.mn)} · ${fmt.x(ev.markup)} el costo`}
          tone={evTone}
        />
        <Kpi
          t="Utilidad por pedido"
          v={fmt.money(ev.pi)}
          s="por pedido generado, después de todo"
          tone={ev.pi > 0 ? "g" : "r"}
        />
        <Kpi
          t="Utilidad mensual"
          v={fmt.money(ev.mes)}
          s={`${Math.round(ev.pedidos)} pedidos · CPA ${fmt.money(ev.A)}`}
          tone={ev.mes > 0 ? "g" : "r"}
        />
        <Kpi
          t="Retorno de la pauta"
          v={ev.mes > 0 ? fmt.pct(ev.mes / q.presupuesto) : "—"}
          s="utilidad neta ÷ pauta, al mes"
          tone={ev.mes > 0 ? "g" : "r"}
        />
      </div>

      <div className="space-y-2">
        {!R.range ? (
          <ToneAlert
            tone="r"
            title={`Con estos supuestos ningún precio deja un margen neto de ${q.margenMin}%.`}
          >
            Baja el costo, sube el % de entrega o de confirmación, agrega un
            combo o revisa el CPA.
          </ToneAlert>
        ) : (
          <ToneAlert
            tone="g"
            title={`Rango saludable: ${fmt.money(R.range[0])} – ${fmt.money(R.range[1])}. Precio recomendado: ${fmt.money(R.rec ?? 0)}`}
          >
            {rec
              ? `(margen neto ${fmt.pct(rec.mn)}, ${fmt.money(rec.mes)} de utilidad al mes con ${fmt.money(q.presupuesto)} de pauta)`
              : ""}
            . Reinvirtiendo el {reinv}% de esa utilidad, la pauta podría crecer
            cerca de{" "}
            <strong>
              {fmt.pct(rec ? (rec.mes * reinv) / 100 / q.presupuesto : 0)} por
              mes
            </strong>{" "}
            antes de que el CPA se encarezca.
          </ToneAlert>
        )}
        {R.rec && comp > 0 && R.rec > comp * 1.15 && (
          <ToneAlert tone="a">
            El precio recomendado queda por encima del de la competencia (
            {fmt.money(comp)}). Necesitas una oferta clara (combo, garantía,
            envío) o subir el techo percibido con marca.
          </ToneAlert>
        )}
        {ev.P < (R.be || 0) && (
          <ToneAlert tone="r">
            El precio evaluado está por debajo del equilibrio: cada pedido te
            hace perder {fmt.money(-ev.pi)}.
          </ToneAlert>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <form
          aria-label="Supuestos de precio"
          className="min-w-0 space-y-2"
          onSubmit={(e) => e.preventDefault()}
        >
          {PCF.map(([group, fs], gi) => (
            <details
              key={group}
              open={gi === 0}
              className="group rounded-lg border border-border bg-surface"
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-ink">
                <span>
                  {group}{" "}
                  <span className="font-normal text-muted">
                    · {fs.length} ajustes
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className="size-4 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="space-y-4 border-t border-border px-4 py-4">
                {fs.map(([k, label, min, , step]) => (
                  <Slider
                    key={`${p.id}-${k}`}
                    label={label}
                    hint={PCH[k]}
                    value={Number(q[k]) || 0}
                    min={min}
                    max={Math.max(maxes[k] ?? min, Number(q[k]) || 0)}
                    step={step}
                    display={
                      PC_MONEY.has(k)
                        ? fmt.money(Number(q[k]) || 0)
                        : String(q[k] ?? "").replace(".", ",")
                    }
                    onChange={(v) => setQ(k, v)}
                  />
                ))}
              </div>
            </details>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className={buttonClass("primary", "md")}
              onClick={() => applyPrice("rec")}
              disabled={!R.rec}
            >
              <Target aria-hidden className="size-4" /> Aplicar precio
              recomendado
            </button>
            <button
              type="button"
              className={buttonClass("secondary", "md")}
              onClick={() => applyPrice("eval")}
            >
              <Tag aria-hidden className="size-4" /> Aplicar precio evaluado
            </button>
            <button
              type="button"
              className={buttonClass("ghost", "md")}
              onClick={saveToFicha}
            >
              <ClipboardCheck aria-hidden className="size-4" /> Guardar
              supuestos en la ficha
            </button>
            <button
              type="button"
              className={buttonClass("ghost", "md")}
              onClick={resetQ}
            >
              <RotateCcw aria-hidden className="size-4" /> Restablecer
            </button>
          </div>
        </form>

        <div className="min-w-0 space-y-4">
          <section aria-labelledby="pch-t" className={card}>
            <h3 id="pch-t" className="mb-3 text-base font-semibold text-ink">
              Precio vs. utilidad mensual y margen neto
            </h3>
            <PriceChart q={q} R={R} ev={ev} money={fmt.money} />
          </section>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <Breakdown ev={ev} fmt={fmt} />
            <section aria-labelledby="hl-t" className={card}>
              <HealthList items={health(q, ev, p, reinv, fmt)} />
            </section>
          </div>
        </div>
      </div>

      <SimTable q={q} R={R} />
      <PriceTable q={q} R={R} />
      {toast.node}
    </div>
  );
}

function MiniStat({
  t,
  v,
  s,
  tone,
  className,
}: {
  t: string;
  v: string;
  s: string;
  tone?: "g" | "a" | "r" | null;
  className?: string;
}) {
  const Icon = tone ? TONE_ICON[tone] : null;
  return (
    <div className={cn("min-w-0 border-border p-3 sm:p-4", className)}>
      <p className="text-xs text-muted">{t}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold break-words tabular sm:text-xl",
          tone === "g" ? "text-pos" : "text-ink",
        )}
      >
        {v}
      </p>
      <p
        className={cn(
          "mt-0.5 flex items-start gap-1 text-xs",
          tone ? TONE_TEXT[tone] : "text-muted",
        )}
      >
        {Icon && <Icon aria-hidden className="mt-px size-3.5 shrink-0" />}
        {s}
      </p>
    </div>
  );
}

/** Número + control deslizante sincronizados (div.sl del original). */
function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="min-w-0 text-sm font-medium text-ink">
          {label}
        </label>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={text}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            setText(String(value));
          }}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value.replace(",", "."));
            if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
          }}
          className="h-10 w-28 shrink-0 rounded-md border border-control-border bg-surface px-2 text-right text-sm text-ink tabular focus:border-focus focus:ring-2 focus:ring-focus/30 focus:outline-none"
        />
      </div>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={display}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-6 w-full accent-[var(--brand)]"
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function HealthList({ items }: { items: [boolean, string][] }) {
  const ok = items.filter((x) => x[0]).length;
  return (
    <>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 id="hl-t" className="text-base font-semibold text-ink">
          Salud del precio
        </h3>
        <span
          className={cn(
            "text-sm font-semibold tabular",
            ok >= 5 ? "text-pos" : ok >= 3 ? "text-warn" : "text-neg",
          )}
        >
          {ok}/6<span className="sr-only"> en verde</span>
        </span>
      </div>
      <ul className="space-y-2">
        {items.map(([good, t]) => (
          <li key={t} className="flex gap-2 text-sm text-ink">
            {good ? (
              <CheckCircle2
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-pos"
              />
            ) : (
              <XCircle
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-neg"
              />
            )}
            <span>
              <span className="sr-only">
                {good ? "Cumple: " : "No cumple: "}
              </span>
              {t}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        {ok}/6 en verde. Con 5 o más el precio está listo para escalar.
      </p>
    </>
  );
}

function Breakdown({
  ev,
  fmt,
}: {
  ev: PriceEval;
  fmt: ReturnType<typeof useCopiloto>["fmt"];
}) {
  const items = breakdown(ev);
  const tot = ev.aov;
  return (
    <section aria-labelledby="bk-t" className={card}>
      <h3 id="bk-t" className="text-base font-semibold text-ink">
        ¿A dónde va cada peso?
      </h3>
      <p className="mb-3 text-xs text-muted">
        Precio evaluado, por pedido entregado · ticket {fmt.money(tot)}
      </p>
      <ul className="space-y-2.5">
        {items.map(([n, v, c]) => {
          const last = n === "Utilidad";
          return (
            <li key={n} className="text-sm">
              <div
                className={cn(
                  "flex items-baseline justify-between gap-2",
                  last ? "font-semibold text-pos" : "text-ink",
                )}
              >
                <span>{n}</span>
                <span className={cn("tabular", v < 0 && "text-neg")}>
                  {fmt.money(v)} · {fmt.pct(v / tot)}
                </span>
              </div>
              <div
                aria-hidden
                className="mt-1 h-1.5 w-full rounded-full bg-surface-2"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, (v / tot) * 100))}%`,
                    background: c,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SimTable({ q, R }: { q: Q; R: Pricing }) {
  const { S, fmt } = useCopiloto();
  const p = activeProduct(S);
  const f = S.simForm as Record<string, number>;
  const { rows, best } = priceSims(S, p, q, R);
  return (
    <section aria-labelledby="sim-t" className={card}>
      <h3 id="sim-t" className="text-base font-semibold text-ink">
        Estrategia de inversión: cómo crece el capital con cada precio
      </h3>
      <p className="mt-1 mb-3 text-xs text-muted">
        Usa el capital, la reinversión, el ciclo y el horizonte de la pestaña 6
        · Crecer, y el CPA que corresponde a cada precio. Sin fase de testeo,
        porque es el mismo producto ya validado.
      </p>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="text-left">
              {[
                "Precio",
                "Valor",
                "Margen neto",
                "Utilidad/pedido",
                "CPA",
                "Utilidad mensual*",
                `Patrimonio en ${f.meses} meses`,
                "Tasa mensual",
                "Pesimista",
              ].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(th, i > 0 && i < 8 && "text-right")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr
                key={x.n}
                className={cn(x === best && "bg-pos-soft")}
                aria-current={x === best ? "true" : undefined}
              >
                <th scope="row" className={cn(td, "text-left font-semibold")}>
                  {x.n}
                </th>
                <td className={cn(td, "text-right")}>{fmt.money(x.P)}</td>
                <td
                  className={cn(
                    td,
                    "text-right",
                    x.e.mn >= q.margenMin / 100
                      ? "text-pos"
                      : x.e.pi > 0
                        ? "text-warn"
                        : "text-neg",
                  )}
                >
                  {fmt.pct(x.e.mn)}
                </td>
                <td className={cn(td, "text-right")}>{fmt.money(x.e.pi)}</td>
                <td className={cn(td, "text-right")}>{fmt.money(x.e.A)}</td>
                <td className={cn(td, "text-right")}>{fmt.money(x.e.mes)}</td>
                <td className={cn(td, "text-right")}>
                  {fmt.money(x.r.patrimonio)}
                </td>
                <td className={cn(td, "text-right")}>{fmt.pct(x.r.tm)}</td>
                <td className={td}>
                  {x.pe.quiebra !== null ? (
                    <ToneBadge tone="r">
                      se agota m{x.pe.quiebra.toFixed(1).replace(".", ",")}
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
        * Con {fmt.money(q.presupuesto)} de pauta al mes. Capital{" "}
        {fmt.money(f.cap!)}, {f.asig}% a pauta por ciclo, {f.reinv}% de
        reinversión, ciclo de {f.ciclo} días. Pesimista: entrega −10 pp y CPA
        +25%.
      </p>
      {best && (
        <ToneAlert tone="b" className="mt-3">
          Con estos supuestos,{" "}
          <strong>
            {best.n.toLowerCase()} ({fmt.money(best.P)})
          </strong>{" "}
          es el que más hace crecer el capital: {fmt.money(best.r.patrimonio)}{" "}
          en {f.meses} meses
          {best.pe.quiebra !== null
            ? ", pero en el escenario pesimista se agota: considera un precio con más margen."
            : " y aguanta el escenario pesimista."}
        </ToneAlert>
      )}
    </section>
  );
}

function PriceTable({ q, R }: { q: Q; R: Pricing }) {
  const { fmt } = useCopiloto();
  const rows = priceTable(q, R);
  return (
    <section aria-labelledby="pt-t" className={card}>
      <h3 id="pt-t" className="mb-3 text-base font-semibold text-ink">
        Tabla de precios
      </h3>
      <div className="relative max-h-[480px] overflow-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-left">
              {[
                "Precio",
                "× costo",
                "CPA",
                "Pedidos/mes",
                "Utilidad/pedido",
                "Margen contrib.",
                "Margen neto",
                "ROAS",
                "Utilidad mensual",
              ].map((h) => (
                <th key={h} scope="col" className={cn(th, "text-right")}>
                  {h}
                </th>
              ))}
              <th scope="col" className={th}>
                <span className="sr-only">Marca</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.P} className={cn(g.P === R.rec && "bg-pos-soft")}>
                <th scope="row" className={cn(td, "text-right font-normal")}>
                  {fmt.money(g.P)}
                </th>
                <td className={cn(td, "text-right")}>
                  {g.markup.toFixed(1).replace(".", ",")}×
                </td>
                <td className={cn(td, "text-right")}>{fmt.money(g.A)}</td>
                <td className={cn(td, "text-right")}>
                  {Math.round(g.pedidos)}
                </td>
                <td
                  className={cn(
                    td,
                    "text-right",
                    g.pi >= 0 ? "text-pos" : "text-neg",
                  )}
                >
                  {fmt.money(g.pi)}
                </td>
                <td className={cn(td, "text-right")}>{fmt.pct(g.mc)}</td>
                <td
                  className={cn(
                    td,
                    "text-right",
                    g.mn >= q.margenMin / 100
                      ? "text-pos"
                      : g.mn >= 0
                        ? "text-warn"
                        : "text-neg",
                  )}
                >
                  {fmt.pct(g.mn)}
                </td>
                <td className={cn(td, "text-right")}>{fmt.x(g.roas)}</td>
                <td
                  className={cn(
                    td,
                    "text-right",
                    g.mes >= 0 ? "text-pos" : "text-neg",
                  )}
                >
                  {fmt.money(g.mes)}
                </td>
                <td className={td}>
                  {g.P === R.rec ? (
                    <ToneBadge tone="g">recomendado</ToneBadge>
                  ) : g.P === R.be ? (
                    <ToneBadge tone="r">equilibrio</ToneBadge>
                  ) : g.P === R.pMin ? (
                    <ToneBadge tone="a">mínimo sano</ToneBadge>
                  ) : g.P === R.pObj ? (
                    <ToneBadge tone="b">objetivo</ToneBadge>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Gráfica de dos ejes: utilidad mensual (izq.) y margen neto % (der.) contra el precio (L811–823). */
function PriceChart({
  q,
  R,
  ev,
  money,
}: {
  q: Q;
  R: Pricing;
  ev: PriceEval;
  money: (n: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(300, Math.round(e!.contentRect.width))),
    );
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const H = 300,
    pd = { l: 82, r: 52, t: 12, b: 28 };
  const G = R.grid;
  const ys = G.map((g) => g.mes);
  const mxY = Math.max(...ys, 1) * 1.08,
    mnY = Math.max(Math.min(...ys, 0), -Math.max(...ys, 1) * 0.6);
  const X = (P: number) =>
    pd.l + ((P - R.lo) / (R.hi - R.lo)) * (W - pd.l - pd.r);
  const Y = (v: number) =>
    H -
    pd.b -
    ((Math.max(mnY, v) - mnY) / (mxY - mnY || 1)) * (H - pd.t - pd.b);
  const mMin = -0.2,
    mMax = 0.6;
  const Y2 = (v: number) =>
    H -
    pd.b -
    ((Math.max(mMin, Math.min(mMax, v)) - mMin) / (mMax - mMin)) *
      (H - pd.t - pd.b);
  const xTicks = W < 560 ? 3 : 6;
  const legend: [string, string, string?][] = [
    ["Utilidad neta mensual (izq.)", "var(--info)"],
    ["Margen neto % (der.)", "var(--pos)", "dash"],
    ["Rango saludable", "var(--pos-soft)", "area"],
    ["Equilibrio", "var(--neg)"],
    ["Precio evaluado", "var(--ink)", "dash"],
  ];
  const desc = `Utilidad mensual al precio evaluado ${money(ev.mes)}.${R.be ? ` Equilibrio ${money(R.be)}.` : ""}${R.rec ? ` Recomendado ${money(R.rec)}.` : ""}${R.range ? ` Rango saludable ${money(R.range[0])} – ${money(R.range[1])}.` : " Sin rango saludable."} Los valores están en la tabla de precios.`;
  return (
    <figure className="min-w-0">
      <ul
        aria-label="Leyenda"
        className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2"
      >
        {legend.map(([l, c, kind]) => (
          <li key={l} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                "inline-block w-4",
                kind === "area" ? "h-2.5 border border-pos" : "h-0.5",
              )}
              style={{
                background: kind === "dash" ? undefined : c,
                borderTop: kind === "dash" ? `2px dashed ${c}` : undefined,
              }}
            />
            {l}
          </li>
        ))}
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
            aria-label={`Precio contra utilidad mensual y margen neto. ${desc}`}
          >
            {R.range && (
              <rect
                x={X(R.range[0])}
                y={pd.t}
                width={Math.max(2, X(R.range[1]) - X(R.range[0]))}
                height={H - pd.t - pd.b}
                fill="var(--pos-soft)"
              />
            )}
            {[0, 1, 2, 3, 4].map((k) => {
              const v = mnY + ((mxY - mnY) * k) / 4,
                m = mMin + ((mMax - mMin) * k) / 4;
              return (
                <g key={k}>
                  <line
                    x1={pd.l}
                    x2={W - pd.r}
                    y1={Y(v)}
                    y2={Y(v)}
                    stroke="var(--chart-grid)"
                  />
                  <text
                    x={pd.l - 6}
                    y={Y(v) + 4}
                    fontSize="10.5"
                    textAnchor="end"
                    fill="var(--muted)"
                    className="tabular"
                  >
                    {money(v)}
                  </text>
                  <text
                    x={W - pd.r + 6}
                    y={Y2(m) + 4}
                    fontSize="10.5"
                    fill="var(--pos)"
                    className="tabular"
                  >
                    {Math.round(m * 100)}%
                  </text>
                </g>
              );
            })}
            {Array.from({ length: xTicks + 1 }, (_, k) => {
              const P = R.lo + ((R.hi - R.lo) * k) / xTicks;
              return (
                <text
                  key={k}
                  x={X(P)}
                  y={H - 8}
                  fontSize="10.5"
                  textAnchor={
                    k === 0 ? "start" : k === xTicks ? "end" : "middle"
                  }
                  fill="var(--muted)"
                  className="tabular"
                >
                  {money(Math.round(P / 1000) * 1000)}
                </text>
              );
            })}
            <line
              x1={pd.l}
              x2={W - pd.r}
              y1={Y(0)}
              y2={Y(0)}
              stroke="var(--chart-axis)"
              strokeDasharray="4 4"
            />
            <polyline
              fill="none"
              stroke="var(--pos)"
              strokeWidth={2}
              strokeDasharray="6 4"
              points={G.map((g) => `${X(g.P)},${Y2(g.mn)}`).join(" ")}
            />
            <polyline
              fill="none"
              stroke="var(--info)"
              strokeWidth={3}
              points={G.map((g) => `${X(g.P)},${Y(g.mes)}`).join(" ")}
            />
            {R.be && (
              <line
                x1={X(R.be)}
                x2={X(R.be)}
                y1={pd.t}
                y2={H - pd.b}
                stroke="var(--neg)"
                strokeWidth={2}
              />
            )}
            {R.rec && (
              <g>
                <line
                  x1={X(R.rec)}
                  x2={X(R.rec)}
                  y1={pd.t}
                  y2={H - pd.b}
                  stroke="var(--pos)"
                  strokeWidth={2.5}
                />
                <text
                  x={X(R.rec) + 4}
                  y={pd.t + 12}
                  fontSize="11"
                  fontWeight="600"
                  fill="var(--pos)"
                >
                  recomendado
                </text>
              </g>
            )}
            <line
              x1={X(q.P)}
              x2={X(q.P)}
              y1={pd.t}
              y2={H - pd.b}
              stroke="var(--ink)"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
            <circle cx={X(q.P)} cy={Y(ev.mes)} r={5} fill="var(--ink)" />
          </svg>
        )}
      </div>
    </figure>
  );
}
