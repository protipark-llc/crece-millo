import type { Metadata } from "next";
import { Repeat } from "lucide-react";
import { financePage } from "@/server/page-data";
import { FREQUENCY_LABELS, monthlyEquivalent, occurrences } from "@/lib/finance/recurrence";
import { addDays } from "@/lib/finance/dates";
import { toInputString } from "@/lib/money/money";
import { categoryLabel } from "@/server/services/categories";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ConfirmAction } from "@/components/ui/form";
import { RuleForm } from "@/components/finance/forms/rule-form";
import { deleteRuleAction } from "../actions";

export const metadata: Metadata = { title: "Recurrencias" };

export default async function RulesPage() {
  const { d, f } = await financePage(({ d, f }) => ({ d, f }));
  return (
    <>
      <PageHeader
        title="Recurrencias"
        description="Ingresos y gastos que se repiten. Cada ocurrencia tiene una fecha única: confirmarla dos veces no crea duplicados, y las proyecciones las incluyen hasta que las confirmes u omitas."
        actions={<ButtonLink href="/universidad/finanzas/movimientos/nuevo">Nueva recurrencia</ButtonLink>}
      />
      {d.ruleRows.length === 0 ? (
        <Card>
          <EmptyState icon={<Repeat className="size-6" />} title="No tienes recurrencias">
            Al registrar un movimiento, elige con qué frecuencia se repite (por ejemplo, salario quincenal o arriendo mensual).
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          {d.ruleRows.map((r) => {
            const next = occurrences(r, d.today, addDays(d.today, 400)).slice(0, 3);
            return (
              <Card key={r.id} className="p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">
                      {r.description} {!r.active && <Badge>Pausada</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                      {r.kind === "income" ? "Ingreso" : r.kind === "expense" ? "Gasto" : "Transferencia"} · {FREQUENCY_LABELS[r.frequency]} · desde {f.date(r.startDate)}
                      {r.endDate && ` hasta ${f.date(r.endDate)}`} · {r.kind !== "transfer" && categoryLabel(d.categoryRows, r.categoryId)}
                    </p>
                    <p className="mt-1 text-sm text-ink-2">
                      {f.money(r.amount, r.currency)} por ocurrencia · equivalente mensual {f.money(monthlyEquivalent(r), r.currency)}
                    </p>
                    {next.length > 0 && r.active && <p className="mt-1 text-xs text-muted">Próximas: {next.map((x) => f.date(x)).join(" · ")}</p>}
                  </div>
                  <ConfirmAction
                    action={deleteRuleAction}
                    fields={{ id: r.id }}
                    label="Eliminar"
                    title="Eliminar recurrencia"
                    description="Se eliminarán sus ocurrencias previstas o anuladas. Los movimientos ya realizados se conservan."
                    confirmLabel="Eliminar"
                  />
                </div>
                <RuleForm rule={{ id: r.id, description: r.description, amount: toInputString(r.amount, r.currency), currency: r.currency, endDate: r.endDate ?? "", active: r.active }} />
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
