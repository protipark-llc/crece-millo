import { notFound } from "next/navigation";
import { tabBySlug } from "@/lib/copiloto/nav";
import { ProductosPreview, SeccionPendiente } from "@/components/copiloto/pendiente";

export default async function CopilotoSeccion({ params }: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await params;
  const tab = tabBySlug(seccion);
  if (!tab) notFound();
  if (tab.slug === "productos") return <ProductosPreview />;
  return <SeccionPendiente slug={tab.slug} />;
}
