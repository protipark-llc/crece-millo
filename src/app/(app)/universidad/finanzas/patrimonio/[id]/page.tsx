import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { financePage } from "@/server/page-data";
import { ASSET_TYPE_LABELS } from "@/server/services/planning";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ConfirmAction } from "@/components/ui/form";
import { AssetEditForm, ValuationForm } from "@/components/finance/forms/asset-forms";
import { deleteAssetAction } from "../../actions";

export const metadata: Metadata = { title: "Activo" };

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d, f, row } = await financePage(({ d, f }) => ({ d, f, row: d.assetRows.find((a) => a.asset.id === id) }));
  if (!row) notFound();
  const { asset, valuations } = row;
  return (
    <>
      <PageHeader title={asset.name} description={ASSET_TYPE_LABELS[asset.type]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Historial de valoraciones" description="El patrimonio de cada fecha usa la valoración más reciente hasta esa fecha." />
          <ul className="divide-y divide-border">
            {valuations.map((v) => (
              <li key={v.id} className="flex justify-between px-5 py-3 text-sm">
                <span>
                  {f.date(v.valuedOn)}
                  {v.source && <span className="block text-xs text-muted">{v.source}</span>}
                </span>
                <span className="tabular font-medium">{f.money(v.value, asset.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border p-5">
            <ValuationForm assetId={asset.id} currency={asset.currency} today={d.today} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Datos del activo"
            actions={<ConfirmAction action={deleteAssetAction} fields={{ id: asset.id }} label="Eliminar" title="Eliminar activo" description="Se eliminará el activo y sus valoraciones. Las deudas asociadas se conservan, sin bien asociado." confirmLabel="Eliminar" />}
          />
          <div className="p-5">
            <AssetEditForm asset={{ id: asset.id, name: asset.name, liquidity: asset.liquidity, notes: asset.notes ?? "" }} />
          </div>
        </Card>
      </div>
    </>
  );
}
