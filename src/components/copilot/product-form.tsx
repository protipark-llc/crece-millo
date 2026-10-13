"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calculator } from "lucide-react";
import { analyzePrice, checkPrice, type PricingInput } from "@/lib/copilot/engine";
import { formatMoney, parseAmount } from "@/lib/money/money";
import { ActionForm, MoneyField, SelectField, SubmitButton, TextField, TextareaField } from "@/components/ui/form";
import { cn } from "@/components/ui/cn";
import { createProductAction, updateProductAction } from "@/app/(app)/comunidad/emprendedores/co-piloto/actions";

import type { ProductFormValues } from "./product-values";

export type { ProductFormValues };

const STATUSES = [
  ["idea", "Idea"],
  ["prueba", "En prueba"],
  ["ganador", "Ganador"],
  ["pausado", "Pausado"],
  ["descartado", "Descartado"],
] as const;

const money = (v: string, currency: string) => {
  try {
    return v.trim() ? parseAmount(v, currency) : 0;
  } catch {
    return 0;
  }
};
const pct = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && v.trim() !== "" ? Math.round(n * 100) : 0;
};

/**
 * Calculadora de precio del Co-Piloto. Los resultados se recalculan al escribir con el mismo
 * motor que usa el servidor (src/lib/copilot/engine.ts); al guardar quedan en tu bitácora.
 */
