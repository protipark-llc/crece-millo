import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { PremiumBadge, PremiumToolCard } from "@/components/community/community";

export const metadata: Metadata = { title: "Co-Piloto de Negocio · Comunidad" };

export default function CoPilotPage() {
  return (
    <>
      <nav aria-label="Ruta de navegación" className="text-sm text-muted">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/comunidad" className="hover:text-ink">
              Comunidad
            </Link>
          </li>
          <ChevronRight aria-hidden className="size-3.5" />
          <li>
            <Link href="/comunidad/emprendedores" className="hover:text-ink">
              Emprendedores
            </Link>
          </li>
          <ChevronRight aria-hidden className="size-3.5" />
          <li aria-current="page" className="text-ink-2">
            Co-Piloto de Negocio
          </li>
        </ol>
      </nav>
      <h1 className="t-page mt-2 flex flex-wrap items-center gap-3 text-ink">
        Co-Piloto de Negocio <PremiumBadge /> <Badge tone="info">Futuro</Badge>
      </h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        Una herramienta para probar un producto con números antes de invertir: precio recomendado, test de anuncios con veredicto (seguir, optimizar o parar) y plan de capital. Está en
        diseño y todavía no está disponible.
      </p>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card className="p-5 sm:p-6">
          <h2 className="t-section text-ink">Qué tendrá</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
            <li>¿Cuánto cobro? Precio recomendado con un rango saludable según tus costos.</li>
            <li>Test de anuncios: compara tu costo por compra con tu máximo y te da un veredicto escrito.</li>
            <li>Bitácora de pruebas y plan de capital para no arriesgar más de lo que puedes perder.</li>
          </ul>
          <p className="mt-4 text-sm text-muted">Herramienta educativa y de apoyo a decisiones. El dropshipping tiene riesgo: puedes perder lo que inviertas en producto y anuncios.</p>
        </Card>
        <PremiumToolCard />
      </div>
    </>
  );
}
