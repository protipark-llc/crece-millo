"use client";

import { useId, useRef, type ReactNode } from "react";
import {
  ChevronDown,
  Copy,
  Hand,
  PenLine,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { FICHA, NUMK, duplicate, num } from "@/lib/copiloto/productos";
import { activeProduct } from "@/lib/copiloto/logic";
import { qaResult } from "@/lib/copiloto/alta";
import {
  AUTO_GROUPS,
  ESENCIALES,
  applyIA,
  backToAuto,
  disableAuto,
  editField,
  enableAuto,
  faltantes,
  isAuto,
  isIA,
  isManual,
} from "@/lib/copiloto/autoficha";
import type { MentorResult } from "@/lib/copiloto/mentor";
import type { Product } from "@/lib/copiloto/state";
import { todayLocal } from "@/lib/copiloto/today";
import { claseText, claseTone } from "@/lib/copiloto/productos";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import { Mentor, MentorView } from "../mentor";
import {
  ConfirmButton,
  Kpi,
  LabeledField,
  NumInput,
  ToneAlert,
  fieldClass,
} from "../ui";

/** Campos de FICHA que no están en lo esencial ni en lo autocompletado: van en «Más datos». */
const SHOWN = new Set<string>([
  ...ESENCIALES.map((f) => f.k),
  ...AUTO_GROUPS.flatMap((g) => g.fields.map((f) => f.k)),
]);

/**
 * Ficha dinámica: la persona llena lo esencial (nombre, costo, envíos, comisión y margen) y el
 * resto se autocompleta; lo que edite a mano queda fijo hasta que lo vuelva a automático. La IA
 * afina categoría, textos y criterios, y arma la estrategia y los creativos (se guardan aquí).
 */
export function Ficha() {
  const { S, fmt, updateProduct, addProduct, removeProduct, setSettings } =
    useCopiloto();
  const p = activeProduct(S);
  // La IA responde segundos después: aplica sobre el producto más reciente, no el del clic.
  const latest = useRef(p);
  latest.current = p;
  const auto = isAuto(p);
  const falta = faltantes(p);
  const listo = p.costo > 0 && p.precio > 0;
  const r = listo ? qaResult(S, p) : null;
  const meta = (p.meta as number) || 20;

  const put = (next: Product) => updateProduct(p.id, next);
  const setField = (k: string, value: unknown) => {
    const next = editField(S, p, k, value);
    if (k === "costo") next.costoReal = true;
    put(next);
  };
  const setOther = (k: string, raw: string) =>
    updateProduct(p.id, { [k]: NUMK.has(k) ? num(raw) : raw });

  return (
    <div key={p.id} className="space-y-6">
      {/* 1 · Lo esencial */}
      <section
        aria-labelledby="ficha-esencial"
        className="space-y-4 rounded-xl border border-border-strong bg-surface p-4 sm:p-5"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="ficha-esencial" className="t-section text-ink">
              1 · Lo esencial
            </h3>
            <p className="text-sm text-ink-2">
              <PenLine aria-hidden className="mr-1 inline size-4 text-brand" />
              Tú lo llenas. Con esto se calcula todo lo demás.
            </p>
          </div>
          <AutoSwitch
            on={auto}
            onChange={(v) => put(v ? enableAuto(S, p) : disableAuto(p))}
          />
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ESENCIALES.map((f) => (
            <LabeledField
              key={f.k}
              label={
                <>
                  {f.label}{" "}
                  {f.k !== "fleteRet" && f.k !== "com" && (
                    <span className="text-xs font-normal text-muted">
                      (obligatorio)
                    </span>
                  )}
                </>
              }
              hint={f.hint}
            >
              {(id) =>
                f.k === "nombre" ? (
                  <input
                    id={id}
                    type="text"
                    value={String(p.nombre ?? "")}
                    onChange={(e) => setField("nombre", e.target.value)}
                    className={cn(
                      fieldClass,
                      falta.includes("nombre") && "border-warn",
                    )}
                  />
                ) : (
                  <NumInput
                    id={id}
                    min={0}
                    step={f.step}
                    suffix={"suffix" in f ? f.suffix : undefined}
                    value={p[f.k] as number}
                    onChange={(n) => setField(f.k, n === "" ? 0 : n)}
                    inputClassName={cn(falta.includes(f.k) && "border-warn")}
                  />
                )
              }
            </LabeledField>
          ))}
        </div>
        {falta.length > 0 ? (
          <ToneAlert tone="b">
            Falta:{" "}
            <strong>
              {falta
                .map((k) => ESENCIALES.find((f) => f.k === k)!.label)
                .join(", ")}
            </strong>
            . {auto && "Con eso se completa el resto solo."}
          </ToneAlert>
        ) : null}
        {r && (
          <div
            aria-live="polite"
            className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
          >
            <Kpi
              t="Precio de venta"
              v={fmt.money(p.precio)}
              s={
                auto && !isManual(p, "precio")
                  ? `Automático · ${p.precioVia ?? "recomendado"}`
                  : "Fijado por ti"
              }
              tone="g"
            />
            <Kpi
              t="Utilidad por pedido"
              v={fmt.money(r.u.utilidadPedido)}
              s={`${fmt.pct(r.u.margenPct)} del ticket`}
              tone={r.u.utilidadPedido > 0 ? "g" : "r"}
            />
            <Kpi
              t="Margen neto estimado"
              v={fmt.pct(r.e.mn)}
              s={`quieres ${meta} %`}
              tone={r.e.mn >= meta / 100 ? "g" : "a"}
            />
            <Kpi
              t="CPA objetivo"
              v={fmt.money(r.g.cpaObj)}
              s={`máximo ${fmt.money(r.u.cpaMax)}`}
            />
            <Kpi
              t="Puntaje"
              v={`${r.ev.total} · Clase ${r.ev.clase}`}
              s={claseText(r.ev.clase)}
              tone={claseTone(r.ev.clase)}
              className="col-span-2 md:col-span-1"
            />
          </div>
        )}
        {r && r.e.mn < meta / 100 && (
          <ToneAlert tone="a">
            Con estos costos el margen estimado ({fmt.pct(r.e.mn)}) no llega al{" "}
            {meta} % que quieres.{" "}
            {auto && !isManual(p, "precio")
              ? "Ni subiendo el precio hasta un nivel vendible se alcanza: busca un proveedor más barato, un combo o baja el margen."
              : "Sube el precio, vuelve el precio a automático o busca un proveedor más barato."}
          </ToneAlert>
        )}
      </section>

      {/* 2 · Autocompletado */}
      <section
        aria-labelledby="ficha-auto"
        className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <h3 id="ficha-auto" className="t-section text-ink">
              2 · {auto ? "Se completa solo" : "Precio, oferta y mercado"}
            </h3>
            <p className="text-sm text-ink-2">
              {auto
                ? "Calculado con tus costos y el nicho. Si cambias algo, queda fijo; con ↺ vuelve a automático."
                : "El autocompletado está apagado: estos campos solo cambian cuando tú los editas."}
            </p>
          </div>
          <Mentor
            compact
            action="alta"
            label="Completar con IA"
            doneMsg="La IA completó categoría, textos y criterios"
            extra={() => ({ draft: latest.current })}
            onResult={(d) =>
              put(applyIA(latest.current, d as MentorResult<"alta">))
            }
          />
        </header>
        {auto && <Legend />}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
          {AUTO_GROUPS.map((g) => (
            <div key={g.t} role="group" aria-label={g.t} className="min-w-0">
              <p className="t-overline mb-2 text-muted">{g.t}</p>
              <div
                className={cn(
                  "grid grid-cols-1 gap-3",
                  g.fields.length > 5 && "sm:grid-cols-2",
                )}
              >
                {g.fields.map((f) => (
                  <AutoField
                    key={f.k}
                    label={f.label}
                    wide={f.kind === "area" && f.k === "objeciones"}
                    state={
                      !auto
                        ? null
                        : isManual(p, f.k)
                          ? "tu"
                          : isIA(p, f.k)
                            ? "ia"
                            : "auto"
                    }
                    onReset={() => put(backToAuto(S, p, f.k))}
                  >
                    {(id, describedBy, cls) =>
                      f.kind === "select" ? (
                        <select
                          id={id}
                          aria-describedby={describedBy}
                          value={String(p[f.k] ?? "")}
                          onChange={(e) => setField(f.k, e.target.value)}
                          className={cn(fieldClass, cls)}
                        >
                          {f.options!.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.kind === "area" ? (
                        <textarea
                          id={id}
                          aria-describedby={describedBy}
                          rows={f.k === "objeciones" ? 4 : 2}
                          value={String(p[f.k] ?? "")}
                          onChange={(e) => setField(f.k, e.target.value)}
                          className={cn(fieldClass, "h-auto py-2", cls)}
                        />
                      ) : (
                        <NumInput
                          id={id}
                          aria-describedby={describedBy}
                          min={0}
                          step={f.kind === "pct" ? 1 : 500}
                          suffix={f.kind === "pct" ? "%" : undefined}
                          value={p[f.k] as number}
                          onChange={(n) => setField(f.k, n === "" ? 0 : n)}
                          inputClassName={cls}
                        />
                      )
                    }
                  </AutoField>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 · Estrategia con IA */}
      <Estrategia
        p={p}
        save={(k, data) =>
          updateProduct(p.id, {
            estrategiaIA: {
              ...latest.current.estrategiaIA,
              [k]: { data, ts: Date.now() },
            },
          })
        }
      />

      {/* Más datos */}
      <details className="group rounded-xl border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-ink sm:px-5">
          <span>
            Más datos del producto
            <span className="block text-sm font-normal text-ink-2">
              Etapa, proveedor, links, % de entrega, impuestos y notas.
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="grid grid-cols-1 gap-6 border-t border-border p-4 sm:px-5 lg:grid-cols-3">
          {FICHA.map(([group, fields]) => (
            <div
              key={group}
              role="group"
              aria-label={group}
              className="min-w-0 space-y-3"
            >
              <p className="t-overline text-muted">{group}</p>
              {fields
                .filter((f) => !SHOWN.has(f.k))
                .map((f) => (
                  <LabeledField key={f.k} label={f.label}>
                    {(id) =>
                      f.type === "select" ? (
                        <select
                          id={id}
                          defaultValue={String(p[f.k] ?? "")}
                          onChange={(e) => setOther(f.k, e.target.value)}
                          className={fieldClass}
                        >
                          {f.options!.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.type === "textarea" ? (
                        <textarea
                          id={id}
                          rows={2}
                          defaultValue={String(p[f.k] ?? "")}
                          onChange={(e) => setOther(f.k, e.target.value)}
                          className={cn(fieldClass, "h-auto py-2")}
                        />
                      ) : f.type === "number" ? (
                        <NumInput
                          id={id}
                          min={0}
                          step={/%|stock|competidoras/i.test(f.label) ? 1 : 500}
                          value={p[f.k] as number}
                          onChange={(n) =>
                            setOther(f.k, n === "" ? "0" : String(n))
                          }
                        />
                      ) : (
                        <input
                          id={id}
                          type={
                            f.type === "date"
                              ? "date"
                              : f.type === "url"
                                ? "url"
                                : "text"
                          }
                          placeholder={
                            f.type === "url" ? "https://" : undefined
                          }
                          defaultValue={String(p[f.k] ?? "")}
                          onChange={(e) => setOther(f.k, e.target.value)}
                          className={fieldClass}
                        />
                      )
                    }
                  </LabeledField>
                ))}
            </div>
          ))}
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          className={buttonClass("secondary", "md")}
          onClick={() => {
            const c = duplicate(p, todayLocal());
            addProduct(c);
            setSettings({ active: c.id });
          }}
        >
          <Copy aria-hidden className="size-4" /> Duplicar producto
        </button>
        <ConfirmButton
          className={buttonClass("ghost", "md", "text-neg disabled:opacity-50")}
          disabled={S.products.length <= 1}
          title={`¿Eliminar ${p.nombre}?`}
          description="Sus resultados quedan en la bitácora."
          confirmLabel="Eliminar producto"
          onConfirm={() => removeProduct(p.id)}
        >
          <Trash2 aria-hidden className="size-4" /> Eliminar producto
        </ConfirmButton>
        <p className="text-xs text-muted">
          Los cambios se guardan solos.
          {S.products.length <= 1
            ? " No puedes eliminar tu único producto."
            : ""}
        </p>
      </div>
    </div>
  );
}

function AutoSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface-2 py-1.5 pr-3 pl-1.5 text-sm font-medium text-ink"
    >
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          on ? "bg-brand" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-surface shadow transition-[left]",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      Autocompletar el resto
    </button>
  );
}

const STATE_META = {
  auto: {
    text: "Auto",
    sr: "Calculado automáticamente",
    Icon: Wand2,
    cls: "bg-surface-3 text-ink-2",
    field: "border-dashed bg-surface-2",
  },
  ia: {
    text: "IA",
    sr: "Completado por la IA",
    Icon: Sparkles,
    cls: "bg-info-soft text-info",
    field: "border-dashed border-info bg-info-soft/40",
  },
  tu: {
    text: "Tú",
    sr: "Fijado por ti",
    Icon: Hand,
    cls: "bg-brand-soft text-brand",
    field: "",
  },
} as const;

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {(["auto", "ia", "tu"] as const).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <Chip state={k} /> {STATE_META[k].sr}
        </li>
      ))}
    </ul>
  );
}

function Chip({ state, id }: { state: keyof typeof STATE_META; id?: string }) {
  const m = STATE_META[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold",
        m.cls,
      )}
    >
      <m.Icon aria-hidden className="size-3" />
      <span aria-hidden>{m.text}</span>
      <span id={id} className="sr-only">
        {m.sr}
      </span>
    </span>
  );
}

function AutoField({
  label,
  state,
  wide,
  onReset,
  children,
}: {
  label: string;
  state: keyof typeof STATE_META | null;
  wide?: boolean;
  onReset: () => void;
  children: (
    id: string,
    describedBy: string | undefined,
    cls: string,
  ) => ReactNode;
}) {
  const id = useId();
  const chipId = `${id}-estado`;
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <div className="mb-1 flex min-h-6 items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {state && <Chip state={state} id={chipId} />}
        {state && state !== "auto" && (
          <button
            type="button"
            onClick={onReset}
            aria-label={`Volver a automático: ${label}`}
            className="ml-auto inline-flex min-h-6 items-center gap-1 rounded-sm px-1 text-xs font-medium text-brand hover:underline"
          >
            <RotateCcw aria-hidden className="size-3" /> Automático
          </button>
        )}
      </div>
      {children(
        id,
        state ? chipId : undefined,
        state ? STATE_META[state].field : "",
      )}
    </div>
  );
}

