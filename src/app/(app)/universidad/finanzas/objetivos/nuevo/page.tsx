import type { Metadata } from "next";
import { financePage } from "@/server/page-data";
import { monthlyReferences } from "@/server/services/finance-data";
import { suggestedEmergencyMonths } from "@/lib/finance/goals";
import { Card, PageHeader } from "@/components/ui/primitives";
import { GoalForm } from "@/components/finance/forms/goal-forms";

export const metadata: Metadata = { title: "Nuevo objetivo" };

export default async function NewGoal() {
  const { d, f, refs } = await financePage(({ d, f }) => ({ d, f, refs: monthlyReferences(d) }));
  const s = suggestedEmergencyMonths({ stability: d.settings.incomeStability, dependents: d.settings.dependentsCount ?? 0, singleIncome: !!d.settings.singleIncomeHousehold });
  return (
    <>
      <PageHeader title="Nuevo objetivo" description="Un objetivo claro tiene monto, fecha y un aporte periódico realista." />
      <Card className="p-5">
        <GoalForm
          today={d.today}
          suggestedMonths={s.months}
          essentialMonthly={refs.essential ? f.money(refs.essential) : null}
          accounts={d.accountRows.filter((a) => !a.archivedAt).map((a) => ({ id: a.id, name: a.name }))}
          defaults={{ name: "", type: "emergency_fund", currency: d.base, targetAmount: "", targetDate: "", priority: "3", plannedMonthly: "", accountId: "", emergencyMonthsTarget: "", notes: "" }}
        />
      </Card>
    </>
  );
}
