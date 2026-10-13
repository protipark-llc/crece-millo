import type { Metadata } from "next";
import { Plus, Repeat, Tags } from "lucide-react";
import { financePage } from "@/server/page-data";
import { ButtonLink, PageHeader } from "@/components/ui/primitives";
import { loadTransactionsView, TransactionsView } from "@/components/finance/transactions-view";

export const metadata: Metadata = { title: "Movimientos" };

export default async function MovementsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { d, f, view } = await financePage(async ({ d, f, tx, userId }) => ({ d, f, view: await loadTransactionsView(tx, userId, d, params) }));
  return (
    <>
      <PageHeader
        title="Movimientos"
        eyebrow="Finanzas personales"
        description="Ingresos, gastos y transferencias entre tus cuentas. Separamos lo previsto de lo realizado."
        actions={
          <>
            <ButtonLink href="/universidad/finanzas/recurrencias" variant="ghost">
              <Repeat aria-hidden className="size-4" /> Recurrencias
            </ButtonLink>
            <ButtonLink href="/universidad/finanzas/categorias" variant="ghost">
              <Tags aria-hidden className="size-4" /> Categorías
            </ButtonLink>
            <ButtonLink href="/universidad/finanzas/movimientos/nuevo">
              <Plus aria-hidden className="size-4" /> Nuevo movimiento
            </ButtonLink>
          </>
        }
      />
      <TransactionsView d={d} f={f} view={view} params={params} basePath="/universidad/finanzas/movimientos" />
    </>
  );
}
