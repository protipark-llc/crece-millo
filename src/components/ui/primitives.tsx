import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap",
    size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-brand text-brand-ink hover:bg-brand-hover",
    variant === "secondary" && "border border-border-strong bg-surface text-ink hover:bg-surface-2",
    variant === "ghost" && "text-ink-2 hover:bg-surface-2 hover:text-ink",
    variant === "danger" && "bg-neg text-white hover:opacity-90",
    extra,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-border bg-surface", className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, actions, id }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold text-ink">
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
        {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

type Tone = "neutral" | "brand" | "pos" | "neg" | "warn" | "info";
const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  brand: "bg-brand-soft text-brand",
  pos: "bg-pos-soft text-pos",
  neg: "bg-neg-soft text-neg",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", toneClass[tone], className)}>{children}</span>;
}

const alertIcon = { info: Info, warn: AlertTriangle, neg: OctagonAlert, pos: CheckCircle2 } as const;

export function Alert({ tone = "info", title, children, className, action }: { tone?: "info" | "warn" | "neg" | "pos"; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const Icon = alertIcon[tone];
  return (
    <div role={tone === "neg" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg px-4 py-3 text-sm", toneClass[tone], className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
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
    <div className={cn("rounded-xl border border-border bg-surface px-4 py-3.5", className)}>
      <div className="flex items-center gap-1.5 text-sm text-muted">
        <span>{label}</span>
        {help && <InfoTip text={help} />}
      </div>
      <div className={cn("mt-1 text-xl font-semibold tracking-tight", tone === "pos" && "text-pos", tone === "neg" && "text-neg", tone === "muted" && "text-muted", !tone && "text-ink")}>{value}</div>
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
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-ink-2 shadow-lg group-focus-within:block group-hover:block">
        {text}
      </span>
    </span>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 rounded-full bg-surface-2 p-3 text-muted">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Barra de progreso. La severidad la indica el color + el texto que la acompaña. */
export function Meter({ value, max, tone = "brand", label }: { value: number; max: number; tone?: "brand" | "warn" | "neg" | "pos"; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const fill = { brand: "bg-brand", warn: "bg-[var(--status-warning)]", neg: "bg-[var(--status-critical)]", pos: "bg-[var(--status-good)]" }[tone];
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
      <div className={cn("h-full rounded-full", fill)} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export function Tabs({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <nav aria-label="Vistas" className="inline-flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={i.key === current ? "page" : undefined}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium", i.key === current ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink")}
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
export const th = "border-b border-border px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted";
export const thNum = th.replace("text-left", "text-right");
export const td = "border-b border-border px-4 py-3 align-middle text-ink";
export const tdNum = td + " text-right tabular whitespace-nowrap";
