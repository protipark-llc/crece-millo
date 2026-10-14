"use client";

import Link from "next/link";
import { formatNum, parseNum, stepNum } from "@/lib/copiloto/numero";
import {
  useEffect,
  useId,
  useRef,
  useState as useStateCompat,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Minus,
  Plus,
  XCircle,
} from "lucide-react";
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

/**
 * Campo numérico práctico (es-CO): muestra «56.000» con miles, acepta «56.000» o «56000» al
 * escribir, y sube o baja con las flechas (Shift = ×10). Con `allowEmpty`, vaciarlo devuelve "".
 */
export function NumInput({
  id,
  value,
  onChange,
  step = 1,
  min,
  max,
  allowEmpty,
  suffix,
  placeholder,
  className,
  inputClassName,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: {
  id?: string;
  value: number | string | null | undefined;
  onChange: (v: number | "") => void;
  step?: number;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  suffix?: string;
  placeholder?: string;
  className?: string;
  /** Clases del campo en sí (className va al contenedor). */
  inputClassName?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const dec = step < 1 ? (String(step).split(".")[1] ?? "").length || 2 : 0;
  const decimals = dec > 0;
  const num =
    value === "" || value === null || value === undefined
      ? null
      : typeof value === "number"
        ? value
        : parseNum(String(value), true);
  const shown =
    num === null ? "" : formatNum(num, Math.max(dec, decimals ? 2 : 0));
  const [text, setText] = useStateCompat(shown);
  const [focused, setFocused] = useStateCompat(false);
  useEffect(() => {
    if (!focused) setText(shown);
  }, [shown, focused]);
  const commit = (n: number | "") => onChange(n);
  return (
    <span className={cn("relative block", className)}>
      <input
        id={id}
        type="text"
        role="spinbutton"
        inputMode={decimals ? "decimal" : "numeric"}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-valuenow={num ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        placeholder={placeholder}
        value={focused ? text : shown}
        onFocus={(e) => {
          setFocused(true);
          setText(shown);
          requestAnimationFrame(() => e.target.select());
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === "") {
            if (allowEmpty) commit("");
            return;
          }
          const n = parseNum(e.target.value, decimals);
          if (n !== null) commit(n);
        }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          const n = stepNum(
            num ?? 0,
            step,
            e.key === "ArrowUp" ? 1 : -1,
            e.shiftKey,
            min,
            max,
          );
          setText(formatNum(n, dec));
          commit(n);
        }}
        className={cn(
          fieldClass,
          "text-right tabular",
          suffix && "pr-8",
          inputClassName,
        )}
      />
      {suffix && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted"
        >
          {suffix}
        </span>
      )}
    </span>
  );
}

/** Número + control deslizante sincronizados (div.sl del original), con − / + para ajustes finos. */
export function NumberSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
  suffix,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const id = useId();
  const bump = (dir: 1 | -1) => onChange(stepNum(value, step, dir, false, min));
  const pct =
    max > min
      ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
      : 0;
  const btn =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-control-border bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-40";
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="mt-1">
        <span className="flex items-center gap-1">
          <button
            type="button"
            className={btn}
            aria-label={`Bajar ${label}`}
            disabled={value <= min}
            onClick={() => bump(-1)}
          >
            <Minus aria-hidden className="size-3.5" />
          </button>
          <NumInput
            id={id}
            value={value}
            step={step}
            min={min}
            suffix={suffix}
            onChange={(v) => onChange(v === "" ? min : v)}
            className="min-w-0 flex-1 [&_input]:h-9 [&_input]:px-2 [&_input]:text-sm"
          />
          <button
            type="button"
            className={btn}
            aria-label={`Subir ${label}`}
            onClick={() => bump(1)}
          >
            <Plus aria-hidden className="size-3.5" />
          </button>
        </span>
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
        style={{
          background: `linear-gradient(to right, var(--brand) ${pct}%, var(--surface-3) ${pct}%)`,
        }}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[var(--brand)] [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface [&::-moz-range-thumb]:bg-brand [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:shadow"
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Descarga un texto como archivo (con BOM para que Excel lea las tildes), como dl() del original. */
export function downloadText(name: string, text: string, type = "text/csv") {
  const blob = new Blob(["﻿" + text], { type: `${type};charset=utf-8` });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * En escritorio muestra el contenido tal cual. En móvil (menos de 1024 px) lo guarda detrás de un
 * botón con resumen y lo abre como hoja inferior, para que el resultado principal vaya primero
 * (especificación §7 · Móvil 390). Esc o «Cerrar» la cierran y el foco vuelve al botón.
 */
export function MobileSheet({
  title,
  summary,
  children,
  className,
}: {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useStateCompat(false);
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left lg:hidden"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">{title}</span>
          {summary && (
            <span className="block truncate text-xs text-muted">{summary}</span>
          )}
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
      </button>
      {open && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={close}
        />
      )}
      <div
        id={id}
        ref={panel}
        tabIndex={-1}
        role="group"
        aria-label={title}
        className={cn(
          "lg:static lg:z-auto lg:block lg:max-h-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none",
          open
            ? "fixed inset-x-0 bottom-0 z-50 block max-h-[88dvh] overflow-y-auto rounded-t-xl bg-bg p-3 pb-8 shadow-xl outline-none"
            : "hidden",
          className,
        )}
      >
        {open && (
          <div className="sticky -top-3 z-10 -mx-3 mb-2 flex items-center justify-between border-b border-border bg-bg px-4 py-2 lg:hidden">
            <span className="font-semibold text-ink">{title}</span>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold text-ink hover:bg-surface-2"
            >
              Cerrar
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