export function ProductForm({ currency, locale, values }: { currency: string; locale: string; values: ProductFormValues }) {
  const [v, setV] = useState(values);
  const set = (k: keyof ProductFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  const fmt = (m: number) => formatMoney(m, currency, locale);
  const fmtPct = (b: number) => `${(b / 100).toLocaleString(locale, { maximumFractionDigits: 1 })} %`;

  const live = useMemo(() => {
    const shipping = money(v.shippingCost, currency);
    const input: PricingInput = {
      productCost: money(v.productCost, currency),
      shippingCost: shipping,
      otherCosts: money(v.otherCosts, currency),
      returnShippingCost: v.returnShippingCost.trim() ? money(v.returnShippingCost, currency) : shipping,
      paymentFeeBps: pct(v.paymentFeePct),
      platformFeeBps: pct(v.platformFeePct),
      returnRateBps: pct(v.returnRatePct),
      expectedCpa: money(v.expectedCpa, currency),
      targetMarginBps: v.targetMarginPct.trim() ? pct(v.targetMarginPct) : 2000,
    };
    const analysis = analyzePrice(input, currency);
    const sale = money(v.salePrice, currency);
    const price = sale > 0 ? sale : analysis.recommendedPrice;
    return { input, analysis, price, check: price ? checkPrice(input, price) : null, ready: input.productCost > 0 };
  }, [v, currency]);

  const editing = !!values.id;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <ActionForm action={editing ? updateProductAction : createProductAction} className="space-y-6">
        {editing && <input type="hidden" name="id" value={values.id} />}
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-base font-semibold text-ink">Producto</legend>
          <TextField label="Nombre" name="name" value={v.name} onChange={set("name")} placeholder="Ej. Masajeador de ojos térmico" required />
          <TextField label="Proveedor" name="supplier" value={v.supplier} onChange={set("supplier")} optional />
          <SelectField label="Estado" name="status" value={v.status} onChange={set("status")}>
            {STATUSES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </SelectField>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-base font-semibold text-ink">Costos por pedido</legend>
          <p className="text-xs text-muted sm:col-span-2">Lo que te cuesta cada pedido entregado, sin anuncios.</p>
          <MoneyField label="Costo del producto" name="productCost" currency={currency} value={v.productCost} onChange={set("productCost")} required />
          <MoneyField label="Envío de ida" name="shippingCost" currency={currency} value={v.shippingCost} onChange={set("shippingCost")} required />
          <MoneyField label="Otros costos" name="otherCosts" currency={currency} value={v.otherCosts} onChange={set("otherCosts")} optional hint="Empaque, insumos, confirmación." />
          <MoneyField label="Envío de regreso" name="returnShippingCost" currency={currency} value={v.returnShippingCost} onChange={set("returnShippingCost")} optional hint="Si lo dejas vacío, asumimos el mismo valor del envío de ida." />
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-1 text-base font-semibold text-ink">Comisiones y devoluciones</legend>
          <TextField label="Comisión de recaudo (%)" name="paymentFeePct" value={v.paymentFeePct} onChange={set("paymentFeePct")} inputMode="decimal" hint="Transportadora o pasarela." />
          <TextField label="Comisión de plataforma (%)" name="platformFeePct" value={v.platformFeePct} onChange={set("platformFeePct")} inputMode="decimal" hint="Tienda o marketplace." />
          <TextField label="Pedidos devueltos (%)" name="returnRatePct" value={v.returnRatePct} onChange={set("returnRatePct")} inputMode="decimal" hint="Rechazos y devoluciones sobre los enviados." />
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-1 text-base font-semibold text-ink">Anuncios, margen y precio</legend>
          <MoneyField label="CPA esperado" name="expectedCpa" currency={currency} value={v.expectedCpa} onChange={set("expectedCpa")} optional hint="Lo que esperas pagar en anuncios por cada venta." />
          <TextField label="Margen objetivo (%)" name="targetMarginPct" value={v.targetMarginPct} onChange={set("targetMarginPct")} inputMode="decimal" hint="Lo que quieres ganar sobre el precio, después de anuncios." />
          <MoneyField label="Tu precio de venta" name="salePrice" currency={currency} value={v.salePrice} onChange={set("salePrice")} optional hint="Vacío = usamos el recomendado." />
        </fieldset>
        <TextareaField label="Notas" name="notes" value={v.notes} onChange={set("notes")} optional />
        <SubmitButton>{editing ? "Guardar cambios" : "Crear producto"}</SubmitButton>
      </ActionForm>

      <aside aria-live="polite" className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg bg-nav-bg p-5 text-nav-ink">
          <p className="t-overline inline-flex items-center gap-1.5 text-nav-accent">
            <Calculator aria-hidden className="size-3.5" /> ¿Cuánto cobro?
          </p>
          {live.ready && live.analysis.recommendedPrice ? (
            <>
              <p className="mt-2 text-xs">Precio recomendado</p>
              <p className="t-display text-nav-ink-active">{fmt(live.analysis.recommendedPrice)}</p>
              {live.analysis.range && (
                <p className="mt-1 text-xs">
                  Rango saludable {fmt(live.analysis.range.low)} – {fmt(live.analysis.range.high)} (margen {fmtPct(live.analysis.range.lowMarginBps)} a {fmtPct(live.analysis.range.highMarginBps)})
                </p>
              )}
              {live.check && (
                <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 border-t border-white/10 pt-4 text-sm">
                  <dt>Precio que analizamos</dt>
                  <dd className="text-right font-semibold text-nav-ink-active tabular">{fmt(live.check.price)}</dd>
                  <dt>CPA máximo (equilibrio)</dt>
                  <dd className="text-right font-semibold text-nav-ink-active tabular">{fmt(live.check.contribution)}</dd>
                  <dt>CPA para tu margen</dt>
                  <dd className={cn("text-right font-semibold tabular", live.check.targetCpa > 0 ? "text-nav-ink-active" : "text-nav-accent")}>{fmt(live.check.targetCpa)}</dd>
                  <dt>Ganancia por venta (con CPA esperado)</dt>
                  <dd className={cn("text-right font-semibold tabular", live.check.profitPerOrder >= 0 ? "text-nav-ink-active" : "text-nav-accent")}>{fmt(live.check.profitPerOrder)}</dd>
                  <dt>Margen neto</dt>
                  <dd className="text-right font-semibold text-nav-ink-active tabular">{fmtPct(live.check.marginBps)}</dd>
                </dl>
              )}
              <p className="mt-4 text-xs text-nav-label">
                Precio en equilibrio: {live.analysis.breakEvenPrice ? fmt(live.analysis.breakEvenPrice) : "—"}. Devoluciones: {fmt(live.analysis.returnLoss)} por pedido entregado.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm">Escribe el costo del producto y el envío para ver tu precio recomendado.</p>
          )}
        </div>
        {live.analysis.warnings.map((w) => (
          <p key={w} className="mt-3 flex gap-2 rounded-lg bg-warn-soft px-3.5 py-3 text-sm text-ink">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" /> {w}
          </p>
        ))}
        <p className="mt-3 text-xs text-muted">Estimación educativa con tus supuestos. No garantiza ventas ni ganancias.</p>
      </aside>
    </div>
  );
}
