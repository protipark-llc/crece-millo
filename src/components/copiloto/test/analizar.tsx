"use client";

import { Mentor } from "../mentor";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  Eraser,
  Hourglass,
  Info,
  OctagonX,
  Save,
  TrendingUp,
  Wrench,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { E, type Tone } from "@/lib/copiloto/engine";
import { activeProduct } from "@/lib/copiloto/logic";
import { DEF_FORMS } from "@/lib/copiloto/state";
import { CANALES, num } from "@/lib/copiloto/productos";
import { todayLocal } from "@/lib/copiloto/today";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import {
  Kpi,
  LabeledField,
  TONE_TEXT,
  TONE_SOFT,
  ToneAlert,
  fieldClass,
  useToast,
  MobileSheet,
  NumInput,
} from "../ui";

/** Campos del test (TF, L1058). El original no incluye «Otro» en el canal de este formulario. */
const TEST_CANALES = CANALES.filter((c) => c !== "Otro");
const TEST_STEP: Record<string, number> = {
  dias: 1,
  ads: 10000,
  imp: 100,
  clics: 1,
  ped: 1,
  conf: 1,
  ent: 1,
  aov: 1000,
  meta: 1,
};
type TF = typeof DEF_FORMS.testForm;

const RING: Record<Tone, string> = {
  g: "border-pos",
  a: "border-warn",
  r: "border-neg",
  b: "border-info",
};
const SOLID: Record<Tone, string> = {
  g: "bg-pos",
  a: "bg-warn",
  r: "bg-neg",
  b: "bg-info",
};

function verdictIcon(label: string) {
  if (/Escalar/.test(label)) return TrendingUp;
  if (/optimizar|Optimizar/.test(label)) return Wrench;
  if (/matar/.test(label)) return OctagonX;
  if (/Seguir/.test(label)) return Hourglass;
  return Info;
}

/** Entrada del motor desde el formulario (testInput, L1061). */
export function testInput(f: Record<string, unknown>) {
  const opt = (v: unknown) => (v === "" || v == null ? null : num(v));
  return {
    ads: num(f.ads),
    imp: num(f.imp),
    clics: num(f.clics),
    ped: num(f.ped),
    conf: opt(f.conf),
    ent: opt(f.ent),
    aov: num(f.aov),
  };
}

