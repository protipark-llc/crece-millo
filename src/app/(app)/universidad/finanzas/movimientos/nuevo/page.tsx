import type { Metadata } from "next";
import { financePage, first } from "@/server/page-data";
import { Card, PageHeader } from "@/components/ui/primitives";
import { TransactionForm } from "@/components/finance/forms/transaction-form";
import { emptyTx, txFormData } from "@/components/finance/tx-form-data";

export const metadata: Metadata = { title: "Nuevo movimiento" };

export default async function NewMovement({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const tipo = first(params.tipo);
  const kind = tipo === "income" || tipo === "transfer" ? tipo : "expense";
  const { d } = await financePage(({ d }) => ({ d }));
  const { accounts, categories } = txFormData(d);
  return (
    <>
      <PageHeader title="Nuevo movimiento" description="Registra lo que ya ocurrió (realizado) o lo que esperas que ocurra (previsto). Si se repite, crea una recurrencia." />
      <Card className="p-5">
        <TransactionForm accounts={accounts} categories={categories} defaults={emptyTx(kind, d.today)} today={d.today} />
      </Card>
    </>
  );
}
