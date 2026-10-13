import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { financePage } from "@/server/page-data";
import { toInputString } from "@/lib/money/money";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ConfirmAction } from "@/components/ui/form";
import { DebtForm } from "@/components/finance/forms/debt-forms";
import { deleteDebtAction } from "../../actions";

export const metadata: Metadata = { title: "Editar deuda" };

export default async function EditDebt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d, row } = await financePage(({ d }) => ({ d, row: d.debtRows.find((x) => x.debt.id === id) }));
  if (!row) notFound();
  const x = row.debt;
  const m = (v: number | null) => (v === null || v === undefined ? "" : toInputString(v, x.currency));
  return (
    <>
      <PageHeader title={`Editar ${x.name}`} description="El saldo pendiente se calcula como capital inicial − abonos a capital registrados desde la fecha del saldo." />
      <Card>
        <CardHeader
          title="Datos de la deuda"
          actions={
            <ConfirmAction
              action={deleteDebtAction}
              fields={{ id: x.id }}
              label="Eliminar"
              title="Eliminar deuda"
              description="Se eliminarán la deuda y su historial de pagos. Los gastos ya registrados en tus cuentas se conservan."
              confirmLabel="Eliminar"
            />
          }
        />
        <div className="p-5">
          <DebtForm
            today={d.today}
            assets={d.assetRows.map((a) => ({ id: a.asset.id, name: a.asset.name }))}
            defaults={{
              id: x.id,
              name: x.name,
              creditor: x.creditor ?? "",
              type: x.type,
              currency: x.currency,
              openingBalance: m(x.openingBalance),
              balanceDate: x.balanceDate,
              ratePercent: x.ratePercent ? String(Number(x.ratePercent)) : "",
              rateBasis: x.rateBasis ?? "",
              minimumPayment: m(x.minimumPayment),
              paymentDay: x.paymentDay ? String(x.paymentDay) : "",
              remainingTermMonths: x.remainingTermMonths ? String(x.remainingTermMonths) : "",
              monthlyFees: x.monthlyFees ? m(x.monthlyFees) : "",
              daysPastDue: x.daysPastDue ? String(x.daysPastDue) : "",
              arrearsAmount: m(x.arrearsAmount),
              securedAssetId: x.securedAssetId ?? "",
              customPriority: x.customPriority ? String(x.customPriority) : "",
              status: x.status,
              notes: x.notes ?? "",
            }}
          />
        </div>
      </Card>
    </>
  );
}
