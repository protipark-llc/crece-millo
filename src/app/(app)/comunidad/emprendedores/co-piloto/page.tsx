import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Gauge, Plus } from "lucide-react";
import { loadForUser } from "@/server/action-utils";
import { getSettings } from "@/server/services/settings";
import { STATUS_LABEL, capitalSummary, getPlan, listProducts, listTests, productSummary, routeProgress, type ProductStatus } from "@/server/services/copilot";
import { routeStatus } from "@/lib/copilot/route";
import { formatters } from "@/server/format";
import { toInputString } from "@/lib/money/money";
import { Alert, Badge, ButtonLink, Card, CardHeader, EmptyState, Meter, buttonClass } from "@/components/ui/primitives";
import { ActionForm, MoneyField, SubmitButton, TextField } from "@/components/ui/form";
import { Crumbs, EntrepreneurTabs } from "@/components/copilot/nav";
import { VerdictBadge } from "@/components/copilot/verdict";
import { cn } from "@/components/ui/cn";
import { savePlanAction } from "./actions";

export const metadata: Metadata = { title: "Co-Piloto de Negocio" };

const STATUS_TONE: Record<ProductStatus, "neutral" | "info" | "pos" | "warn"> = { idea: "neutral", prueba: "info", ganador: "pos", pausado: "warn", descartado: "neutral" };

