import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Route, Wallet } from "lucide-react";
import { loadForUser } from "@/server/action-utils";
import { getSettings } from "@/server/services/settings";
import { listProducts, listTests, productSummary, routeProgress } from "@/server/services/copilot";
import { routeStatus } from "@/lib/copilot/route";
import { formatters } from "@/server/format";
import { Card, Meter, buttonClass } from "@/components/ui/primitives";
import { AvatarStack, ChallengeCard, Composer, LiveEventCard, PinnedVideo, PostCard, PreviewNotice, RulesCard } from "@/components/community/community";
import { Crumbs, EntrepreneurTabs } from "@/components/copilot/nav";
import { VerdictBadge } from "@/components/copilot/verdict";
import { COMMUNITY_RULES, SAMPLE_COMMUNITY, SAMPLE_POSTS } from "@/lib/community/sample";

export const metadata: Metadata = { title: "Emprendedores · Comunidad" };

export default async function EntrepreneursPage() {
  const data = await loadForUser(async ({ tx, userId }) => {
    const settings = await getSettings(tx, userId);
    const [products, tests, done] = await Promise.all([listProducts(tx, userId), listTests(tx, userId), routeProgress(tx, userId)]);
    return { settings, products, tests, done };
  });
  const f = formatters(data.settings.currency, data.settings.locale);
  const summaries = data.products.map((p) => productSummary(p, data.tests));
  const active = summaries.find((s) => s.product.status === "ganador") ?? summaries.find((s) => s.product.status === "prueba") ?? summaries.find((s) => s.product.status !== "descartado") ?? null;
  const route = routeStatus(data.done);
  return (
    <>
      <Crumbs items={[{ href: "/comunidad", label: "Comunidad" }, { label: "Emprendedores" }]} />
      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="t-page text-ink">Emprendedores · Dropshipping</h1>
          <p className="mt-2 text-ink-2">Construye tu tienda acompañado: herramientas, una ruta clara y gente que va en lo mismo.</p>
        </div>
        <AvatarStack initials={SAMPLE_COMMUNITY.avatars} label={<>Comunidad en preparación</>} />
      </header>
      <EntrepreneurTabs current="muro" />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <PreviewNotice what="El muro de Emprendedores todavía no está abierto" />
          <Composer locked />
          <PinnedVideo />
          {SAMPLE_POSTS.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
        <aside className="space-y-4">
          <Card tone="dark" className="p-5">
            <p className="t-overline text-nav-accent">Tus herramientas</p>
            {active ? (
              <>
                <p className="mt-2 text-sm text-nav-ink">Producto activo</p>
                <p className="text-lg font-semibold text-nav-ink-active">{active.product.name}</p>
                <p className="mt-2 text-xs text-nav-ink">{active.usingRecommended ? "Precio recomendado" : "Tu precio"}</p>
                <p className="t-display text-nav-ink-active">{active.price ? f.money(active.price) : "—"}</p>
                {active.analysis.range && (
                  <p className="text-xs text-nav-ink">
                    Rango {f.money(active.analysis.range.low)} – {f.money(active.analysis.range.high)}
                  </p>
                )}
                {active.latest && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-nav-ink">
                    Último test: <VerdictBadge verdict={active.latest.result.verdict} />
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-nav-ink">Calcula tu primer producto: precio recomendado, CPA máximo y veredicto de tus pruebas.</p>
            )}
            <ul className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
              {[
                { href: "/comunidad/emprendedores/co-piloto", label: "Co-Piloto: tus productos", icon: Calculator },
                { href: "/comunidad/emprendedores/co-piloto#capital", label: "Plan de capital", icon: Wallet },
                { href: "/comunidad/emprendedores/ruta", label: "Ruta de dropshipping", icon: Route },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-10 items-center gap-2.5 rounded-md px-1 text-nav-ink-active hover:bg-white/5">
                    <l.icon aria-hidden className="size-4" /> {l.label} <ArrowRight aria-hidden className="ml-auto size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
            {!active && (
              <Link href="/comunidad/emprendedores/co-piloto/productos/nuevo" className={buttonClass("accent", "md", "mt-4 w-full")}>
                Calcular un producto
              </Link>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">Tu ruta de dropshipping</h2>
              <Link href="/comunidad/emprendedores/ruta" className="text-sm font-semibold text-ink hover:underline">
                Ver ruta
              </Link>
            </div>
            <p className="mt-1 text-sm text-ink-2 tabular">
              {route.done} de {route.total} pasos · fase {route.phase}
            </p>
            <div className="mt-3">
              <Meter value={route.done} max={route.total} tone="accent" label="Avance de la ruta de dropshipping" />
            </div>
            {route.next && <p className="mt-3 text-sm text-ink">Siguiente: {route.next.title}</p>}
          </Card>
          <LiveEventCard event={SAMPLE_COMMUNITY.event} />
          <ChallengeCard c={SAMPLE_COMMUNITY.challenge} />
          <RulesCard rules={COMMUNITY_RULES} />
        </aside>
      </div>
    </>
  );
}
