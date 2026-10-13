"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/server/action-utils";
import { Alert, buttonClass } from "./primitives";
import { cn } from "./cn";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;
const FormCtx = createContext<ActionState>({ ok: false });
const PendingCtx = createContext(false);

/**
 * Formulario conectado a una Server Action:
 * - muestra errores por campo y generales;
 * - agrega una clave de idempotencia oculta (evita duplicados por doble envío);
 * - opcionalmente se reinicia o redirige tras un éxito.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  successMessage,
  idempotent = false,
  onSuccessHref,
  ...rest
}: Omit<ComponentProps<"form">, "action"> & {
  action: Action;
  resetOnSuccess?: boolean;
  successMessage?: string;
  idempotent?: boolean;
  onSuccessHref?: string;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  // «Guardar y otro»: un botón con data-another="true" reinicia el formulario en vez de redirigir.
  const another = useRef(false);
  const router = useRouter();
  const [key, setKey] = useState<string>("");
  useEffect(() => {
    setKey(crypto.randomUUID());
  }, [state.nonce]);
  useEffect(() => {
    if (!state.ok) return;
    if (another.current) {
      another.current = false;
      ref.current?.reset();
      ref.current?.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
      return;
    }
    if (resetOnSuccess) ref.current?.reset();
    const href = state.redirectTo ?? onSuccessHref;
    if (href) router.push(href);
  }, [state, resetOnSuccess, onSuccessHref, router]);
  return (
    <FormCtx.Provider value={state}>
      <PendingCtx.Provider value={pending}>
        {/* Envío manual: React 19 reinicia los formularios tras cada acción, incluso con errores,
            y la persona perdería lo escrito. Solo se reinicia tras un éxito (resetOnSuccess). */}
        <form
          ref={ref}
          onSubmit={(e) => {
            e.preventDefault();
            if (pending) return;
            another.current = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("data-another") === "true";
            const fd = new FormData(e.currentTarget);
            startTransition(() => formAction(fd));
          }}
          className={className}
          noValidate
          aria-busy={pending}
          {...rest}
        >
          {idempotent && <input type="hidden" name="idempotencyKey" value={key} />}
          {children}
          <FormMessage successMessage={successMessage} />
        </form>
      </PendingCtx.Provider>
    </FormCtx.Provider>
  );
}

function FormMessage({ successMessage }: { successMessage?: string }) {
  const s = useContext(FormCtx);
  if (s.error) return <Alert tone="neg" className="mt-4">{s.error}</Alert>;
  if (s.ok && (s.message || successMessage || s.warning)) {
    return (
      <div className="mt-4 space-y-2">
        {(s.message || successMessage) && <Alert tone="pos">{s.message ?? successMessage}</Alert>}
        {s.warning && <Alert tone="warn">{s.warning}</Alert>}
      </div>
    );
  }
  return null;
}

export function useFieldError(name: string) {
  return useContext(FormCtx).fieldErrors?.[name];
}

