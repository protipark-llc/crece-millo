"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState as useStateCompat,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { Tone } from "@/lib/copiloto/engine";
import { tipFor } from "@/lib/copiloto/glosario";
import { InfoTip } from "@/components/ui/primitives";
import { inputClass } from "@/components/ui/form";
import { cn } from "@/components/ui/cn";

export const TONE_TEXT = {
  g: "text-pos",
  a: "text-warn",
  r: "text-neg",
  b: "text-info",
} as const;
export const TONE_SOFT = {
  g: "bg-pos-soft",
  a: "bg-warn-soft",
  r: "bg-neg-soft",
  b: "bg-info-soft",
} as const;
export const TONE_ICON = {
  g: CheckCircle2,
  a: AlertTriangle,
  r: XCircle,
  b: Info,
} as const;
/** Palabra que acompaña al color en los avisos (nunca solo color). */
export const TONE_WORD = {
  g: "Bien.",
  a: "Atención.",
  r: "Riesgo.",
  b: "Info.",
} as const;

/**
 * Tarjeta de indicador (kpi del original). Si el título coincide con un término del glosario,
 * muestra su ayuda «i». El tono va en el subtítulo con ícono.
 */
export function Kpi({
  t,
  v,
  s,
  tone,
  className,
}: {
  t: string;
  v: ReactNode;
  s?: ReactNode;
  tone?: Tone | "" | null;
  className?: string;
}) {
  const tip = tipFor(t);
  const Icon = tone ? TONE_ICON[tone] : null;
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-start gap-1.5 text-[13px] leading-tight text-muted">
        <span>{t}</span>
        {tip && <InfoTip text={tip.text} label={tip.term} />}
      </div>
      <div className="t-kpi mt-1 break-words text-ink tabular">{v}</div>
      {s !== undefined && s !== "" && (
        <div
          className={cn(
            "mt-0.5 flex items-start gap-1 text-xs",
            tone ? TONE_TEXT[tone] : "text-muted",
          )}
        >
          {Icon && <Icon aria-hidden className="mt-px size-3.5 shrink-0" />}
          <span>{s}</span>
        </div>
      )}
    </div>
  );
}

export function KpiGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Aviso con tono del original (g, a, r, b), ícono y texto. */
export function ToneAlert({
  tone,
  children,
  title,
  className,
}: {
  tone: Tone;
  children?: ReactNode;
  title?: ReactNode;
  className?: string;
}) {
  const Icon = TONE_ICON[tone];
  return (
    <div
      role={tone === "r" ? "alert" : undefined}
      className={cn(
        "flex gap-3 rounded-lg px-4 py-3 text-sm text-ink",
        TONE_SOFT[tone],
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-[18px] shrink-0", TONE_TEXT[tone])}
      />
      <div className="min-w-0">
        {title !== undefined ? (
          <strong className="font-semibold">{title} </strong>
        ) : (
          <span className="sr-only">{TONE_WORD[tone]} </span>
        )}
        {children}
      </div>
    </div>
  );
}

/** Control segmentado 1–5 (criterios de evaluación). */
export function Segmented({
  label,
  value,
  onChange,
  hint,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-2.5">
      <span id={id} className="min-w-0 text-sm text-ink">
        {label} {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}${n === 1 ? " · malo" : n === 3 ? " · regular" : n === 5 ? " · excelente" : ""}`}
            onClick={() => onChange(n)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                onChange(Math.min(5, value + 1));
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                onChange(Math.max(1, value - 1));
              }
            }}
            tabIndex={value === n ? 0 : -1}
            className={cn(
              "size-11 rounded-md text-sm font-semibold sm:size-9",
              value === n
                ? "bg-brand text-brand-ink"
                : "bg-surface-2 text-ink-2 hover:bg-surface-3",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Subpestañas por enlace (?vista=…) con aria-current. */
export function SubTabs({
  items,
  current,
  label,
}: {
  items: { href: string; label: string; key: string }[];
  current: string;
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1"
    >
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          scroll={false}
          aria-current={i.key === current ? "page" : undefined}
          className={cn(
            "inline-flex h-10 shrink-0 items-center rounded-md px-3 text-sm whitespace-nowrap",
            i.key === current
              ? "bg-surface font-semibold text-ink shadow-sm"
              : "text-ink-2 hover:text-ink",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Campo con etiqueta (el original guarda al escribir: no hay botón Guardar). */
export function LabeledField({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const fieldClass = inputClass;

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={cn("t-overline text-muted", className)}>{children}</h2>;
}

/**
 * Confirmación en un diálogo nativo (<dialog> con showModal: foco atrapado y Esc cierra).
 * Reemplaza el confirm() del original.
 */
export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel,
  onConfirm,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const id = useId();
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        className={className}
        onClick={() =>
          (document.getElementById(id) as HTMLDialogElement | null)?.showModal()
        }
      >
        {children}
      </button>
      <dialog
        id={id}
        aria-labelledby={`${id}-t`}
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-lg border border-border bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
      >
        <form method="dialog" className="p-5">
          <h2 id={`${id}-t`} className="text-lg font-semibold">
            {title}
          </h2>
          <div className="mt-2 text-sm text-ink-2">{description}</div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              value="cancel"
              className="inline-flex h-11 items-center rounded-md px-4 text-sm font-semibold text-ink hover:bg-surface-2"
            >
              Cancelar
            </button>
            <button
              value="ok"
              onClick={onConfirm}
              className="inline-flex h-11 items-center rounded-md bg-neg px-4 text-sm font-semibold text-white"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Aviso breve tras una acción (role=status). */
export function useToast() {
  const [msg, setMsg] = useStateCompat<string | null>(null);
  const show = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2600);
  };
  const node = (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-6"
    >
      {msg && (
        <span className="rounded-md bg-nav-bg px-4 py-2.5 text-sm text-nav-ink-active shadow-lg">
          {msg}
        </span>
      )}
    </div>
  );
  return { show, node };
}

/** Número + control deslizante sincronizados (div.sl del original). */
export function NumberSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const [text, setText] = useStateCompat(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="min-w-0 text-sm font-medium text-ink">
          {label}
        </label>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={text}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            setText(String(value));
          }}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value.replace(",", "."));
            if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
          }}
          className="h-10 w-28 shrink-0 rounded-md border border-control-border bg-surface px-2 text-right text-sm text-ink tabular focus:border-focus focus:ring-2 focus:ring-focus/30 focus:outline-none"
        />
      </div>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={display}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-6 w-full accent-[var(--brand)]"
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
