"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  CreditCard,
  FileBarChart,
  FlaskConical,
  Gauge,
  Home,
  Landmark,
  LayoutDashboard,
  Library,
  Loader2,
  MessagesSquare,
  MoreHorizontal,
  PieChart,
  Plus,
  Radio,
  Rocket,
  Route,
  Settings,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "../brand/logo";
import { ThemeCycleButton, ThemeSwitcher } from "../theme/theme-switcher";
import { MOBILE_PRIMARY, NAV, isActive } from "./nav-config";
import { cn } from "../ui/cn";

// Íconos de sección: se conservan en el rediseño (docs/ICONOS.md).
const ICONS: Record<string, LucideIcon> = {
  ArrowLeftRight,
  Building2,
  CreditCard,
  FileBarChart,
  FlaskConical,
  Gauge,
  Home,
  Landmark,
  LayoutDashboard,
  Library,
  MessagesSquare,
  PieChart,
  Radio,
  Rocket,
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
function PendingDot({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 aria-label="Cargando" className={cn("ml-auto size-3.5 animate-spin", className)} /> : null;
}

function PremiumTag() {
  return (
    <span className="ml-auto rounded-xs bg-accent px-1.5 py-px text-[10px] font-semibold tracking-[0.06em] text-accent-ink">PREMIUM</span>
  );
}

/** Lista completa de secciones. `tone="dark"` en la barra lateral (nav-bg); "light" en la hoja móvil. */
function NavLinks({ onNavigate, tone }: { onNavigate?: () => void; tone: "dark" | "light" }) {
  const pathname = usePathname();
  const dark = tone === "dark";
  return (
    <nav aria-label="Navegación principal" className="space-y-5">
      {NAV.map((g) => (
        <div key={g.label}>
          <p className={cn("t-overline mb-1 px-3", dark ? "text-nav-label" : "text-muted")}>{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(item, pathname);
              const Icon = ICONS[item.icon] ?? Home;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-[var(--duration-fast)]",
                      dark
                        ? active
                          ? "bg-nav-active-bg font-semibold text-nav-ink-active"
                          : "text-nav-ink hover:bg-white/5 hover:text-nav-ink-active"
                        : active
                          ? "bg-brand-soft font-semibold text-ink"
                          : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    <span className="min-w-0 truncate">{item.label}</span>
                    {item.premium && <PremiumTag />}
                    <PendingDot className={item.premium ? "ml-1" : undefined} />
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "·";
}

/** Hoja inferior móvil con el resto de secciones («Más»). Esc cierra; el foco queda dentro. */
function MoreSheet({ open, onClose, footer }: { open: boolean; onClose: () => void; footer: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Más secciones">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div ref={panel} className="sheet-enter absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-xl bg-surface shadow-lg">
        <div className="flex items-center justify-between px-4 pt-2">
          <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border-strong" />
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <ThemeSwitcher withLabels />
          <button type="button" onClick={onClose} aria-label="Cerrar" className="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-2">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks tone="light" onNavigate={onClose} />
        </div>
        <div className="border-t border-border p-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>
      </div>
    </div>
  );
}

export function Sidebar({ footer, mobileFooter, userName }: { footer: React.ReactNode; mobileFooter: React.ReactNode; userName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      {/* Escritorio: barra lateral oscura de 240 px */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-nav-bg lg:flex">
        <div className="px-5 pt-5 pb-6">
          <Link href="/universidad" className="inline-flex rounded-md" aria-label="Crece Millo · Inicio">
            <Logo tone="oscuro" height={26} decorative />
          </Link>
        </div>
        <div className="nav-scroll flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks tone="dark" />
        </div>
        <div className="border-t border-white/10 p-3">{footer}</div>
      </aside>

      {/* Móvil: barra superior */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-3 backdrop-blur lg:hidden">
        <Link href="/universidad" className="inline-flex rounded-md px-1" aria-label="Crece Millo · Inicio">
          <Logo tone="auto" height={22} decorative />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeCycleButton />
          <Link
            href="/configuracion"
            aria-label={`Tu cuenta: ${userName}`}
            className="inline-flex size-11 items-center justify-center rounded-full"
          >
            <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-ink">
              {initials(userName)}
            </span>
          </Link>
        </div>
      </header>

      {/* Móvil: navegación inferior con botón central de registro rápido */}
      <nav aria-label="Accesos rápidos" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto grid h-18 max-w-md grid-cols-5 items-center">
          {MOBILE_PRIMARY.slice(0, 2).map((item) => (
            <BottomItem key={item.href} item={item} pathname={pathname} />
          ))}
          <li className="flex justify-center">
            <Link
              href="/universidad/finanzas/movimientos/nuevo"
              aria-label="Registrar movimiento"
              className="-mt-7 inline-flex size-14 items-center justify-center rounded-full border-4 border-bg bg-brand text-brand-ink shadow-md hover:bg-brand-hover"
            >
              <Plus aria-hidden className="size-6" />
            </Link>
          </li>
          {MOBILE_PRIMARY.slice(2).map((item) => (
            <BottomItem key={item.href} item={item} pathname={pathname} />
          ))}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-haspopup="dialog"
              className="flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-ink-2"
            >
              <MoreHorizontal aria-hidden className="size-5" />
              Más
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet open={open} onClose={() => setOpen(false)} footer={mobileFooter} />
    </>
  );
}

function BottomItem({ item, pathname }: { item: (typeof MOBILE_PRIMARY)[number]; pathname: string }) {
  const active = isActive(item, pathname);
  const Icon = ICONS[item.icon] ?? Home;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-ink" : "text-ink-2")}
      >
        <Icon aria-hidden className={cn("size-5", active && "text-accent")} />
        <span className={cn(active && "font-semibold")}>{item.label}</span>
      </Link>
    </li>
  );
}
