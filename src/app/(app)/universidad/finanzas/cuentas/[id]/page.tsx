import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { financePage } from "@/server/page-data";
import { toInputString } from "@/lib/money/money";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ConfirmAction } from "@/components/ui/form";
import { AccountForm } from "@/components/finance/forms/account-form";
import { deleteAccountAction } from "../../actions";

export const metadata: Metadata = { title: "Editar cuenta" };

export default async function EditAccount({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d, a } = await financePage(({ d }) => ({ d, a: d.accountRows.find((x) => x.id === id) }));
  if (!a) notFound();
  return (
    <>
      <PageHeader title={`Editar ${a.name}`} description="Cambiar el saldo inicial recalcula todos los saldos de esta cuenta." />
      <Card>
        <CardHeader
          title="Datos de la cuenta"
          actions={
            <ConfirmAction
              action={deleteAccountAction}
              fields={{ id: a.id }}
              label="Eliminar"
              title="Eliminar cuenta"
              description="Solo se puede eliminar una cuenta sin movimientos ni recurrencias. Si tiene historia, archívala para conservarla."
              confirmLabel="Eliminar"
            />
          }
        />
        <div className="p-5">
          <AccountForm
            defaultCurrency={d.base}
            today={d.today}
            account={{ id: a.id, name: a.name, type: a.type, currency: a.currency, openingBalance: toInputString(Math.abs(a.openingBalance), a.currency), negative: a.openingBalance < 0, openedOn: a.openedOn, notes: a.notes }}
          />
        </div>
      </Card>
    </>
  );
}
