"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { AlertTriangle, Check, ChevronRight, Loader2 } from "lucide-react";
import { E } from "@/lib/copiloto/engine";
import { TABS, tabBySlug } from "@/lib/copiloto/nav";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "./store";

const SEGMENT_TONE = (i: number) => (i <= 3 ? "bg-pos" : i <= 7 ? "bg-warn" : "bg-neg");

/** Riesgo 1–10: 10 segmentos con «5 · Normal». Es un control deslizante nativo (teclado y lector de pantalla). */
function RiskControl() {
  const { S, setSettings } = useCopiloto();
  const id = useId();
  const rp = E.riskProfile(S.risk);
  return (
    <div className="relative flex h-11 items-center gap-2 rounded-md bg-surface-2 px-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
      <label htmlFor={id} className="text-xs text-muted">
        Riesgo
      </label>
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, k) => k + 1).map((i) => (
          <span key={i} className={cn("h-4 w-[7px] rounded-[2px]", i <= S.risk ? SEGMENT_TONE(i) : "bg-surface-3")} />
        ))}
      </span>
      <span className="text-xs font-semibold text-ink tabular">
        {S.risk} · {rp.label}
      </span>
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        step={1}
        value={S.risk}
        aria-valuetext={`${S.risk} de 10, ${rp.label}`}
        onChange={(e) => setSettings({ risk: Number(e.target.value) })}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

function SaveIndicator() {
  const { status, error, retry, demo } = useCopiloto();
  if (demo) return <span className="text-xs font-medium text-info">Modo ejemplo · no se guarda</span>;
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-muted">
      {status === "saving" && (
        <>
          <Loader2 aria-hidden className="size-3.5 motion-safe:animate-spin" /> Guardando…
        </>
      )}
      {status === "saved" && (
        <>
          <Check aria-hidden className="size-3.5 text-pos" /> Guardado en tu cuenta
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle aria-hidden className="size-3.5 text-neg" />
          <span className="text-neg">{error ?? "No se pudo guardar"}</span>
          <button type="button" onClick={retry} className="font-semibold text-ink underline">
            Reintentar
          </button>
        </>
      )}
    </span>
  );
}

function TrmField() {
  const { S, setSettings } = useCopiloto();
  const [v, setV] = useState(String(S.trm));
  const [editing, setEditing] = useState(false);
  const id = useId();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <label htmlFor={id}>TRM</label>
      <input
        id={id}
        inputMode="decimal"
        value={editing ? v : S.trm.toLocaleString("es-CO")}
        onFocus={() => {
          setV(String(S.trm));
          setEditing(true);
        }}
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          setV(e.target.value);
          const n = Number(e.target.value.replace(/\./g, "").replace(",", "."));
          if (Number.isFinite(n) && n > 0) setSettings({ trm: n });
        }}
        className="h-9 w-[72px] rounded-md border border-control-border bg-surface px-2 text-right text-sm text-ink tabular"
      />
    </span>
  );
}

export function CopilotoHeader() {
  const { S, setSettings } = useCopiloto();
  const pathname = usePathname();
  const current = tabBySlug(pathname.split("/")[4] ?? "")?.slug ?? "ruta";
  const selectId = useId();
  return (
    <header className="rounded-lg border border-border bg-surface px-4 pt-3 sm:px-5 lg:pt-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-0">
          <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-xs text-muted">
            <Link href="/comunidad" className="hover:text-ink">
              Comunidad
            </Link>
            <ChevronRight aria-hidden className="size-3" />
            <Link href="/comunidad/emprendedores" className="hover:text-ink">
              Emprendedores
            </Link>
          </nav>
          <h1 className="t-section mt-0.5 text-ink">Co-Piloto de Negocio</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:ml-auto">
          <label htmlFor={selectId} className="sr-only">
            Producto activo
          </label>
          <select
            id={selectId}
            value={S.active}
            onChange={(e) => setSettings({ active: e.target.value })}
            className="h-11 w-full truncate rounded-md border border-control-border bg-surface px-3 text-sm font-medium text-ink sm:w-auto sm:max-w-[260px]"
          >
            {S.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <RiskControl />
          <div role="group" aria-label="Moneda" className="flex h-11 overflow-hidden rounded-md border border-control-border">
            {(["COP", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={S.cur === c}
                onClick={() => setSettings({ cur: c })}
                className={cn("min-w-11 px-2.5 text-xs font-semibold", S.cur === c ? "bg-brand text-brand-ink" : "bg-surface text-muted hover:text-ink")}
              >
                {c}
              </button>
            ))}
          </div>
          <TrmField />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-3">
        <nav aria-label="Secciones del Co-Piloto" className="-mb-px flex min-w-0 basis-full gap-0.5 overflow-x-auto md:basis-auto">
          {TABS.map((t) => (
            <Link
              key={t.slug}
              href={`/comunidad/emprendedores/copiloto/${t.slug}`}
              aria-current={t.slug === current ? "page" : undefined}
              onClick={() => setSettings({ tab: t.code })}
              className={cn(
                "inline-flex h-11 shrink-0 items-center border-b-[3px] px-3 text-sm whitespace-nowrap",
                t.slug === current ? "border-brand font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <span className="pb-1.5 md:pb-3">
          <SaveIndicator />
        </span>
      </div>
    </header>
  );
}
