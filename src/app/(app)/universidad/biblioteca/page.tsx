import type { Metadata } from "next";
import Link from "next/link";
import { LEARNING_AREAS, COURSES } from "@/lib/education/catalog";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { AreaIcon } from "@/components/education/area-icon";

export const metadata: Metadata = { title: "Biblioteca de módulos" };

export default function LibraryPage() {
  return (
    <>
      <PageHeader title="Biblioteca de módulos" description="Todas las áreas de la universidad. Las marcadas como próximamente aún no tienen contenido publicado." />
      <div className="grid gap-4 md:grid-cols-2">
        {LEARNING_AREAS.map((a) => {
          const courses = COURSES.filter((c) => a.courseSlugs.includes(c.slug));
          return (
            <Card key={a.slug} className="p-5">
              <div className="flex items-start gap-3">
                <span className={`rounded-lg p-2 ${a.status === "available" ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted"}`}>
                  <AreaIcon name={a.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {a.name} {a.status === "coming_soon" ? <Badge>Próximamente</Badge> : <Badge tone="pos">Disponible</Badge>}
                  </p>
                  <p className="mt-1 text-sm text-ink-2">{a.description}</p>
                  {courses.map((c) => (
                    <Link key={c.slug} href="/universidad/rutas" className="mt-3 block rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2">
                      <span className="font-medium text-ink">{c.title}</span>
                      <span className="block text-xs text-muted">
                        {c.modules.length} niveles · {c.modules.reduce((s, m) => s + m.lessons.length, 0)} lecciones
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
