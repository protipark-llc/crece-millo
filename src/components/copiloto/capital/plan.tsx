"use client";

import { Mentor } from "../mentor";
import { Save, Sigma, TestTube } from "lucide-react";
import { E } from "@/lib/copiloto/engine";
import { activeProduct } from "@/lib/copiloto/logic";
import type { PlanFormT } from "@/lib/copiloto/capital";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import {
  Kpi,
  LabeledField,
  ToneAlert,
  fieldClass,
  useToast,
  MobileSheet,
  NumInput,
} from "../ui";

const card = "rounded-lg border border-border bg-surface p-4 sm:p-5";
const th =
  "border-b border-border px-3 py-2 text-xs font-medium whitespace-nowrap text-muted";
const td = "border-b border-border px-3 py-2 whitespace-nowrap tabular";

/** Planificar capital (renderPlan, L1081–1096). */
export function PlanCapital() {
  const { S, fmt, setSettings, addSaved } = useCopiloto();
  const toast = useToast();
  const f = S.planForm as PlanFormT;
  const pl = E.plan(f, S.risk);
  const u = f.unidad === "semana" ? "semana" : "mes";
  const plural = pl.N > 1 ? (u === "mes" ? "es" : "s") : "";
  const real = E.real(S.tests);
  const set = (patch: Partial<PlanFormT>) =>
    setSettings({ planForm: { ...f, ...patch } });
  const numField = (
    k: keyof PlanFormT,
    label: string,
    opts: {
      hint?: string;
      step?: number;
      min?: number;
      max?: number;
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
          onChange={(n) => set({ [k]: n === "" ? 0 : n } as Partial<PlanFormT>)}
        />
      )}
    </LabeledField>
  );

  let gap = 0;
  if (real) gap = real.roas / pl.targetROAS;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <MobileSheet
          title="Meta, recursos y caja"
          summary={`Meta ${fmt.money(f.R)} por ${u} · margen ${fmt.pct(pl.m)} · capital ${fmt.money(f.cap)}`}
        >
          <form
            aria-label="Plan de capital"
            className={cn(card, "h-fit space-y-4")}
            onSubmit={(e) => e.preventDefault()}
          >
            <h2 className="text-lg font-semibold text-ink">Meta</h2>
            <div className="grid grid-cols-2 gap-3">
              <LabeledField label="Unidad">
                {(id) => (
                  <select
                    id={id}
                    value={u}
                    onChange={(e) => set({ unidad: e.target.value })}
                    className={fieldClass}
                  >
                    <option value="mes">Mes</option>
                    <option value="semana">Semana</option>
                  </select>
                )}
              </LabeledField>
              {numField("R", "Facturación objetivo / periodo", {
                step: 100000,
                min: 0,
              })}
              <LabeledField label="Margen bruto en">
                {(id) => (
                  <select
                    id={id}
                    value={f.modo}
                    onChange={(e) => set({ modo: e.target.value })}
                    className={fieldClass}
                  >
                    <option value="pct">%</option>
                    <option value="monto">Monto</option>
                  </select>
                )}
              </LabeledField>
              {numField(
                "m",
                f.modo === "pct"
                  ? "Margen bruto %"
                  : "Utilidad bruta por periodo",
                { step: f.modo === "pct" ? 1 : 10000, min: 0 },
              )}
            </div>
            <p className="text-xs text-muted">
              ≈ margen de {fmt.pct(pl.m)} · utilidad bruta{" "}
              {fmt.money(f.R * pl.m)} por {u}. Es la contribución antes de ads
              (después de producto, flete y devoluciones).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass("secondary", "md")}
                onClick={() => {
                  const un = E.unit(activeProduct(S));
                  set({ modo: "pct", m: Math.round(un.cmRatio * 1000) / 10 });
                }}
              >
                <Sigma aria-hidden className="size-4" /> Usar margen del
                producto
              </button>
              <button
                type="button"
                className={buttonClass(
                  "secondary",
                  "md",
                  "disabled:opacity-50",
                )}
                disabled={!real}
                title={real ? undefined : "Guarda al menos un test"}
                onClick={() => {
                  if (!real) return;
                  set({ modo: "pct", m: Math.round(real.cm * 1000) / 10 });
                  toast.show(`Margen real de ${real.n} test(s) aplicado`);
                }}
              >
                <TestTube aria-hidden className="size-4" /> Usar mis tests
                reales
              </button>
            </div>
            {!real && (
              <p className="-mt-2 text-xs text-muted">
                «Usar mis tests reales» se activa cuando guardes al menos un
                test.
              </p>
            )}

            <h2 className="pt-2 text-lg font-semibold text-ink">Recursos</h2>
            <div className="grid grid-cols-2 gap-3">
              {numField("fijos", "Costos fijos / periodo", {
                step: 10000,
                min: 0,
              })}
              {numField("cap", "Capital disponible", { step: 100000, min: 0 })}
            </div>
            {numField("N", "Intervalos (1–12)", { step: 1, min: 1, max: 12 })}

            <h2 className="pt-2 text-lg font-semibold text-ink">Caja</h2>
            <div className="grid grid-cols-2 gap-3">
              {numField("ret", "Dinero en tránsito", {
                suffix: "%",
                step: 1,
                min: 0,
                hint: "Recaudo que Dropi aún no te liquida (o retenciones de pasarela).",
              })}
              {numField("ree", "Devoluciones / reembolsos", {
                suffix: "%",
                step: 1,
                min: 0,
              })}
            </div>
          </form>
        </MobileSheet>

        <div className="order-first min-w-0 space-y-4 lg:order-none">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Kpi
              t="ROAS objetivo"
              v={fmt.x(pl.targetROAS)}
              s={`equilibrio ${fmt.x(pl.be)}`}
            />
            <Kpi t="Ads a pleno" v={fmt.money(pl.full)} s={`por ${u}`} />
            <Kpi
              t="Capital a inyectar"
              v={fmt.money(pl.tot)}
              s={`en ${pl.N} ${u}${plural}`}
              tone="a"
            />
            <Kpi
              t="Utilidad neta a pleno"
              v={fmt.money(pl.fullNet)}
              s={`por ${u}`}
              tone={pl.fullNet >= 0 ? "g" : "r"}
            />
            <Kpi
              t="Acumulado"
              v={fmt.money(pl.cum)}
              s="utilidad del horizonte"
              tone={pl.cum >= 0 ? "g" : "r"}
            />
            <Kpi
              t="Autofinanciamiento"
              v={pl.self ? `${u === "mes" ? "Mes" : "Semana"} ${pl.self}` : "—"}
              s="deja de requerir inyección"
              tone="g"
            />
          </div>
          {real ? (
            <ToneAlert tone={gap >= 1 ? "g" : gap >= 0.85 ? "a" : "r"}>
              Tus {real.n} test(s) dan un ROAS real de{" "}
              <strong>{fmt.x(real.roas)}</strong> frente al objetivo de{" "}
              <strong>{fmt.x(pl.targetROAS)}</strong>.{" "}
              {gap >= 1
                ? "El plan es alcanzable con tus números."
                : "El plan exige más de lo que hoy logras: mejora creativos/oferta o baja la meta."}
            </ToneAlert>
          ) : (
            <ToneAlert tone="b">
              El ROAS objetivo es una <strong>exigencia</strong> del plan, no un
              pronóstico. Cuando guardes tests, aquí verás si tus números reales
              lo alcanzan.
            </ToneAlert>
          )}
          {pl.fullNet < 0 && (
            <ToneAlert tone="r">
              Con este margen y estos fijos el plan pierde dinero a pleno. Sube
              el margen o baja los fijos.
            </ToneAlert>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass("primary", "md")}
              onClick={() => {
                addSaved("plan", {
                  id: `pl${Date.now()}`,
                  ts: Date.now(),
                  tipo: "Plan",
                  risk: S.risk,
                  form: { ...f },
                  resumen: {
                    tot: pl.tot,
                    cum: pl.cum,
                    targetROAS: pl.targetROAS,
                    self: pl.self,
                  },
                });
                toast.show("Plan guardado");
              }}
            >
              <Save aria-hidden className="size-4" /> Guardar plan
            </button>
          </div>
          <Mentor
            action="plan"
            label="Generar propuesta y justificar el propósito"
            intro="El mentor propone cómo desplegar el capital mes a mes y explica el porqué de cada recomendación."
            extra={() => ({ planForm: f })}
          />
        </div>
      </div>

      <section aria-labelledby="pt-t" className={card}>
        <h3 id="pt-t" className="mb-3 text-lg font-semibold text-ink">
          Plan por {u}
        </h3>
        <div
          tabIndex={0}
          role="region"
          aria-label="Tabla con desplazamiento"
          className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus"
        >
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left">
                {[
                  u === "mes" ? "Mes" : "Semana",
                  "Inyectar",
                  "Ads",
                  "Facturación",
                  "U. bruta",
                  "En tránsito",
                  "U. neta",
                  "Acumulado",
                  "Caja",
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
              {pl.rows.map((r) => (
                <tr key={r.i}>
                  <th scope="row" className={cn(td, "text-left font-normal")}>
                    {r.i}
                  </th>
                  <td
                    className={cn(
                      td,
                      "text-right",
                      r.inject > 0 && "font-semibold text-warn",
                    )}
                  >
                    {r.inject > 0 ? fmt.money(r.inject) : "—"}
                  </td>
                  <td className={cn(td, "text-right")}>{fmt.money(r.spend)}</td>
                  <td className={cn(td, "text-right")}>{fmt.money(r.rev)}</td>
                  <td className={cn(td, "text-right")}>{fmt.money(r.gp)}</td>
                  <td className={cn(td, "text-right")}>
                    {fmt.money(r.buffer)}
                  </td>
                  <td
                    className={cn(
                      td,
                      "text-right",
                      r.net >= 0 ? "text-pos" : "text-neg",
                    )}
                  >
                    {fmt.money(r.net)}
                  </td>
                  <td
                    className={cn(
                      td,
                      "text-right",
                      r.cum >= 0 ? "text-pos" : "text-neg",
                    )}
                  >
                    {fmt.money(r.cum)}
                  </td>
                  <td className={cn(td, "text-right")}>{fmt.money(r.cash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {toast.node}
    </div>
  );
}
