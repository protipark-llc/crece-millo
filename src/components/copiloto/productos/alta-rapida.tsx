"use client";

import { AltaAI } from "../mentor";
import { applyAlta } from "@/lib/copiloto/mentor";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Calculator,
  Check,
  ClipboardPaste,
  RotateCcw,
  X,
  Zap,
} from "lucide-react";
import { E } from "@/lib/copiloto/engine";
import {
  TAMANOS,
  detect,
  qaBuild,
  qaParse,
  qaPrice,
  qaResult,
  type QaInput,
} from "@/lib/copiloto/alta";
import { claseText, claseTone, num } from "@/lib/copiloto/productos";
import { CATS, type Product } from "@/lib/copiloto/state";
import { todayLocal } from "@/lib/copiloto/today";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import {
  Kpi,
  LabeledField,
  ToneAlert,
  fieldClass,
  useToast,
  NumInput,
} from "../ui";

type Form = Omit<QaInput, "costo" | "sug" | "stock" | "tam"> & {
  costo: string;
  sug: string;
  stock: string;
  tam: string;
  paste: string;
};
const empty = (): Form => ({
  paste: "",
  nombre: "",
  costo: "",
  sug: "",
  cat: CATS[0],
  tam: "16000",
  desc: "",
  link: "",
  stock: "",
  combo: true,
});

const Auto = () => (
  <span className="ml-1.5 rounded-sm bg-info-soft px-1.5 py-0.5 text-[11px] font-semibold text-info">
    automático
  </span>
);

