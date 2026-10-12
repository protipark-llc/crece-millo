import type { Metadata } from "next";
import { financePage } from "@/server/page-data";
import { Card, PageHeader } from "@/components/ui/primitives";
import { AssetForm } from "@/components/finance/forms/asset-forms";

export const metadata: Metadata = { title: "Registrar activo" };

export default async function NewAsset() {
  const { d } = await financePage(({ d }) => ({ d }));
  return (
    <>
      <PageHeader title="Registrar activo" description="Usa un valor realista y anota la fuente. Si el bien tiene una deuda (hipoteca, crédito de vehículo), asóciala desde la deuda." />
      <Card className="p-5">
        <AssetForm defaultCurrency={d.base} today={d.today} />
      </Card>
    </>
  );
}