/** Analizar test (renderTest, L1062–1074). */
export function AnalizarTest() {
  const { S, fmt, setSettings, addTest, updateProduct } = useCopiloto();
  const toast = useToast();
  const p = activeProduct(S);
  const f = S.testForm as TF & Record<string, unknown>;
  const c = E.test(testInput(f), p);
  const meta = num(f.meta);
  const v = E.verdict(c, meta, S.risk, p);
  const R = E.rules(S.risk);
  const Icon = verdictIcon(v.label);
  const set = (k: keyof TF, val: string) =>
    setSettings({ testForm: { ...f, [k]: val } });

  const field = (
    k: keyof TF,
    label: string,
    opts: { type?: string; hint?: string; className?: string } = {},
  ) => (
    <LabeledField
      key={k}
      label={label}
      hint={opts.hint}
      className={opts.className}
    >
      {(id) =>
        opts.type ? (
          <input
            id={id}
            type={opts.type}
            value={String(f[k] ?? "")}
            onChange={(e) => set(k, e.target.value)}
            className={fieldClass}
          />
        ) : (
          <NumInput
            id={id}
            min={0}
            step={TEST_STEP[k] ?? 1}
            suffix={k === "meta" ? "%" : undefined}
            allowEmpty
            value={f[k] as string | number}
            onChange={(n) => set(k, n === "" ? "" : String(n))}
          />
        )
      }
    </LabeledField>
  );

  const save = () => {
    if (!(c.ads > 0)) return;
    const fe = String(f.fecha || "") || todayLocal();
    addTest({
      id: `t${Date.now()}`,
      ts: Date.parse(`${fe}T12:00:00`) || Date.now(),
      risk: S.risk,
      productId: p.id,
      producto: p.nombre,
      form: { ...f, fecha: fe },
      c: c as unknown as Record<string, unknown>,
      verdict: v.label,
      meta,
    });
    if (/Idea|Investigando|Validado/.test(p.etapa))
      updateProduct(p.id, { etapa: "En test" });
    toast.show("Test guardado en la bitácora y en el producto");
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-1">
        <section
          aria-labelledby="vd-t"
          aria-live="polite"
          className={cn(
            "flex items-start gap-4 rounded-lg border-2 p-5",
            RING[v.tone],
            TONE_SOFT[v.tone],
          )}
        >
          <span
            aria-hidden
            className={cn(
              "hidden size-14 shrink-0 items-center justify-center rounded-lg text-white sm:flex",
              SOLID[v.tone],
            )}
          >
            <Icon className="size-7" />
          </span>
          <div className="min-w-0">
            <p className="t-overline text-muted">
              Veredicto · riesgo {S.risk}/10 · {p.nombre}
            </p>
            <h2
              id="vd-t"
              className={cn(
                "mt-1 font-title text-4xl leading-tight font-medium sm:text-5xl",
                TONE_TEXT[v.tone],
              )}
            >
              {v.label}
            </h2>
            <p className="mt-1 text-sm text-ink">{v.why}</p>
          </div>
        </section>

        {c.ped > 0 && c.cpa > c.cpaMax && (
          <ToneAlert tone="r">
            Tu CPA real ({fmt.money(c.cpa)}) supera lo que deja cada pedido (
            {fmt.money(c.cpaMax)}). Cada pedido te cuesta{" "}
            {fmt.money(c.cpa - c.cpaMax)}.
          </ToneAlert>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi
            t="Utilidad neta"
            v={fmt.money(c.neta)}
            s="después de ads y devoluciones"
            tone={c.neta >= 0 ? "g" : "r"}
          />
          <Kpi
            t="Rentabilidad"
            v={fmt.pct(c.rent / 100)}
            s={`meta ${meta}%`}
            tone={c.rent >= meta ? "g" : c.rent > 0 ? "a" : "r"}
          />
          <Kpi
            t="ROAS"
            v={fmt.x(c.roas)}
            s={`equilibrio ${fmt.x(c.roasEq)}`}
            tone={c.roas >= c.roasEq ? "g" : "r"}
          />
          <Kpi
            t="CPA real"
            v={fmt.money(c.cpa)}
            s={`máximo ${fmt.money(c.cpaMax)}`}
            tone={c.cpa <= c.cpaMax ? "g" : "r"}
          />
          <Kpi
            t="% de entrega"
            v={fmt.pct(c.tasaEntrega)}
            s={`${Math.round(c.ent)} entregados · ${Math.round(c.dev)} devueltos`}
            tone={
              c.tasaEntrega >= 0.75 ? "g" : c.tasaEntrega >= 0.65 ? "a" : "r"
            }
          />
          <Kpi
            t="CTR"
            v={c.ctr === null ? "—" : fmt.pct(c.ctr)}
            s={
              c.cpc === null
                ? "registra impresiones y clics"
                : `CPC ${fmt.money(c.cpc)}`
            }
          />
          <Kpi
            t="Conversión"
            v={c.cvr === null ? "—" : fmt.pct(c.cvr)}
            s="pedidos / clics"
          />
          <Kpi
            t="Recaudo"
            v={fmt.money(c.ingresos)}
            s={`AOV ${fmt.money(c.aov)}`}
          />
          <Kpi t="Margen de contribución" v={fmt.pct(c.cm)} s="antes de ads" />
          <Kpi
            t="Pedidos para decidir"
            v={`${c.ped}/${R.pedidosDecidir}`}
            s={
              c.ped >= R.pedidosDecidir
                ? "muestra suficiente"
                : "muestra pequeña"
            }
            tone={c.ped >= R.pedidosDecidir ? "g" : "a"}
          />
        </div>
      </div>

      <MobileSheet
        className="lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start"
        title="Datos del test"
        summary={`${String(f.nombre || "Sin nombre")} · ${String(f.canal ?? "")} · ${String(f.dias ?? "")} días · ${fmt.money(num(f.ads))}`}
      >
        <form
          aria-labelledby="tf-t"
          className="h-fit space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h2 id="tf-t" className="text-lg font-semibold text-ink">
            Datos del test
          </h2>
          <LabeledField label="Nombre del test">
            {(id) => (
              <input
                id={id}
                value={String(f.nombre ?? "")}
                placeholder="Ej: Ojos · TikTok · semana 1"
                onChange={(e) => set("nombre", e.target.value)}
                className={fieldClass}
              />
            )}
          </LabeledField>
          <div className="grid grid-cols-2 gap-3">
            <LabeledField label="Canal">
              {(id) => (
                <select
                  id={id}
                  value={String(f.canal ?? "")}
                  onChange={(e) => set("canal", e.target.value)}
                  className={fieldClass}
                >
                  {TEST_CANALES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              )}
            </LabeledField>
            {field("fecha", "Fecha", { type: "date" })}
            {field("dias", "Días del test")}
            {field("ads", "Gasto en ads")}
            {field("imp", "Impresiones")}
            {field("clics", "Clics")}
            {field("ped", "Pedidos generados")}
            {field("conf", "Pedidos confirmados")}
          </div>
          {field("ent", "Pedidos entregados", {
            hint: "Si aún no sabes cuántos se entregaron, deja vacío y se usa el % esperado del producto.",
          })}
          <div className="grid grid-cols-2 gap-3">
            {field("aov", "Ticket promedio (AOV)", {
              hint: "Vacío = precio del producto activo.",
            })}
            {field("meta", "Meta de rentabilidad %")}
          </div>
          <p className="text-xs text-muted">
            Costo, flete y comisión se toman del producto activo. Este test
            también queda en el historial del producto (Productos › Resultados
            de venta).
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={!(c.ads > 0)}
              className={buttonClass("primary", "md", "disabled:opacity-50")}
            >
              <Save aria-hidden className="size-4" /> Guardar test
            </button>
            <button
              type="button"
              className={buttonClass("ghost", "md")}
              onClick={() =>
                setSettings({ testForm: { ...DEF_FORMS.testForm } })
              }
            >
              <Eraser aria-hidden className="size-4" /> Limpiar
            </button>
          </div>
        </form>
      </MobileSheet>

      <div className="min-w-0 space-y-4 lg:col-start-2">
        <Mentor
          action="test"
          label="Pedir análisis al mentor"
          intro="El mentor explica el resultado en lenguaje sencillo y propone los siguientes pasos con tus números."
          extra={() => ({ testForm: f })}
        />

        <section
          aria-labelledby="cd-t"
          className="rounded-lg border border-border bg-surface p-4 sm:p-5"
        >
          <h3 id="cd-t" className="t-overline text-muted">
            Cómo decide el Co-Piloto
          </h3>
          <ul className="mt-3 space-y-2.5 text-sm text-ink">
            <Rule
              icon={CheckCircle2}
              tone="g"
              title="Escalar / Escalar con cautela:"
            >
              gana sobre tu meta y con el ROAS por encima del equilibrio,
              ajustados a tu riesgo; con menos de {R.pedidosDecidir} pedidos,
              con cautela.
            </Rule>
            <Rule
              icon={AlertTriangle}
              tone="a"
              title="Mantener y optimizar / Optimizar:"
            >
              gana pero no llega a tu meta, o pierde poco cerca del equilibrio:
              mejora creativo, oferta o entrega antes de subir.
            </Rule>
            <Rule icon={XCircle} tone="r" title="Pausar / matar:">
              pierde lejos del equilibrio, o gastaste{" "}
              {R.killMult.toFixed(1).replace(".", ",")}× el CPA máximo sin
              ventas.
            </Rule>
            <Rule icon={Info} tone="b" title="Seguir midiendo / Faltan datos:">
              aún no hay pedidos, o faltan gasto y pedidos.
            </Rule>
          </ul>
        </section>
      </div>
      {toast.node}
    </div>
  );
}

function Rule({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof Info;
  tone: Tone;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-2">
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT[tone])}
      />
      <p>
        <strong className="font-semibold">{title}</strong> {children}
      </p>
    </li>
  );
}