export default async function CoPilotPage() {
  const data = await loadForUser(async ({ tx, userId }) => {
    const settings = await getSettings(tx, userId);
    const [products, tests, plan, done] = await Promise.all([listProducts(tx, userId), listTests(tx, userId), getPlan(tx, userId), routeProgress(tx, userId)]);
    return { settings, products, tests, plan, done };
  });
  const f = formatters(data.settings.currency, data.settings.locale);
  const summaries = data.products.map((p) => productSummary(p, data.tests));
  const active = summaries.find((s) => s.product.status === "ganador") ?? summaries.find((s) => s.product.status === "prueba") ?? summaries.find((s) => s.product.status !== "descartado") ?? null;
  const capital = capitalSummary(data.plan, active?.check?.contribution ?? null);
  const route = routeStatus(data.done);
  const cur = data.settings.currency;

  return (
    <>
      <Crumbs items={[{ href: "/comunidad", label: "Comunidad" }, { href: "/comunidad/emprendedores", label: "Emprendedores" }, { label: "Co-Piloto de Negocio" }]} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="t-page text-ink">Co-Piloto de Negocio</h1>
          <p className="mt-2 max-w-2xl text-ink-2">Prueba un producto con números antes de invertir: precio recomendado, CPA máximo, veredicto de tus tests y un plan de capital.</p>
        </div>
        <ButtonLink href="/comunidad/emprendedores/co-piloto/productos/nuevo">
          <Plus aria-hidden className="size-4" /> Nuevo producto
        </ButtonLink>
      </div>
      <EntrepreneurTabs current="copiloto" />

      <Alert tone="warn" className="mb-5" title="El dropshipping tiene riesgo">
        Puedes perder lo que inviertas en producto y anuncios. El Co-Piloto te ayuda a decidir con números; no garantiza ventas ni ganancias.
      </Alert>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <Card id="productos" className="scroll-mt-6">
            <CardHeader title="Tus productos" description="Cada producto con su precio, su CPA máximo y el veredicto de su último test." />
            {summaries.length === 0 ? (
              <EmptyState
                icon={<Gauge className="size-6" />}
                title="Agrega tu primer producto"
                action={<ButtonLink href="/comunidad/emprendedores/co-piloto/productos/nuevo">Calcular un producto</ButtonLink>}
              >
                Con el costo del producto y el envío te decimos cuánto cobrar y cuánto puedes pagar por cada venta en anuncios.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {summaries.map((s) => (
                  <li key={s.product.id}>
                    <Link href={`/comunidad/emprendedores/co-piloto/productos/${s.product.id}`} className="grid gap-2 px-5 py-4 hover:bg-surface-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{s.product.name}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          <Badge tone={STATUS_TONE[s.product.status as ProductStatus]}>{STATUS_LABEL[s.product.status as ProductStatus]}</Badge>
                          {s.latest && <VerdictBadge verdict={s.latest.result.verdict} />}
                        </span>
                      </span>
                      <span className="text-sm">
                        <span className="block text-xs text-muted">{s.usingRecommended ? "Precio recomendado" : "Tu precio"}</span>
                        <span className="font-semibold text-ink tabular">{s.price ? f.money(s.price) : "—"}</span>
                      </span>
                      <span className="text-sm">
                        <span className="block text-xs text-muted">CPA máximo</span>
                        <span className={cn("font-semibold tabular", s.check && s.check.contribution <= 0 ? "text-neg" : "text-ink")}>{s.check ? f.money(s.check.contribution) : "—"}</span>
                      </span>
                      <ArrowRight aria-hidden className="hidden size-4 text-muted sm:block" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="capital" className="scroll-mt-6">
            <CardHeader title="Plan de capital" description="Cuánto puedes arriesgar en pruebas sin tocar tu reserva." />
            <div className="grid gap-6 p-5 md:grid-cols-2">
              <ActionForm action={savePlanAction} className="grid gap-4">
                <MoneyField label="Capital para el negocio" name="capital" currency={cur} defaultValue={data.plan ? toInputString(data.plan.capital, cur) : ""} required />
                <TextField label="Reserva que no se toca (%)" name="reservePct" inputMode="decimal" defaultValue={data.plan ? String(data.plan.reserveBps / 100).replace(".", ",") : "30"} />
                <MoneyField label="Costos fijos del mes" name="monthlyFixed" currency={cur} optional hint="Tienda, dominio, aplicaciones." defaultValue={data.plan?.monthlyFixed ? toInputString(data.plan.monthlyFixed, cur) : ""} />
                <MoneyField
                  label="Presupuesto de prueba por producto"
                  name="testBudget"
                  currency={cur}
                  optional
                  hint={capital?.suggested ? `Vacío = sugerido: ${f.money(capital.suggested)} (3 × CPA de equilibrio).` : "Vacío = 3 × el CPA de equilibrio de tu producto en prueba."}
                  defaultValue={data.plan?.testBudget ? toInputString(data.plan.testBudget, cur) : ""}
                />
                <SubmitButton>Guardar plan</SubmitButton>
              </ActionForm>
              {capital ? (
                <div>
                  <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
                    <dt className="text-ink-2">Reserva</dt>
                    <dd className="text-right font-semibold text-ink tabular">{f.money(capital.result.reserve)}</dd>
                    <dt className="text-ink-2">Disponible para pruebas</dt>
                    <dd className="text-right font-semibold text-ink tabular">{f.money(capital.result.available)}</dd>
                    <dt className="text-ink-2">Presupuesto por prueba</dt>
                    <dd className="text-right font-semibold text-ink tabular">{capital.testBudget ? f.money(capital.testBudget) : "—"}</dd>
                  </dl>
                  <p className="t-answer mt-4 text-ink">
                    {capital.testBudget > 0 ? `Puedes probar ${capital.result.productsTestable} ${capital.result.productsTestable === 1 ? "producto" : "productos"}.` : "Define un presupuesto de prueba."}
                  </p>
                  {capital.testBudget > 0 && (
                    <p className="mt-2 text-sm text-ink-2">
                      Si todas fallan, perderías como máximo <strong className="tabular text-ink">{f.money(capital.result.maxLoss)}</strong>, sin tocar la reserva.
                    </p>
                  )}
                  {capital.result.warnings.map((w) => (
                    <p key={w} className="mt-3 flex gap-2 text-sm text-warn">
                      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-2">Guarda tu capital para ver cuántos productos puedes probar y cuánto arriesgas como máximo.</p>
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card tone="dark" className="p-5">
            <p className="t-overline text-nav-accent">Producto activo</p>
            {active ? (
              <>
                <p className="mt-2 text-lg font-semibold text-nav-ink-active">{active.product.name}</p>
                <p className="mt-3 text-xs text-nav-ink">{active.usingRecommended ? "Precio recomendado" : "Tu precio"}</p>
                <p className="t-display text-nav-ink-active">{active.price ? f.money(active.price) : "—"}</p>
                {active.analysis.range && (
                  <p className="mt-1 text-xs text-nav-ink">
                    Rango saludable {f.money(active.analysis.range.low)} – {f.money(active.analysis.range.high)}
                  </p>
                )}
                {active.latest && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-nav-ink">
                    Último test: <VerdictBadge verdict={active.latest.result.verdict} />
                  </p>
                )}
                <Link href={`/comunidad/emprendedores/co-piloto/productos/${active.product.id}`} className={buttonClass("accent", "md", "mt-4 w-full")}>
                  Abrir producto
                </Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-nav-ink">Cuando agregues un producto, aquí verás su precio y el veredicto de su último test.</p>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">Tu ruta de dropshipping</h2>
              <Link href="/comunidad/emprendedores/ruta" className="text-sm font-semibold text-ink hover:underline">
                Ver ruta
              </Link>
            </div>
            <p className="mt-1 text-sm text-ink-2 tabular">
              {route.done} de {route.total} pasos · fase {route.phase}
            </p>
            <div className="mt-3">
              <Meter value={route.done} max={route.total} tone="accent" label="Avance de la ruta de dropshipping" />
            </div>
            {route.next && <p className="mt-3 text-sm text-ink">Siguiente: {route.next.title}</p>}
          </Card>
          <Card className="p-5 text-sm text-ink-2">
            <h2 className="text-base font-semibold text-ink">Cómo calcula</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Precio = costos por pedido ÷ (1 − comisiones − margen objetivo).</li>
              <li>Las devoluciones reparten el flete de ida y vuelta en cada pedido entregado.</li>
              <li>CPA máximo = lo que queda de cada venta antes de anuncios.</li>
              <li>Veredicto: seguir (CPA dentro del objetivo), optimizar (hasta 1,25 × el máximo) o parar.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
