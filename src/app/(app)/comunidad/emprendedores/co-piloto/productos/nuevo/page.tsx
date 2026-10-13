import type { Metadata } from "next";
import { loadForUser } from "@/server/action-utils";
import { getSettings } from "@/server/services/settings";
import { ProductForm } from "@/components/copilot/product-form";
import { NEW_PRODUCT } from "@/components/copilot/product-values";
import { Crumbs } from "@/components/copilot/nav";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Nuevo producto · Co-Piloto" };

export default async function NewProductPage() {
  const s = await loadForUser(({ tx, userId }) => getSettings(tx, userId));
  return (
    <>
      <Crumbs items={[{ href: "/comunidad/emprendedores", label: "Emprendedores" }, { href: "/comunidad/emprendedores/co-piloto", label: "Co-Piloto" }, { label: "Nuevo producto" }]} />
      <h1 className="t-page mt-2 text-ink">¿Cuánto cobro?</h1>
      <p className="mt-2 mb-6 max-w-2xl text-ink-2">Escribe tus costos reales. El precio y el CPA máximo se calculan mientras escribes; al guardar, el producto queda en tu bitácora.</p>
      <Card className="p-5 sm:p-6">
        <ProductForm currency={s.currency} locale={s.locale} values={NEW_PRODUCT} />
      </Card>
    </>
  );
}
