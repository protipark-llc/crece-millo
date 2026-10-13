"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Coins,
  Film,
  Gift,
  OctagonX,
  Rocket,
  Search,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { coach, type CoachIcon } from "@/lib/copiloto/logic";
import { copilotoHref, tabByCode } from "@/lib/copiloto/nav";
import { buttonClass } from "@/components/ui/primitives";
import { useCopiloto } from "./store";

const ICON: Record<CoachIcon, LucideIcon> = {
  zap: Zap,
  search: Search,
  calculator: Calculator,
  coins: Coins,
  gift: Gift,
  film: Film,
  octagon: OctagonX,
  rocket: Rocket,
  trending: TrendingUp,
};

/** «Tu siguiente paso»: siempre visible debajo del encabezado (renderCoach, L1055). */
export function CoachBar() {
  const api = useCopiloto();
  const router = useRouter();
  const step = coach(api.S, api.fmt.money);
  const Icon = ICON[step.icon];
  const a = step.action;
  const href = !a
    ? null
    : a.kind === "alta"
      ? `${copilotoHref("productos")}?alta=1`
      : copilotoHref(a.tab, a.vista);
  const onGo = () => {
    if (!a || a.kind !== "go") return;
    const patch: Parameters<typeof api.setSettings>[0] = {
      tab: tabByCode(a.tab).code,
    };
    if (a.activate) patch.active = a.activate;
    if (a.tab === "producto" && a.vista) patch.ptab = a.vista;
    api.setSettings(patch);
    if (a.tab === "marketing" && a.vista) {
      const mk = api.S.mk[api.S.active] ?? { tab: "ofertas", ang: 0, off: {} };
      api.setProductState(api.S.active, "mk", { ...mk, tab: a.vista });
    }
  };
  return (
    <section
      aria-labelledby="coach-t"
      className="mt-5 flex flex-col gap-3 rounded-lg bg-nav-bg p-4 text-nav-ink sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <span
        aria-hidden
        className="hidden size-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-nav-ink-active sm:inline-flex"
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="coach-t" className="t-overline text-nav-accent">
          Tu siguiente paso
        </h2>
        <p className="mt-0.5 text-[15px] leading-6 text-nav-ink-active">
          {step.text.map((s, i) =>
            s.b ? (
              <strong key={i} className="font-semibold">
                {s.t}
              </strong>
            ) : (
              <span key={i}>{s.t}</span>
            ),
          )}
        </p>
      </div>
      {href && a && (
        <Link
          href={href}
          onClick={(e) => {
            if (a.kind === "go" && a.activate) {
              e.preventDefault();
              onGo();
              router.push(href);
              return;
            }
            onGo();
          }}
          className={buttonClass(
            "accent",
            "md",
            "shrink-0 self-start sm:self-auto",
          )}
        >
          {a.label}
        </Link>
      )}
    </section>
  );
}

export function CopilotoFooter() {
  return (
    <p className="mt-10 border-t border-border pt-4 text-xs leading-relaxed text-muted">
      Herramienta educativa y de apoyo a decisiones. No es asesoría financiera.
      El dropshipping tiene riesgo: puedes perder lo que inviertas en producto y
      anuncios. Solo invierte capital que puedas perder.
    </p>
  );
}
