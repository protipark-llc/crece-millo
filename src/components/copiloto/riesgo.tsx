"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { E } from "@/lib/copiloto/engine";
import { activeProduct } from "@/lib/copiloto/logic";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "./store";
import { ToneBadge } from "./tone";
import { TONE_TEXT } from "./ui";

const zone = (i: number) => (i <= 3 ? "bg-pos" : i <= 7 ? "bg-warn" : "bg-neg");
const clamp = (v: number) => Math.max(1, Math.min(10, Math.round(v)));
export const RISK_PRESETS = [
  {
    v: 2,
    label: "Pasivo",
    d: "Más margen y holgura; corta rápido lo que no vende.",
  },
  { v: 5, label: "Normal", d: "Equilibrio entre seguridad y crecimiento." },
  { v: 9, label: "Agresivo", d: "Acepta menos margen para crecer más rápido." },
] as const;

/** Un valor que se ilumina un instante cuando cambia (para ver qué movió el riesgo). */
function Live({ v, className }: { v: string; className?: string }) {
  return (
    <span key={v} className={cn("cp-flash rounded-sm px-1 tabular", className)}>
      {v}
    </span>
  );
}

/**
 * Riesgo 1–10 de manejo directo: toca o arrastra la barra, usa − / +, o las flechas del teclado.
 * «Qué cambia» abre un panel con lo que el riesgo mueve en el producto activo, en vivo.
 */
