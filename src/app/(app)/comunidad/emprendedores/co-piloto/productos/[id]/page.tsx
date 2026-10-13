import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { loadForUser } from "@/server/action-utils";
import { getSettings } from "@/server/services/settings";
import { PRODUCT_STATUSES, STATUS_LABEL, getProduct, listTests, productSummary } from "@/server/services/copilot";
import { UserFacingError } from "@/server/services/errors";
import { formatters } from "@/server/format";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { ActionForm, ConfirmAction, InlineAction, MoneyField, SubmitButton, TextField } from "@/components/ui/form";
import { ProductForm } from "@/components/copilot/product-form";
import { productFormValues } from "@/components/copilot/product-values";
import { Crumbs } from "@/components/copilot/nav";
import { VerdictBadge } from "@/components/copilot/verdict";
import { cn } from "@/components/ui/cn";
import { addTestAction, deleteProductAction, deleteTestAction, setProductStatusAction } from "../../actions";

export const metadata: Metadata = { title: "Producto · Co-Piloto" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await loadForUser(async ({ tx, userId, today }) => {
    const settings = await getSettings(tx, userId);
    try {
      const product = await getProduct(tx, userId, id);
      return { settings, product, tests: await listTests(tx, userId, id), today };
    } catch (e) {
      if (e instanceof UserFacingError) return null;
      throw e;
    }
  });
  if (!data) notFound();
  const f = formatters(data.product.currency, data.settings.locale);
  const s = productSummary(data.product, data.tests);
  const formValues = productFormValues(s.product);
  const c = s.check;
  return (
    <>
      <Crumbs items={[{ href: "/comunidad/emprendedores", label: "Emprendedores" }, { href: "/comunidad/emprendedores/co-piloto", label: "Co-Piloto" }, { label: s.product.name }]} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="t-page text-ink">{s.product.name}</h1>
        <ConfirmAction
          action={deleteProductAction}
          fields={{ id: s.product.id }}
          label="Eliminar"
          icon={<Trash2 aria-hidden className="size-4" />}
          title="Eliminar producto"
          description="Se eliminarán el producto y sus tests. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          danger
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Estado del producto">
        {PRODUCT_STATUSES.map((st) =>
          st === s.product.status ? (
            <Badge key={st} tone="neutral" className="h-9 bg-brand px-3 text-brand-ink">
              {STATUS_LABEL[st]}
            </Badge>
          ) : (
            <InlineAction key={st} action={setProductStatusAction} fields={{ id: s.product.id, status: st }} title={`Marcar como ${STATUS_LABEL[st].toLowerCase()}`} className="border border-border">
              {STATUS_LABEL[st]}
            </InlineAction>
          ),
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-4">
        <div className="p-4">
          <dt className="text-[13px] text-muted">{s.usingRecommended ? "Precio recomendado" : "Tu precio"}</dt>
          <dd className="t-kpi mt-1 text-ink">{s.price ? f.money(s.price) : "—"}</dd>
          {s.analysis.range && (
            <dd className="mt-0.5 text-xs text-muted">
              Rango {f.money(s.analysis.range.low)} – {f.money(s.analysis.range.high)}
            </dd>
          )}
        </div>
        <div className="border-l border-border p-4">
          <dt className="text-[13px] text-muted">CPA máximo (equilibrio)</dt>
          <dd className={cn("t-kpi mt-1", c && c.contribution <= 0 ? "text-neg" : "text-ink")}>{c ? f.money(c.contribution) : "—"}</dd>
          <dd className="mt-0.5 text-xs text-muted">Lo que deja cada venta antes de anuncios</dd>
        </div>
        <div className="border-t border-border p-4 lg:border-t-0 lg:border-l">
          <dt className="text-[13px] text-muted">CPA para tu margen</dt>
          <dd className={cn("t-kpi mt-1", c && c.targetCpa <= 0 ? "text-neg" : "text-ink")}>{c ? f.money(c.targetCpa) : "—"}</dd>
          <dd className="mt-0.5 text-xs text-muted">Margen objetivo {f.pct(s.product.targetMarginBps / 10000, 1)}</dd>
        </div>
        <div className="border-t border-l border-border p-4 lg:border-t-0">
          <dt className="text-[13px] text-muted">Ganancia por venta</dt>
          <dd className={cn("t-kpi mt-1", c && c.profitPerOrder < 0 ? "text-neg" : "text-ink")}>{c ? f.money(c.profitPerOrder) : "—"}</dd>
          <dd className="mt-0.5 text-xs text-muted">Con CPA esperado de {f.money(s.product.expectedCpa)}</dd>
        </div>
      </dl>

      <Card className="mt-5">
        <CardHeader title="Tests de anuncios" description="Registra cada prueba: el veredicto compara tu costo por venta con tu CPA máximo." />
        <div className="border-b border-border p-5">
          <ActionForm action={addTestAction} resetOnSuccess className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
            <input type="hidden" name="productId" value={s.product.id} />
            <TextField label="Inicio" name="startedOn" type="date" defaultValue={data.today} max={data.today} required />
            <TextField label="Días" name="days" inputMode="numeric" defaultValue="4" required />
            <MoneyField label="Gasto en anuncios" name="adSpend" currency={s.product.currency} required />
            <TextField label="Ventas" name="orders" inputMode="numeric" required />
            <TextField label="Canal" name="channel" optional placeholder="Meta, TikTok…" />
            <SubmitButton>Registrar test</SubmitButton>
          </ActionForm>
        </div>
        {s.tests.length === 0 ? (
          <EmptyState title="Aún no hay tests">Cuando pruebes un anuncio, registra cuánto gastaste, cuántos días y cuántas ventas tuviste.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {s.tests.map(({ test, result }) => (
              <li key={test.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                <VerdictBadge verdict={result.verdict} />
                <div className="min-w-0 text-sm">
                  <p className="text-ink">
                    {f.date(test.startedOn)} · {test.days} {test.days === 1 ? "día" : "días"}
                    {test.channel ? ` · ${test.channel}` : ""} · gasto {f.money(test.adSpend)} · {test.orders} {test.orders === 1 ? "venta" : "ventas"}
                    {result.cpa !== null && <> · CPA {f.money(result.cpa)}</>}
                  </p>
                  <p className="mt-0.5 text-ink-2">{result.reason}</p>
                </div>
                <ConfirmAction
                  action={deleteTestAction}
                  fields={{ id: test.id }}
                  label={<span className="sr-only">Eliminar test</span>}
                  icon={<Trash2 aria-hidden className="size-4" />}
                  title="Eliminar test"
                  description="Se eliminará este registro de prueba."
                  confirmLabel="Eliminar"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="t-section mb-4 text-ink">Costos y precio</h2>
        {/* key: si el estado o los costos cambian en el servidor (p. ej. al registrar un test), el formulario se rehace con los valores nuevos. */}
        <ProductForm key={JSON.stringify(formValues)} currency={s.product.currency} locale={data.settings.locale} values={formValues} />
      </Card>
    </>
  );
}
