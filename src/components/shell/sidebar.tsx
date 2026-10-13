"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  CreditCard,
  FileBarChart,
  FlaskConical,
  Home,
  Landmark,
  LayoutDashboard,
  Library,
  Loader2,
  Menu,
  PieChart,
  Route,
  Settings,
  Sprout,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { NAV } from "./nav-config";
import { cn } from "../ui/cn";

const ICONS: Record<string, LucideIcon> = {
  ArrowLeftRight,
  Building2,
  CreditCard,
  FileBarChart,
  FlaskConical,
  Home,
  Landmark,
  LayoutDashboard,
  Library,
  PieChart,
  Route,
  Settings,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Waves,
};

/** Indicador de carga en el enlace pulsado mientras llega la nueva página. */
function PendingDot() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 aria-label="Cargando" className="ml-auto size-3.5 animate-spin text-muted" /> : null;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal" className="space-y-6">
      {NAV.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = ICONS[item.icon] ?? Home;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                      active ? "bg-brand-soft font-medium text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    {item.label}
                    <PendingDot />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/universidad" className="flex items-center gap-2 px-3 font-semibold text-ink">
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand text-brand-ink">
        <Sprout aria-hidden className="size-4.5" />
      </span>
      <span>
        Crece <span className="font-normal text-muted">· Universidad</span>
      </span>
    </Link>
  );
}

export function Sidebar({ footer }: { footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="py-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks />
        </div>
        <div className="border-t border-border p-3">{footer}</div>
      </aside>
      {/* Móvil */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} className="rounded-lg p-2 text-ink hover:bg-surface-2">
          <Menu aria-hidden className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-surface shadow-2xl">
            <div className="flex items-center justify-between py-4 pr-3">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" className="rounded-lg p-2 hover:bg-surface-2">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-border p-3">{footer}</div>
          </div>
        </div>
      )}
    </>
  );
}
