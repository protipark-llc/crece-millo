import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, FlaskConical, Route, Wallet } from "lucide-react";
import { loadForUser } from "@/server/action-utils";
import { loadState } from "@/server/services/copiloto";
import { E } from "@/lib/copiloto/engine";
import { activeProduct, verdictTone } from "@/lib/copiloto/logic";
import { formatMoney } from "@/lib/copiloto/format";
import { copilotoHref } from "@/lib/copiloto/nav";
import { Card, buttonClass } from "@/components/ui/primitives";
import { ToneBadge } from "@/components/copiloto/tone";
import { AvatarStack, ChallengeCard, Composer, LiveEventCard, PinnedVideo, PostCard, PreviewNotice, RulesCard } from "@/components/community/community";
import { Crumbs, EntrepreneurTabs } from "@/components/copilot/nav";
import { COMMUNITY_RULES, SAMPLE_COMMUNITY, SAMPLE_POSTS } from "@/lib/community/sample";

export const metadata: Metadata = { title: "Emprendedores · Comunidad" };

export default async function EntrepreneursPage() {
  const S = await loadForUser(({ tx, userId, today }) => loadState(tx, userId, today));
  const p = activeProduct(S);
  const g = E.gate(p, S.risk);
  const last = S.tests.find((t) => t.productId === p.id) ?? null;
  const money = (n: number) => formatMoney(n, { cur: S.cur, trm: S.trm });
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
            <p className="mt-2 text-sm text-nav-ink">Producto activo</p>
            <p className="text-lg font-semibold text-nav-ink-active">{p.nombre}</p>
            <p className="mt-2 text-xs text-nav-ink">Precio de venta</p>
            <p className="t-display text-nav-ink-active">{money(p.precio)}</p>
            <p className="text-xs text-nav-ink">
              CPA objetivo {money(g.cpaObj)} · {g.pass ? "pasa la validación" : "no pasa la validación"}
            </p>
            {last && (
              <p className="mt-2 text-sm text-nav-ink">
                <ToneBadge tone={verdictTone(last.verdict)}>Último test: {last.verdict}</ToneBadge>
              </p>
            )}
            <ul className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
              {[
                { href: copilotoHref("productos"), label: "Co-Piloto: tus productos", icon: Calculator },
                { href: copilotoHref("test"), label: "Analizar un test", icon: FlaskConical },
                { href: copilotoHref("capital"), label: "Planificar capital", icon: Wallet },
                { href: copilotoHref("ruta"), label: "Ruta de dropshipping", icon: Route },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-10 items-center gap-2.5 rounded-md px-1 text-nav-ink-active hover:bg-white/5">
                    <l.icon aria-hidden className="size-4" /> {l.label} <ArrowRight aria-hidden className="ml-auto size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/comunidad/emprendedores/copiloto" className={buttonClass("accent", "md", "mt-4 w-full")}>
              Abrir Co-Piloto
            </Link>
          </Card>
          <LiveEventCard event={SAMPLE_COMMUNITY.event} />
          <ChallengeCard c={SAMPLE_COMMUNITY.challenge} />
          <RulesCard rules={COMMUNITY_RULES} />
        </aside>
      </div>
    </>
  );
}
