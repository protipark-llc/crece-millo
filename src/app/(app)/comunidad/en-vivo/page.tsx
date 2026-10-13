import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/primitives";
import { LiveEventCard } from "@/components/community/community";
import { SAMPLE_COMMUNITY } from "@/lib/community/sample";

export const metadata: Metadata = { title: "En vivo · Comunidad" };

export default function LivePage() {
  return (
    <>
      <PageHeader eyebrow="Comunidad" title="En vivo" description="Sesiones en directo para resolver dudas y revisar avances. Cada sesión queda grabada, con subtítulos y transcripción." />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="t-section text-ink">Cómo funcionarán</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
            <li>Te inscribes y recibes un recordatorio antes de empezar.</li>
            <li>Puedes enviar tu caso (por ejemplo, tu tienda) para que lo revisemos en directo.</li>
            <li>Las grabaciones quedan disponibles con subtítulos y transcripción.</li>
          </ul>
          <p className="mt-4 text-sm text-muted">Pendiente: elegir la plataforma de video y la agenda real.</p>
        </Card>
        <LiveEventCard event={SAMPLE_COMMUNITY.event} />
      </div>
    </>
  );
}
