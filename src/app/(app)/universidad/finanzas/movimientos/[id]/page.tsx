import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { financePage } from "@/server/page-data";
import { toInputString } from "@/lib/money/money";
import { Alert, Card, PageHeader } from "@/components/ui/primitives";
import { TransactionForm } from "@/components/finance/forms/transaction-form";
import { txFormData } from "@/components/finance/tx-form-data";

export const metadata: Metadata = { title: "Editar movimiento" };

export default async function EditMovement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d, t } = await financePage(({ d }) => ({ d, t: d.txRows.find((x) => x.id === id) }));
  if (!t) notFound();
  const { accounts, categories } = txFormData(d);
  const toCurrency = d.accountRows.find((a) => a.id === t.toAccountId)?.currency ?? t.currency;
  return (
    <>
      <PageHeader title="Editar movimiento" description={t.recurrenceRuleId ? "Los cambios solo afectan esta ocurrencia. Para cambiar las siguientes, edita la recurrencia." : undefined} />
      {t.debtId ? (
        <Alert tone="info">Este movimiento es un pago de deuda. Para corregirlo, elimínalo desde la deuda y regístralo de nuevo con el desglose correcto.</Alert>
      ) : (
        <Card className="p-5">
          <TransactionForm
            accounts={accounts}
            categories={categories}
            today={d.today}
            successHref="/universidad/finanzas/movimientos"
            defaults={{
              id: t.id,
              kind: t.kind,
              status: t.status,
              amount: toInputString(t.amount, t.currency),
              accountId: t.accountId,
              toAccountId: t.toAccountId ?? "",
              toAmount: t.toAmount ? toInputString(t.toAmount, toCurrency) : "",
              date: t.date,
              postedOn: t.postedOn ?? "",
              categoryId: t.categoryId ?? "",
              nature: t.nature ?? "",
              incomeSource: t.incomeSource ?? "",
              description: t.description,
              counterparty: t.counterparty ?? "",
              notes: t.notes ?? "",
            }}
          />
        </Card>
      )}
    </>
  );
}
