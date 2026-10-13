import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { financePage } from "@/server/page-data";
import { monthlyReferences } from "@/server/services/finance-data";
import { suggestedEmergencyMonths } from "@/lib/finance/goals";
import { toInputString } from "@/lib/money/money";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ConfirmAction } from "@/components/ui/form";
import { GoalForm } from "@/components/finance/forms/goal-forms";
import { deleteGoalAction } from "../../actions";

export const metadata: Metadata = { title: "Editar objetivo" };

export default async function EditGoal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d, f, refs, row } = await financePage(({ d, f }) => ({ d, f, refs: monthlyReferences(d), row: d.goalRows.find((g) => g.goal.id === id) }));
  if (!row) notFound();
  const g = row.goal;
  const s = suggestedEmergencyMonths({ stability: d.settings.incomeStability, dependents: d.settings.dependentsCount ?? 0, singleIncome: !!d.settings.singleIncomeHousehold });
  return (
    <>
      <PageHeader title={`Editar ${g.name}`} />
      <Card>
        <CardHeader
          title="Datos del objetivo"
          actions={<ConfirmAction action={deleteGoalAction} fields={{ id: g.id }} label="Eliminar" title="Eliminar objetivo" description="Se eliminarán el objetivo y su historial de aportes. Tus cuentas no cambian." confirmLabel="Eliminar" />}
        />
        <div className="p-5">
          <GoalForm
            today={d.today}
            suggestedMonths={s.months}
            essentialMonthly={refs.essential ? f.money(refs.essential) : null}
            accounts={d.accountRows.filter((a) => !a.archivedAt).map((a) => ({ id: a.id, name: a.name }))}
            defaults={{
              id: g.id,
              name: g.name,
              type: g.type,
              currency: g.currency,
              targetAmount: toInputString(g.targetAmount, g.currency),
              targetDate: g.targetDate ?? "",
              priority: String(g.priority),
              plannedMonthly: g.plannedMonthly ? toInputString(g.plannedMonthly, g.currency) : "",
              accountId: g.accountId ?? "",
              emergencyMonthsTarget: g.emergencyMonthsTarget ? String(g.emergencyMonthsTarget) : "",
              notes: g.notes ?? "",
            }}
          />
        </div>
      </Card>
    </>
  );
}