/** Alta rápida de producto (modal #qa, L438–466; qaOpen…qaSave, L983–1040). Se abre con ?alta=1. */
export function AltaRapida() {
  const { S, fmt, addProduct, setSettings } = useCopiloto();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  // Dentro del modal (capa superior) para que se vea mientras está abierto.
  const toastIn = useToast();
  const [f, setF] = useState<Form>(empty);
  const [detected, setDetected] = useState(false);
  const [res, setRes] = useState<{
    p: Product;
    via: string;
    range: [number, number] | null;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const open = params.get("alta") === "1";

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setF(empty());
      setRes(null);
      setErr(null);
      setDetected(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const close = () => {
    const q = new URLSearchParams(params.toString());
    q.delete("alta");
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const set = (patch: Partial<Form>) => setF((o) => ({ ...o, ...patch }));
  const input = (): QaInput => ({
    ...f,
    costo: num(f.costo),
    sug: num(f.sug),
    stock: num(f.stock),
    tam: num(f.tam),
  });

  const compute = () => {
    const p0 = qaBuild(input(), todayLocal());
    if (!p0) {
      setErr("Falta el nombre o el costo.");
      return;
    }
    setErr(null);
    const r = qaPrice(S, p0, f.combo);
    setRes({ p: r.p, via: r.via, range: r.R.range });
  };
  const edit = (patch: Partial<Product>) =>
    setRes((r) => (r ? { ...r, p: { ...r.p, ...patch } as Product } : r));

  const save = () => {
    if (!res) return;
    const p = { ...res.p };
    if (E.gate(p, S.risk).pass && p.etapa === "Investigando")
      p.etapa = "Validado";
    addProduct(p);
    setSettings({ active: p.id, ptab: "eval" });
    router.replace(`${pathname}?vista=evaluacion`, { scroll: false });
    toast.show(`Producto creado: ${p.nombre}`);
  };

  const r = res ? qaResult(S, res.p) : null;
  return (
    <>
      <dialog
        ref={ref}
        aria-labelledby="qa-t"
        onClose={() => open && close()}
        className="m-auto max-h-[calc(100dvh-32px)] w-[min(1080px,calc(100vw-24px))] overflow-y-auto rounded-lg border border-border bg-bg p-0 text-ink shadow-xl backdrop:bg-black/50"
      >
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2
              id="qa-t"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Zap aria-hidden className="size-5 text-brand" /> Alta rápida de
              producto
            </h2>
            <p className="text-sm text-ink-2">
              Pon lo que ves en Dropi. La app calcula el precio, los márgenes y
              la evaluación, y completa público, beneficio, ángulos, objeciones
              y creativos. Todo queda editable.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-surface-2"
            aria-label="Cerrar"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-[400px_minmax(0,1fr)]">
          <form
            className="h-fit space-y-3 rounded-lg border border-border bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              compute();
            }}
          >
            <p className="t-overline text-muted">1 · Lo que ves en Dropi</p>
            <LabeledField label="Pega aquí el texto del producto en Dropi (opcional)">
              {(id) => (
                <textarea
                  id={id}
                  rows={3}
                  value={f.paste}
                  onChange={(e) => set({ paste: e.target.value })}
                  placeholder="Nombre, precio proveedor, precio sugerido, stock, descripción…"
                  className={cn(fieldClass, "h-auto py-2")}
                />
              )}
            </LabeledField>
            <button
              type="button"
              className={buttonClass("secondary", "md")}
              onClick={() => {
                const x = qaParse(f.paste);
                if (!f.paste.trim()) return;
                setF((o) => ({
                  ...o,
                  nombre: o.nombre || x.nombre || "",
                  costo: x.costo ? String(x.costo) : o.costo,
                  sug: x.sug ? String(x.sug) : o.sug,
                  stock: x.stock ? String(x.stock) : o.stock,
                  desc: o.desc || x.desc || "",
                  cat: x.cat || o.cat,
                }));
                if (x.cat) setDetected(true);
                toastIn.show(
                  `Leído: ${x.costo ? `costo ${fmt.money(x.costo)}` : "sin costo"}${x.sug ? ` · sugerido ${fmt.money(x.sug)}` : ""}`,
                );
              }}
            >
              <ClipboardPaste aria-hidden className="size-4" /> Leer el texto
              pegado
            </button>
            <LabeledField label="Nombre del producto">
              {(id) => (
                <input
                  id={id}
                  value={f.nombre}
                  placeholder="Ej: Masajeador de cuello eléctrico"
                  onChange={(e) => {
                    const d = detect(e.target.value + " " + f.desc);
                    set({
                      nombre: e.target.value,
                      ...(d ? { cat: d.cat } : {}),
                    });
                    if (d) setDetected(true);
                  }}
                  required
                  className={fieldClass}
                />
              )}
            </LabeledField>
            <div className="grid grid-cols-2 gap-3">
              <LabeledField label="Costo proveedor (COP)">
                {(id) => (
                  <NumInput
                    id={id}
                    min={0}
                    step={500}
                    allowEmpty
                    placeholder="45.000"
                    value={f.costo}
                    onChange={(n) => set({ costo: n === "" ? "" : String(n) })}
                  />
                )}
              </LabeledField>
              <LabeledField label="Precio sugerido en Dropi">
                {(id) => (
                  <NumInput
                    id={id}
                    min={0}
                    step={1000}
                    allowEmpty
                    placeholder="opcional"
                    value={f.sug}
                    onChange={(n) => set({ sug: n === "" ? "" : String(n) })}
                  />
                )}
              </LabeledField>
              <LabeledField
                label={
                  <>
                    Categoría{" "}
                    {detected && (
                      <span className="ml-1 rounded-sm bg-pos-soft px-1.5 py-0.5 text-[11px] font-semibold text-pos">
                        detectada
                      </span>
                    )}
                  </>
                }
              >
                {(id) => (
                  <select
                    id={id}
                    value={f.cat}
                    onChange={(e) => {
                      set({ cat: e.target.value });
                      setDetected(false);
                    }}
                    className={fieldClass}
                  >
                    {CATS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                )}
              </LabeledField>
              <LabeledField label="Tamaño del paquete">
                {(id) => (
                  <select
                    id={id}
                    value={f.tam}
                    onChange={(e) => set({ tam: e.target.value })}
                    className={fieldClass}
                  >
                    {TAMANOS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                )}
              </LabeledField>
            </div>
            <LabeledField label="Descripción o características (opcional, mejora los textos)">
              {(id) => (
                <textarea
                  id={id}
                  rows={2}
                  value={f.desc}
                  placeholder="Ej: 6 modos de masaje, calor, recargable USB…"
                  onChange={(e) => set({ desc: e.target.value })}
                  className={cn(fieldClass, "h-auto py-2")}
                />
              )}
            </LabeledField>
            <div className="grid grid-cols-2 gap-3">
              <LabeledField label="Link en Dropi">
                {(id) => (
                  <input
                    id={id}
                    type="url"
                    value={f.link}
                    placeholder="https://"
                    onChange={(e) => set({ link: e.target.value })}
                    className={fieldClass}
                  />
                )}
              </LabeledField>
              <LabeledField label="Stock del proveedor">
                {(id) => (
                  <NumInput
                    id={id}
                    min={0}
                    step={1}
                    allowEmpty
                    value={f.stock}
                    onChange={(n) => set({ stock: n === "" ? "" : String(n) })}
                  />
                )}
              </LabeledField>
            </div>
            <label className="flex min-h-11 items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={f.combo}
                onChange={(e) => set({ combo: e.target.checked })}
                className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
              />
              Agregar combo 2× automáticamente (segunda unidad con descuento,
              20% de aceptación)
            </label>
            {err && <p className="text-sm font-semibold text-neg">{err}</p>}
            <button
              type="submit"
              className={buttonClass("primary", "md", "w-full")}
            >
              <Calculator aria-hidden className="size-4" /> Calcular y completar
            </button>
          </form>

          <section
            aria-labelledby="qa-r"
            aria-live="polite"
            className="min-w-0 space-y-3"
          >
            <p id="qa-r" className="t-overline text-muted">
              2 · Resultado (puedes editar todo antes de guardar)
            </p>
            {!res || !r ? (
              <ToneAlert tone="b">
                Escribe al menos el <strong>nombre</strong> y el{" "}
                <strong>costo del proveedor</strong> y pulsa{" "}
                <strong>Calcular y completar</strong>.
              </ToneAlert>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <Kpi
                    t="Precio de venta sugerido"
                    v={fmt.money(res.p.precio)}
                    s={`${res.via}${res.range ? ` · rango ${fmt.money(res.range[0])} – ${fmt.money(res.range[1])}` : ""}`}
                    tone="g"
                  />
                  <Kpi
                    t="Precio tachado"
                    v={fmt.money(res.p.ancla as number)}
                    s="ancla de ~30% de descuento"
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
                    s="después de pauta y fijos"
                    tone={r.e.mn >= r.q.margenMin / 100 ? "g" : "a"}
                  />
                  <Kpi
                    t="CPA objetivo"
                    v={fmt.money(r.g.cpaObj)}
                    s={`máximo ${fmt.money(r.u.cpaMax)}`}
                  />
                  <Kpi
                    t="Presupuesto del test"
                    v={fmt.money(r.g.presTest)}
                    s="10 pedidos"
                  />
                  <Kpi
                    t="Puntaje"
                    v={`${r.ev.total} · Clase ${r.ev.clase}`}
                    s={claseText(r.ev.clase)}
                    tone={claseTone(r.ev.clase)}
                  />
                  <Kpi
                    t="Costo / precio"
                    v={fmt.pct(res.p.costo / res.p.precio)}
                    s={`${(res.p.precio / res.p.costo).toFixed(1).replace(".", ",")}× el costo`}
                    tone={res.p.costo / res.p.precio <= 0.34 ? "g" : "a"}
                  />
                </div>
                {(res.p.precioComp as number) > 0 &&
                  res.p.precio > (res.p.precioComp as number) * 1.15 && (
                    <ToneAlert tone="a">
                      El precio sugerido queda{" "}
                      {fmt.pct(res.p.precio / (res.p.precioComp as number) - 1)}{" "}
                      por encima del sugerido de Dropi (
                      {fmt.money(res.p.precioComp as number)}). Revisa a cuánto
                      lo vende la competencia; si no te da, busca otro proveedor
                      más barato o un combo.
                    </ToneAlert>
                  )}
                {!r.g.pass && (
                  <ToneAlert tone="r">
                    Con este costo el producto no deja margen suficiente. Busca
                    un proveedor más barato o descártalo.
                  </ToneAlert>
                )}
                {(res.p.upTasa as number) > 0 && (
                  <ToneAlert tone="g">
                    Combo 2× incluido: segunda unidad a{" "}
                    {fmt.money(res.p.upPrecio as number)}. Sube el ticket
                    esperado a {fmt.money(r.u.aov)}.
                  </ToneAlert>
                )}
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-2">
                  {(
                    [
                      ["nombre", "Nombre", false],
                      ["angulos", "Ángulos de venta", true],
                      ["publico", "Público objetivo", true],
                      ["objeciones", "Objeciones", true],
                      ["beneficio", "Beneficio principal", true],
                      ["dolor", "Problema que resuelve", true],
                    ] as [keyof Product & string, string, boolean][]
                  ).map(([k, l, ta]) => (
                    <LabeledField
                      key={k}
                      label={
                        <>
                          {l}
                          <Auto />
                        </>
                      }
                    >
                      {(id) =>
                        ta ? (
                          <textarea
                            id={id}
                            rows={3}
                            value={String(res.p[k] ?? "")}
                            onChange={(e) => edit({ [k]: e.target.value })}
                            className={cn(fieldClass, "h-auto py-2 text-sm")}
                          />
                        ) : (
                          <input
                            id={id}
                            value={String(res.p[k] ?? "")}
                            onChange={(e) => edit({ [k]: e.target.value })}
                            className={fieldClass}
                          />
                        )
                      }
                    </LabeledField>
                  ))}
                  <LabeledField label="Permiso sanitario INVIMA">
                    {(id) => (
                      <select
                        id={id}
                        value={String(res.p.invima ?? "No sé")}
                        onChange={(e) => edit({ invima: e.target.value })}
                        className={fieldClass}
                      >
                        {["No", "Sí", "No sé"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    )}
                  </LabeledField>
                </div>
                <p className="text-xs text-muted">
                  Los criterios de evaluación se estimaron por categoría y
                  palabras clave:{" "}
                  {E.CRIT.map(
                    ([k, l]) =>
                      `${l.split(" ")[0]} ${res.p.score[k as keyof Product["score"]]}`,
                  ).join(" · ")}
                  . Ajústalos luego en la ficha.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={buttonClass("primary", "md")}
                    onClick={save}
                  >
                    <Check aria-hidden className="size-4" /> Guardar producto
                  </button>
                  <AltaAI
                    draft={res.p}
                    apply={(j) =>
                      setRes((x) => (x ? { ...x, p: applyAlta(x.p, j) } : x))
                    }
                  />
                  <button
                    type="button"
                    className={buttonClass("ghost", "md")}
                    onClick={compute}
                  >
                    <RotateCcw aria-hidden className="size-4" /> Recalcular
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
        {toastIn.node}
      </dialog>
      {toast.node}
    </>
  );
}
