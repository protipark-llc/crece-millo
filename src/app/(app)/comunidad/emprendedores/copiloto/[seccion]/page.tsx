import { notFound } from "next/navigation";
import { tabBySlug } from "@/lib/copiloto/nav";
import { SeccionPendiente } from "@/components/copiloto/pendiente";
import { Portfolio } from "@/components/copiloto/productos/portfolio";
import { Detalle } from "@/components/copiloto/productos/detalle";
import { Precio } from "@/components/copiloto/productos/precio";

export default async function CopilotoSeccion({
  params,
}: {
  params: Promise<{ seccion: string }>;
}) {
  const { seccion } = await params;
  const tab = tabBySlug(seccion);
  if (!tab) notFound();
  if (tab.slug === "productos")
    return (
      <div className="space-y-4">
        <Portfolio />
        <Detalle precio={<Precio />} />
      </div>
    );
  return <SeccionPendiente slug={tab.slug} />;
}