function Estrategia({
  p,
  save,
}: {
  p: Product;
  save: (k: "producto" | "creativos", data: unknown) => void;
}) {
  const saved = p.estrategiaIA ?? {};
  return (
    <section
      aria-labelledby="ficha-ia"
      className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      <header>
        <h3 id="ficha-ia" className="t-section text-ink">
          3 · Estrategia con IA
        </h3>
        <p className="text-sm text-ink-2">
          Con lo de arriba, la IA te propone cómo lanzarlo: posicionamiento,
          oferta, logística, presupuesto y creativos. Queda guardado en la
          ficha.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Mentor
          compact
          action="producto"
          label={
            saved.producto ? "Rehacer la estrategia" : "Armar la estrategia"
          }
          doneMsg="Estrategia guardada en la ficha"
          onResult={(d) => save("producto", d)}
        />
        <Mentor
          compact
          action="creativos"
          label={saved.creativos ? "Nuevos creativos" : "Ideas de creativos"}
          doneMsg="Creativos guardados en la ficha"
          onResult={(d) => save("creativos", d)}
        />
      </div>
      {saved.producto && (
        <div className="space-y-2">
          <p className="t-overline text-muted">Estrategia</p>
          <MentorView action="producto" {...saved.producto} />
        </div>
      )}
      {saved.creativos && (
        <div className="space-y-2">
          <p className="t-overline text-muted">Creativos</p>
          <MentorView action="creativos" {...saved.creativos} />
        </div>
      )}
    </section>
  );
}
