import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { AvatarStack, ChallengeCard, Composer, LiveEventCard, PinnedVideo, PostCard, PremiumBadge, PremiumToolCard, RulesCard } from "@/components/community/community";
import { COMMUNITY_RULES, SAMPLE_COMMUNITY, SAMPLE_POSTS } from "@/lib/community/sample";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Emprendedores · Comunidad" };

const TABS = ["Muro", "Ruta", "En vivo", "Retos", "Miembros"];

export default function EntrepreneursPage() {
  const { route } = SAMPLE_COMMUNITY;
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
          <li aria-current="page" className="text-ink-2">
            Emprendedores
          </li>
        </ol>
      </nav>
      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="t-page flex flex-wrap items-center gap-3 text-ink">
            Emprendedores · Dropshipping <PremiumBadge />
          </h1>
          <p className="mt-2 text-ink-2">Construye tu tienda acompañado: herramientas, una ruta clara y gente que va en lo mismo.</p>
        </div>
        <AvatarStack
          initials={SAMPLE_COMMUNITY.avatars}
          label={
            <>
              <strong className="font-semibold text-ink">{SAMPLE_COMMUNITY.members.toLocaleString("es-CO")}</strong> miembros · <strong className="font-semibold text-ink">{SAMPLE_COMMUNITY.activeToday}</strong> activos hoy
            </>
          }
        />
      </header>
      <nav aria-label="Secciones de Emprendedores" className="mt-4 mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t, i) => (
          <span
            key={t}
            aria-current={i === 0 ? "page" : undefined}
            aria-disabled={i === 0 ? undefined : true}
            title={i === 0 ? undefined : "Próximamente"}
            className={cn("-mb-px inline-flex h-11 shrink-0 items-center border-b-[3px] px-3 text-sm font-medium", i === 0 ? "border-accent text-ink" : "border-transparent text-muted")}
          >
            {t}
          </span>
        ))}
      </nav>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <Composer locked />
          <PinnedVideo />
          {SAMPLE_POSTS.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
        <aside className="space-y-4">
          <PremiumToolCard />
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Tu ruta de dropshipping</h2>
            <p className="mt-1 text-sm text-ink-2">
              {route.done} de {route.total} pasos · fase {route.phase}
            </p>
            <ol aria-hidden className="mt-3 grid grid-cols-6 gap-1">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className={cn("h-1.5 rounded-full", i < route.phase - 1 ? "bg-ink" : i === route.phase - 1 ? "bg-accent" : "bg-surface-3")} />
              ))}
            </ol>
          </Card>
          <LiveEventCard event={SAMPLE_COMMUNITY.event} />
          <ChallengeCard c={SAMPLE_COMMUNITY.challenge} />
          <RulesCard rules={COMMUNITY_RULES} />
        </aside>
      </div>
    </>
  );
}
