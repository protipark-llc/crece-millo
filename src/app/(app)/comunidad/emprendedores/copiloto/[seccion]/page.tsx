import { notFound } from "next/navigation";
import { tabBySlug } from "@/lib/copiloto/nav";
import { SeccionPendiente } from "@/components/copiloto/pendiente";
import { Portfolio } from "@/components/copiloto/productos/portfolio";
import { Detalle } from "@/components/copiloto/productos/detalle";
import { Precio } from "@/components/copiloto/productos/precio";
import { AnalizarTest } from "@/components/copiloto/test/analizar";
import { Marketing } from "@/components/copiloto/marketing/marketing";
import { PlanCapital } from "@/components/copiloto/capital/plan";
import { Crecer } from "@/components/copiloto/capital/crecer";

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
  if (tab.slug === "test") return <AnalizarTest />;
  if (tab.slug === "marketing") return <Marketing />;
  if (tab.slug === "capital") return <PlanCapital />;
  if (tab.slug === "crecer") return <Crecer />;
  return <SeccionPendiente slug={tab.slug} />;
}