export function Field({ label, name, hint, children, className, optional }: { label: string; name: string; hint?: ReactNode; children: (p: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode; className?: string; optional?: boolean }) {
  const id = useId();
  const error = useFieldError(name);
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label} {optional && <span className="font-normal text-muted">(opcional)</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-xs font-medium text-neg">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-md border border-control-border bg-surface px-3 text-[15px] text-ink placeholder:text-muted transition-colors duration-[var(--duration-fast)] aria-[invalid=true]:border-2 aria-[invalid=true]:border-neg disabled:bg-surface-2 disabled:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/30";

export function TextField({ label, name, hint, optional, className, ...input }: { label: string; name: string; hint?: ReactNode; optional?: boolean } & ComponentProps<"input">) {
  return (
    <Field label={label} name={name} hint={hint} optional={optional} className={className}>
      {(p) => <input name={name} className={inputClass} {...p} {...input} />}
    </Field>
  );
}

export function MoneyField({ label, name, currency, hint, optional, className, ...input }: { label: string; name: string; currency: string; hint?: ReactNode; optional?: boolean } & ComponentProps<"input">) {
  return (
    <Field label={label} name={name} hint={hint} optional={optional} className={className}>
      {(p) => (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">{currency}</span>
          <input name={name} inputMode="decimal" autoComplete="off" placeholder={optional ? "" : "0"} className={cn(inputClass, "h-12 pl-12 text-right tabular sm:h-11")} {...p} {...input} />
        </div>
      )}
    </Field>
  );
}

export function SelectField({ label, name, hint, optional, className, children, ...select }: { label: string; name: string; hint?: ReactNode; optional?: boolean } & ComponentProps<"select">) {
  return (
    <Field label={label} name={name} hint={hint} optional={optional} className={className}>
      {(p) => (
        <select name={name} className={inputClass} {...p} {...select}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function TextareaField({ label, name, hint, optional, className, ...rest }: { label: string; name: string; hint?: ReactNode; optional?: boolean } & ComponentProps<"textarea">) {
  return (
    <Field label={label} name={name} hint={hint} optional={optional} className={className}>
      {(p) => <textarea name={name} rows={3} className={cn(inputClass, "h-auto py-2")} {...p} {...rest} />}
    </Field>
  );
}

export function CheckboxField({ label, name, hint, defaultChecked }: { label: string; name: string; hint?: ReactNode; defaultChecked?: boolean }) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <div className="flex items-start gap-2.5">
      <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" aria-invalid={error ? true : undefined} />
      <div>
        <label htmlFor={id} className="text-sm text-ink">
          {label}
        </label>
        {hint && <p className="text-xs text-muted">{hint}</p>}
        {error && <p className="text-xs font-medium text-neg">{error}</p>}
      </div>
    </div>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size,
  className,
  another = false,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Tras guardar, deja el formulario listo para otro registro (no redirige). */
  another?: boolean;
}) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingCtx);
  const pending = status.pending || ctxPending;
  return (
    <button type="submit" disabled={pending} aria-busy={pending} data-another={another ? "true" : undefined} className={buttonClass(variant, size, className)}>
      {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/**
 * Botón que pide confirmación (diálogo nativo accesible) antes de ejecutar una acción
 * importante, como eliminar. Los campos ocultos viajan a la Server Action.
 */
export function ConfirmAction({
  action,
  fields,
  label,
  title,
  description,
  confirmLabel = "Confirmar",
  variant = "ghost",
  size = "sm",
  icon,
  danger = true,
}: {
  action: Action;
  fields: Record<string, string>;
  label: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  icon?: ReactNode;
  danger?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(action, { ok: false });
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      dialog.current?.close();
      if (state.redirectTo) router.push(state.redirectTo);
      else router.refresh();
    }
  }, [state, router]);
  return (
    <>
      <button type="button" className={buttonClass(variant, size, danger && variant === "ghost" ? "text-neg hover:text-neg" : undefined)} onClick={() => dialog.current?.showModal()}>
        {icon}
        {label}
      </button>
      <dialog ref={dialog} className="m-auto w-[min(92vw,440px)] rounded-xl border border-border bg-surface p-0 text-ink shadow-lg backdrop:bg-overlay">
        <form action={formAction} className="p-6">
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <h2 className="t-section">{title}</h2>
          <div className="mt-2 text-sm text-ink-2">{description}</div>
          {state.error && <Alert tone="neg" className="mt-3">{state.error}</Alert>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" autoFocus className={buttonClass("secondary", "md")} onClick={() => dialog.current?.close()}>
              Cancelar
            </button>
            <SubmitButton variant={danger ? "danger" : "primary"}>{confirmLabel}</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Acción de un clic (sin confirmación) para operaciones reversibles: marcar pagado, conciliar, etc. */
export function InlineAction({ action, fields, children, title, className }: { action: Action; fields: Record<string, string>; children: ReactNode; title?: string; className?: string }) {
  const [state, formAction] = useActionState(action, { ok: false });
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={formAction} className="inline-flex flex-col items-end">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <InlineSubmit title={title} className={className}>
        {children}
      </InlineSubmit>
      {state.error && (
        <span role="alert" className="mt-1 max-w-56 text-right text-xs text-neg">
          {state.error}
        </span>
      )}
    </form>
  );
}

function InlineSubmit({ children, title, className }: { children: ReactNode; title?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} title={title} className={cn("inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-50", className)}>
      {pending ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
      {children}
    </button>
  );
}
