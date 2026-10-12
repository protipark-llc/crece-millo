import type { Metadata } from "next";
import { financePage } from "@/server/page-data";
import { Card, PageHeader } from "@/components/ui/primitives";
import { DebtForm } from "@/components/finance/forms/debt-forms";

export const metadata: Metadata = { title: "Registrar deuda" };

export default async function NewDebt() {
  const { d } = await financePage(({ d }) => ({ d }));
  return (
    <>
      <PageHeader title="Registrar deuda" description="Usa los datos de tu extracto o contrato. Si no conoces la tasa, déjala vacía: no inventaremos valores." />
      <Card className="p-5">
        <DebtForm
          today={d.today}
          assets={d.assetRows.map((a) => ({ id: a.asset.id, name: a.asset.name }))}
          defaults={{ name: "", creditor: "", type: "credit_card", currency: d.base, openingBalance: "", balanceDate: d.today, ratePercent: "", rateBasis: "", minimumPayment: "", paymentDay: "", remainingTermMonths: "", monthlyFees: "", daysPastDue: "", arrearsAmount: "", securedAssetId: "", customPriority: "", status: "active", notes: "" }}
        />
      </Card>
    </>
  );
}