export function RiskControl() {
  const { S, fmt, setSettings } = useCopiloto();
  const labelId = useId();
  const panelId = useId();
  const track = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const risk = S.risk;
  const rp = E.riskProfile(risk);
  const set = (v: number) => {
    const n = clamp(v);
    if (n !== risk) setSettings({ risk: n });
  };
  const at = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return clamp(((clientX - r.left) / r.width) * 10 + 0.5);
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    set(at(e.clientX));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const v = at(e.clientX);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) set(v);
    else setHover(v);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    const d =
      k === "ArrowRight" || k === "ArrowUp"
        ? 1
        : k === "ArrowLeft" || k === "ArrowDown"
          ? -1
          : k === "PageUp"
            ? 3
            : k === "PageDown"
              ? -3
              : 0;
    if (d) set(risk + d);
    else if (k === "Home") set(1);
    else if (k === "End") set(10);
    else return;
    e.preventDefault();
  };

  // Cerrar el panel con Esc o al tocar fuera.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node))
        setOpen(false);
    };
    const onEsc = (e: globalThis.KeyboardEvent) =>
      e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const btn =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-surface-3 hover:text-ink disabled:opacity-40";
  return (
    <div ref={wrap} className="relative w-full min-w-0 sm:w-auto">
      <div className="flex h-11 items-center gap-1 rounded-md bg-surface-2 pr-1 pl-2.5">
        <span id={labelId} className="mr-1 text-xs text-muted">
          Riesgo
        </span>
        <button
          type="button"
          className={btn}
          aria-label="Bajar el riesgo"
          disabled={risk <= 1}
          onClick={() => set(risk - 1)}
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <div
          ref={track}
          role="slider"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={risk}
          aria-valuetext={`${risk} de 10, ${rp.label}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          className="flex h-9 min-w-0 flex-1 cursor-pointer touch-none items-center gap-[3px] rounded-sm px-1 outline-none select-none focus-visible:ring-2 focus-visible:ring-focus sm:flex-none"
        >
          {Array.from({ length: 10 }, (_, k) => k + 1).map((i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                "min-w-[5px] flex-1 rounded-[2px] transition-all duration-150 sm:w-[11px] sm:flex-none",
                i <= risk ? zone(i) : "bg-surface-3",
                i === risk ? "h-6" : "h-4",
                hover !== null &&
                  i === hover &&
                  i !== risk &&
                  "outline outline-2 outline-offset-1 outline-ink-2",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          className={btn}
          aria-label="Subir el riesgo"
          disabled={risk >= 10}
          onClick={() => set(risk + 1)}
        >
          <Plus aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="ml-0.5 inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold whitespace-nowrap text-ink hover:bg-surface-3"
        >
          <span className="tabular">
            {risk} · <span className={TONE_TEXT[rp.tone]}>{rp.label}</span>
          </span>
          <span className="sr-only">: ver qué cambia con el riesgo</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 text-muted transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
      {open && <RiskPanel id={panelId} set={set} risk={risk} fmt={fmt} />}
    </div>
  );
}

function RiskPanel({
  id,
  set,
  risk,
  fmt,
}: {
  id: string;
  set: (v: number) => void;
  risk: number;
  fmt: ReturnType<typeof useCopiloto>["fmt"];
}) {
  const { S } = useCopiloto();
  const p = activeProduct(S);
  const g = E.gate(p, risk);
  const R = g.R;
  const rp = E.riskProfile(risk);
  const rows: [string, string, string?][] = [
    [
      "Margen mínimo por pedido",
      fmt.pct(R.margenMin),
      "del ticket, para pasar la validación",
    ],
    ["Holgura exigida sobre el CPA máximo", fmt.pct(R.holguraCPA)],
    ["CPA objetivo", fmt.money(g.cpaObj), `máximo ${fmt.money(g.u.cpaMax)}`],
    [
      "Presupuesto por test",
      fmt.money(g.presTest),
      `${R.pedidosDecidir} pedidos a CPA objetivo`,
    ],
    [
      "Corte sin ventas",
      fmt.money(R.killMult * g.u.cpaMax),
      `${R.killMult.toFixed(1).replace(".", ",")}× CPA máximo`,
    ],
    ["Subida al escalar", `${R.subida} %`, "cada 2–3 días"],
    [
      "Capital a pauta y reinversión",
      `${Math.round(R.asignacion / 5) * 5} %`,
      "sugerido en Crecer",
    ],
  ];
  return (
    <div
      id={id}
      role="region"
      aria-label="Qué cambia con el riesgo"
      className="sheet-enter absolute top-full left-0 z-30 mt-2 w-[min(380px,calc(100vw-64px))] rounded-lg border border-border bg-surface p-4 text-ink shadow-xl sm:right-0 sm:left-auto"
    >
      <p className="t-overline text-muted">Tu perfil</p>
      <div
        role="group"
        aria-label="Perfiles rápidos"
        className="mt-2 grid grid-cols-3 gap-1.5"
      >
        {RISK_PRESETS.map((x) => {
          const on = E.riskProfile(risk).label === x.label;
          return (
            <button
              key={x.v}
              type="button"
              aria-pressed={on}
              onClick={() => set(x.v)}
              className={cn(
                "rounded-md border px-2 py-2 text-left text-xs",
                on
                  ? "border-ink bg-surface-2 font-semibold"
                  : "border-border hover:bg-surface-2",
              )}
            >
              <span className="block text-sm">{x.label}</span>
              <span className="text-muted">nivel {x.v}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-2">
        {RISK_PRESETS.find((x) => x.label === rp.label)?.d}
      </p>

      <p className="t-overline mt-4 text-muted">Qué cambia en {p.nombre}</p>
      <dl className="mt-2 divide-y divide-border text-sm">
        {rows.map(([k, v, s]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-3 py-1.5"
          >
            <dt className="min-w-0 text-ink-2">
              {k}
              {s && <span className="block text-xs text-muted">{s}</span>}
            </dt>
            <dd className="shrink-0 font-semibold">
              <Live v={v} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex items-center gap-2 text-sm">
        Validación del producto:{" "}
        <span key={String(g.pass)} className="cp-flash rounded-md">
          {g.pass ? (
            <ToneBadge tone="g">pasa</ToneBadge>
          ) : (
            <ToneBadge tone="r">no pasa</ToneBadge>
          )}
        </span>
      </p>
      <p aria-live="polite" className="sr-only">
        Riesgo {risk}, {rp.label}. CPA objetivo {fmt.money(g.cpaObj)}.{" "}
        {g.pass ? "Pasa" : "No pasa"} la validación.
      </p>
    </div>
  );
}
