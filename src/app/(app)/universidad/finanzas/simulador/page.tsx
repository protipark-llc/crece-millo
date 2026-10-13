import type { Metadata } from "next";
import { financePage } from "@/server/page-data";
import { debtsForPlan, liquidBalance, monthlyReferences, netWorthNow } from "@/server/services/finance-data";
import { listScenarios } from "@/server/services/scenarios";
import { PageHeader } from "@/components/ui/primitives";
import { Simulator } from "@/components/finance/simulator";

export const metadata: Metadata = { title: "Simulador de escenarios" };

export default async function SimulatorPage() {
  const data = await financePage(async ({ d, tx, userId }) => {
    const refs = monthlyReferences(d);
    const nw = netWorthNow(d);
    const cash = liquidBalance(d);
    const saved = await listScenarios(tx, userId);
    return {
      d,
      saved: saved.map((s) => ({ id: s.id, name: s.name, assumptions: s.assumptions })),
      baseline: {
        liquidBalance: cash,
        monthlyIncome: refs.income ?? 0,
        monthlyEssential: refs.essentialNoDebt ?? 0,
        monthlyDiscretionary: refs.discretionary ?? 0,
        // Activos no líquidos (cuentas de inversión y bienes) que se mantienen constantes.
        otherAssets: nw.assets - nw.liquid,
        source:
          refs.source === "history"
            ? `Promedio de tus últimos ${refs.monthsUsed} mes(es) completos. Puedes editar cada valor.`
            : refs.source === "recurring"
              ? "Calculado con tus movimientos recurrentes del próximo mes. Puedes editar cada valor."
              : "Aún no hay suficiente historia: ingresa valores aproximados.",
      },
      debts: debtsForPlan(d),
    };
  });
  return (
    <>
      <PageHeader title="Simulador de escenarios" description="Explora decisiones antes de tomarlas: un aumento de ingresos, una nueva cuota, una compra grande o un periodo sin ingresos." />
      <Simulator currency={data.d.base} locale={data.d.locale} startDate={data.d.today} baseline={data.baseline} debts={data.debts} saved={data.saved} />
    </>
  );
}
