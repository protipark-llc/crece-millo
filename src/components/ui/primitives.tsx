import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

/**
 * Botón (entrega §3): alto 44 (md), 36 (sm, solo escritorio) o 52 (lg, acción principal en móvil);
 * radio 8; texto 14/600. Primario en sumi (brand); el bermellón (accent) se reserva para lo Premium,
 * los logros y la acción destacada de una tarjeta oscura.
 */
export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors duration-[var(--duration-fast)] disabled:cursor-not-allowed aria-busy:cursor-progress",
    size === "sm" && "h-9 px-3 text-sm",
    size === "md" && "h-11 px-4 text-sm",
    size === "lg" && "h-13 px-5 text-[15px]",
    variant === "primary" && "bg-brand text-brand-ink hover:bg-brand-hover active:bg-brand-pressed disabled:bg-surface-3 disabled:text-muted",
    variant === "secondary" && "border border-border-strong bg-surface text-ink hover:bg-surface-2 active:bg-surface-3 disabled:text-muted",
    variant === "ghost" && "text-ink-2 hover:bg-surface-2 hover:text-ink active:bg-surface-3 disabled:text-muted",
    variant === "danger" && "bg-neg text-white hover:opacity-90 disabled:bg-surface-3 disabled:text-muted",
    variant === "accent" && "bg-accent text-accent-ink hover:opacity-90 disabled:bg-surface-3 disabled:text-muted",
    extra,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

type CardTone = "default" | "featured" | "muted" | "dark";
const cardTone: Record<CardTone, string> = {
  default: "border border-border bg-surface",
  featured: "border-2 border-brand bg-surface",
  muted: "border border-border bg-surface-2",
  dark: "bg-nav-bg text-nav-ink-active",
};

/** Tarjeta (radio 12). "dark" (nav-bg) para «Tu siguiente paso» y la herramienta principal. */
export function Card({ className, children, tone = "default", ...rest }: ComponentProps<"section"> & { tone?: CardTone }) {
  return (
    <section className={cn("min-w-0 rounded-lg", cardTone[tone], className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, actions, id }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 id={id} className="text-base leading-[22px] font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="t-overline mb-2 text-muted">{eyebrow}</p>}
        <h1 className="t-page text-ink">{title}</h1>
        {description && <p className="mt-2 text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

type Tone = "neutral" | "brand" | "pos" | "neg" | "warn" | "info" | "accent";
const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  accent: "bg-accent text-accent-ink",
  brand: "bg-brand-soft text-brand",
  pos: "bg-pos-soft text-pos",
  neg: "bg-neg-soft text-neg",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center gap-1 rounded-sm px-2 text-xs font-semibold whitespace-nowrap", toneClass[tone], className)}>{children}</span>;
}

const alertIcon = { info: Info, warn: AlertTriangle, neg: OctagonAlert, pos: CheckCircle2 } as const;

/** Insignia PREMIUM (accent + accent-ink). */
export function PremiumBadge({ className }: { className?: string }) {
  return (
    <Badge tone="accent" className={cn("tracking-[0.06em]", className)}>
      PREMIUM
    </Badge>
  );
}

export function Alert({ tone = "info", title, children, className, action }: { tone?: "info" | "warn" | "neg" | "pos"; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const Icon = alertIcon[tone];
  return (
    <div role={tone === "neg" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg px-3.5 py-3 text-sm", toneClass[tone], className)}>
      <Icon aria-hidden className="mt-px size-[18px] shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn("text-ink-2", title ? "mt-0.5" : undefined)}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
  help,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "pos" | "neg" | "muted";
  help?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", className)}>
      <div className="flex items-center gap-1.5 text-[13px] text-muted">
        <span>{label}</span>
        {help && <InfoTip text={help} />}
      </div>
      <div className={cn("t-kpi mt-1", tone === "pos" && "text-pos", tone === "neg" && "text-neg", tone === "muted" && "text-muted", !tone && "text-ink")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Ayuda contextual accesible: visible con hover y con foco de teclado. */
export function InfoTip({ text, label = "Más información" }: { text: string; label?: string }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" className="inline-flex size-4 items-center justify-center rounded-full text-muted hover:text-ink" aria-label={`${label}: ${text}`}>
        <Info aria-hidden className="size-3.5" />
      </button>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-ink-2 shadow-lg group-focus-within:block group-hover:block">
        {text}
      </span>
    </span>
  );
}

/**
 * Ilustración «horizonte»: una línea y un sol en bermellón de marca (mark). Decorativa.
 */
export function Horizonte({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 64" aria-hidden className={cn("h-16 w-40", className)}>
      <path d="M64 44A16 16 0 0 1 96 44Z" fill="var(--mark)" />
      <path d="M8 44H152" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 54H120M64 61H96" stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Estado vacío: ilustración + título + una frase + una acción (nunca solo texto). */
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Horizonte className="mb-3" />
      {icon && <div className="sr-only">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Barra de progreso. La severidad la indica el color + el texto que la acompaña. */
export function Meter({
  value,
  max,
  tone = "brand",
  label,
  today,
  size = "md",
}: {
  value: number;
  max: number;
  tone?: "brand" | "warn" | "neg" | "pos" | "accent";
  label: string;
  /** Fracción del periodo transcurrida (0–1): dibuja la marca «hoy» de 2 px en tinta. */
  today?: number;
  size?: "sm" | "md" | "lg";
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const fill = { brand: "bg-brand", warn: "bg-warn", neg: "bg-neg", pos: "bg-pos", accent: "bg-accent" }[tone];
  const h = { sm: "h-1.5", md: "h-2", lg: "h-2.5" }[size];
  return (
    <div className="relative">
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} className={cn("w-full overflow-hidden rounded-full bg-surface-3", h)}>
        <div className={cn("h-full rounded-full transition-[width] duration-[var(--duration-base)]", fill)} style={{ width: `${pct * 100}%` }} />
      </div>
      {today !== undefined && today > 0 && today < 1 && (
        <span aria-hidden className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-ink" style={{ left: `${today * 100}%` }} />
      )}
    </div>
  );
}

export function Tabs({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <nav aria-label="Vistas" className="flex max-w-full gap-1 overflow-x-auto border-b border-border">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={i.key === current ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex h-11 shrink-0 items-center border-b-[3px] px-3 text-sm font-medium whitespace-nowrap transition-colors duration-[var(--duration-fast)]",
            i.key === current ? "border-brand text-ink" : "border-transparent text-ink-2 hover:text-ink",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
export const th = "border-b border-border px-4 py-2.5 text-left text-xs font-medium text-muted";
export const thNum = th.replace("text-left", "text-right");
export const td = "border-b border-border px-4 py-3 align-middle text-ink";
export const tdNum = td + " text-right tabular whitespace-nowrap";
