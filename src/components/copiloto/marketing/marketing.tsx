"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  FilePenLine,
  Lightbulb,
  PenLine,
  ReceiptText,
} from "lucide-react";
import { activeProduct, type Rich } from "@/lib/copiloto/logic";
import { MKTABS, copilotoHref } from "@/lib/copiloto/nav";
import {
  CREATIVE_CHECK,
  adCopy,
  angles,
  hooks,
  launch,
  matrix,
  mkCtx,
  mkState,
  offerCalc,
  offers,
  pageTexts,
  scriptText,
  scripts,
  waMessages,
  type MkCtx,
  type MkState,
} from "@/lib/copiloto/marketing";
import { cn } from "@/components/ui/cn";
import { tipFor } from "@/lib/copiloto/glosario";
import { InfoTip, buttonClass } from "@/components/ui/primitives";
import { useCopiloto } from "../store";
import { ToneBadge } from "../tone";
import {
  Kpi,
  LabeledField,
  SubTabs,
  TONE_ICON,
  TONE_TEXT,
  ToneAlert,
  fieldClass,
  useToast,
} from "../ui";

const card = "rounded-lg border border-border bg-surface p-4 sm:p-5";
type Toast = ReturnType<typeof useToast>;

export function RichText({ r }: { r: Rich }) {
  return (
    <>
      {r.map((x, i) =>
        x.b ? (
          <strong key={i} className="font-semibold">
            {x.t}
          </strong>
        ) : (
          <span key={i}>{x.t}</span>
        ),
      )}
    </>
  );
}

function CopyButton({
  text,
  toast,
  label = "Copiar",
  what,
  done = "Copiado",
}: {
  text: string;
  toast: Toast;
  label?: string;
  what?: string;
  done?: string;
}) {
  return (
    <button
      type="button"
      aria-label={what ? `${label}: ${what}` : undefined}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-ink hover:bg-surface-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.show(done);
        } catch {
          toast.show("No se pudo copiar. Selecciona el texto y cópialo.");
        }
      }}
    >
      <Copy aria-hidden className="size-3.5" /> {label}
    </button>
  );
}

function Edu({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border-l-4 border-brand bg-surface-2 px-4 py-3 text-sm text-ink">
      <Lightbulb
        aria-hidden
        className="mt-0.5 size-[18px] shrink-0 text-brand"
      />
      <div>{children}</div>
    </div>
  );
}

function Say({
  text,
  toast,
  what,
  className,
}: {
  text: string;
  toast: Toast;
  what: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md bg-surface-2 p-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm whitespace-pre-line text-ink">{text}</p>
        <CopyButton text={text} toast={toast} what={what} />
      </div>
    </div>
  );
}

function useMkTab(st: MkState) {
  const q = useSearchParams().get("vista");
  const hit = MKTABS.find((t) => t.slug === q || t.code === q);
  return hit
    ? hit.code
    : MKTABS.some((t) => t.code === st.tab)
      ? st.tab
      : "ofertas";
}

/** Marketing (t-marketing, L291–326; renderMarketing, L957). */
export function Marketing({
  mentorOffers,
  mentorCreatives,
}: {
  mentorOffers?: ReactNode;
  mentorCreatives?: ReactNode;
}) {
  const { S, fmt, setSettings, setProductState } = useCopiloto();
  const toast = useToast();
  const p = activeProduct(S);
  const c = mkCtx(p, fmt.money);
  const st = mkState(S.mk as Record<string, Record<string, unknown>>, p.id);
  const tab = useMkTab(st);
  const setMk = (patch: Partial<MkState>) =>
    setProductState(p.id, "mk", { ...st, ...patch } as Record<string, unknown>);
  useEffect(() => {
    if (tab !== st.tab)
      setProductState(p.id, "mk", { ...st, tab } as Record<string, unknown>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, p.id]);

  return (
    <section aria-labelledby="mk-t" className={cn(card, "space-y-4")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="t-overline text-muted">Marketing para</p>
          <h2 id="mk-t" className="mt-0.5 text-xl font-semibold text-ink">
            {c.n}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {c.cat} · público: {c.pub} · beneficio: {c.ben}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <LabeledField label="Nombre de tu tienda" className="w-full sm:w-60">
          {(id) => (
            <input
              id={id}
              defaultValue={S.marca || ""}
              placeholder="Nombre de tu tienda"
              onChange={(e) => setSettings({ marca: e.target.value })}
              className={fieldClass}
            />
          )}
        </LabeledField>
        <Link
          href={copilotoHref("productos", "ficha")}
          className={buttonClass("secondary", "md")}
        >
          <PenLine aria-hidden className="size-4" /> Editar público, beneficio y
          ángulos
        </Link>
      </div>
      <SubTabs
        label="Secciones de marketing"
        current={tab}
        items={MKTABS.map((t, i) => ({
          key: t.code,
          label: `${i + 1} · ${["Ofertas (upsell y downsell)", "Creativos y anuncios", "Página y WhatsApp", "Plan de lanzamiento"][i]}`,
          href: copilotoHref("marketing", t.slug),
        }))}
      />
      {tab === "ofertas" && (
        <Ofertas
          c={c}
          st={st}
          setMk={setMk}
          toast={toast}
          mentor={mentorOffers}
        />
      )}
      {tab === "creativos" && (
        <Creativos
          c={c}
          st={st}
          setMk={setMk}
          toast={toast}
          mentor={mentorCreatives}
        />
      )}
      {tab === "pagina" && <Pagina c={c} toast={toast} />}
      {tab === "lanz" && <Lanzamiento c={c} />}
      {toast.node}
    </section>
  );
}

/* ───────────── Ofertas ───────────── */

function Ofertas({
  c,
  st,
  setMk,
  toast,
  mentor,
}: {
  c: MkCtx;
  st: MkState;
  setMk: (p: Partial<MkState>) => void;
  toast: Toast;
  mentor?: ReactNode;
}) {
  const { S, fmt, updateProduct, setProductState } = useCopiloto();
  const p = c.p;
  const list = offers(c, st, fmt.money);
  const setOff = (id: string, k: "precio" | "costo" | "tasa", v: string) =>
    setMk({
      off: { ...st.off, [id]: { ...(st.off[id] || {}), [k]: Number(v) || 0 } },
    });
  return (
    <div className="space-y-4">
      <Edu>
        <strong>¿Para qué sirve?</strong> Subir lo que te paga cada cliente
        (ticket promedio) sin pagar más publicidad. Si cada pedido deja más,
        puedes pagar un CPA más alto, ganarle a la competencia en la subasta y
        escalar con más margen. En contraentrega el mejor momento para ofrecer
        es <strong>la llamada o el WhatsApp de confirmación</strong>. Ajusta
        precio, costo y % de aceptación de cada oferta y mira el efecto en vivo.
      </Edu>
      {(p.upTasa as number) > 0 && (
        <ToneAlert tone="g">
          Oferta activa en el producto: upsell de{" "}
          {fmt.money(p.upPrecio as number)} con {String(p.upTasa)}% de
          aceptación. La usan la calculadora de precio, el simulador y el
          análisis.
        </ToneAlert>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => {
          const r = offerCalc(o, p, S.risk, fmt);
          const tip = tipFor(o.tipo);
          const Icon = r.good ? CheckCircle2 : TONE_ICON.a;
          return (
            <article
              key={o.id}
              aria-labelledby={`of-${o.id}`}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <p className="t-overline flex items-center gap-1.5 text-muted">
                {o.tipo}
                {tip && <InfoTip text={tip.text} label={tip.term} />}
              </p>
              <h3
                id={`of-${o.id}`}
                className="-mt-2 text-lg font-semibold text-ink"
              >
                {o.nombre}
              </h3>
              <p className="text-sm text-ink-2">{o.what}</p>
              <div className="grid grid-cols-[1fr_1fr_72px] gap-2">
                {(
                  [
                    ["precio", "Precio"],
                    ["costo", "Costo"],
                    ["tasa", "% acepta"],
                  ] as const
                ).map(([k, l]) => (
                  <LabeledField key={k} label={l}>
                    {(id) => (
                      <input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={k === "tasa" ? 1 : k === "costo" ? 500 : 1000}
                        value={Math.round(o[k])}
                        onChange={(e) => setOff(o.id, k, e.target.value)}
                        className={cn(
                          fieldClass,
                          "px-2 text-right text-sm tabular [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
                        )}
                      />
                    )}
                  </LabeledField>
                ))}
              </div>
              <div
                className={cn(
                  "flex gap-2 rounded-md px-3 py-2.5 text-sm text-ink",
                  r.good ? "bg-pos-soft" : "bg-warn-soft",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    r.good ? "text-pos" : "text-warn",
                  )}
                />
                <p>
                  <span className="sr-only">
                    {r.good ? "Mejora: " : "Atención: "}
                  </span>
                  <RichText r={r.info} />
                </p>
              </div>
              <p className="text-xs text-ink-2">
                <strong className="font-semibold text-ink">Cuándo:</strong>{" "}
                {o.cuando}
              </p>
              <div className="rounded-md bg-surface-2 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted">Guion</span>
                  <CopyButton
                    text={o.guion}
                    toast={toast}
                    what={`guion de ${o.nombre}`}
                  />
                </div>
                <p className="text-sm text-ink">{o.guion}</p>
              </div>
              {!o.down && !o.cross && (
                <button
                  type="button"
                  className={buttonClass(
                    "secondary",
                    "md",
                    "mt-auto self-start",
                  )}
                  onClick={() => {
                    updateProduct(p.id, {
                      upPrecio: o.precio,
                      upCosto: o.costo,
                      upTasa: o.tasa,
                    });
                    setProductState(p.id, "pc", null);
                    toast.show("Oferta aplicada al producto");
                  }}
                >
                  Usar esta oferta en el producto
                </button>
              )}
            </article>
          );
        })}
      </div>
      <section aria-labelledby="ideas-t" className={card}>
        <h3 id="ideas-t" className="text-base font-semibold text-ink">
          Ideas de complementos para tu nicho
        </h3>
        <p className="mt-1 text-sm text-muted">
          Para {c.cat.toLowerCase()}, lo que más se agrega es:
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {c.N.comp.map((x) => (
            <li
              key={x}
              className="rounded-md bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-ink"
            >
              {x}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-2">
          Busca estos complementos en Dropi con el mismo proveedor para que
          viajen en el mismo envío (sin flete extra). Fechas fuertes para este
          nicho: {c.N.regalo}.
        </p>
      </section>
      {mentor}
    </div>
  );
}

/* ───────────── Creativos ───────────── */

function splitTime(l: string): [string, string] {
  const i = l.indexOf(" · ");
  return i > 0 && i < 12 ? [l.slice(0, i), l.slice(i + 3)] : ["", l];
}

function Creativos({
  c,
  st,
  setMk,
  toast,
  mentor,
}: {
  c: MkCtx;
  st: MkState;
  setMk: (p: Partial<MkState>) => void;
  toast: Toast;
  mentor?: ReactNode;
}) {
  const { fmt } = useCopiloto();
  const A = angles(c);
  const ang = st.ang < A.length ? st.ang : 0;
  const H = hooks(c, fmt.money);
  const ac = adCopy(c);
  const m = matrix(c, ang, fmt.money);
  const checks = new Set(st.check ?? []);
  return (
    <div className="space-y-5">
      <Edu>
        <strong>Cómo usarlo:</strong> elige un ángulo, toma 3 ganchos distintos
        y graba un video corto por cada uno con el guion. Lanza los 3 a la vez
        con el mismo presupuesto: el que tenga mejor CTR y CPA es el ganador y
        de ese haces variaciones.{" "}
        <strong>Los primeros 3 segundos deciden el 80% del resultado.</strong>
      </Edu>

      <fieldset className="min-w-0">
        <legend className="t-overline mb-2 text-muted">Ángulo de venta</legend>
        <div className="flex flex-wrap gap-2">
          {A.map((a, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === ang}
              onClick={() => setMk({ ang: i })}
              className={cn(
                "min-h-10 rounded-full border px-3 py-1.5 text-left text-sm",
                i === ang
                  ? "border-ink bg-ink font-semibold text-surface"
                  : "border-border-strong text-ink hover:bg-surface-2",
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </fieldset>

      <section aria-labelledby="hk-t">
        <h3 id="hk-t" className="mb-3 text-lg font-semibold text-ink">
          10 ganchos para los primeros 3 segundos
        </h3>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {H.map((x, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-xs font-semibold text-ink-2"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{x.h}</p>
                <p className="mt-0.5 text-xs text-muted">{x.t}</p>
              </div>
              <CopyButton text={x.h} toast={toast} what={`gancho ${i + 1}`} />
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sc-t">
        <h3 id="sc-t" className="text-lg font-semibold text-ink">
          Guiones de video (TikTok / Reels)
        </h3>
        <p className="mt-1 mb-3 text-sm text-muted">
          Ángulo elegido: <strong className="text-ink">{A[ang]}</strong>. Úsalo
          en el texto en pantalla y en el llamado final.
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {scripts(c).map((x) => (
            <article key={x.t} className="rounded-lg bg-surface-2 p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-ink">
                  {x.t} <span className="font-normal text-muted">{x.d}</span>
                </h4>
                <CopyButton
                  text={scriptText(x)}
                  toast={toast}
                  what={`guion ${x.t}`}
                />
              </div>
              <ol className="space-y-1.5">
                {x.s.map((l, i) => {
                  const [t, d] = splitTime(l);
                  return (
                    <li
                      key={i}
                      className="grid grid-cols-[64px_1fr] gap-2 text-sm"
                    >
                      <span className="font-semibold text-brand tabular">
                        {t}
                      </span>
                      <span className="text-ink">{d}</span>
                    </li>
                  );
                })}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="ad-t" className={card}>
          <h3 id="ad-t" className="mb-3 text-lg font-semibold text-ink">
            Textos del anuncio
          </h3>
          <div className="space-y-3">
            {ac.prim.map((t, i) => (
              <div key={i}>
                <p className="mb-1 text-xs text-muted">
                  Texto principal {i + 1}
                </p>
                <Say text={t} toast={toast} what={`texto principal ${i + 1}`} />
              </div>
            ))}
          </div>
          <h4 className="t-overline mt-5 mb-2 text-muted">Titulares</h4>
          <ul className="divide-y divide-border">
            {ac.head.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 py-2 text-sm text-ink"
              >
                <span>{t}</span>
                <CopyButton text={t} toast={toast} what={`titular ${i + 1}`} />
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-4">
          <section aria-labelledby="mx-t" className={card}>
            <h3 id="mx-t" className="text-lg font-semibold text-ink">
              Matriz de test (3 × 3)
            </h3>
            <p className="mt-1 mb-3 text-xs text-muted">
              3 ganchos × 3 ángulos = 9 combinaciones. Empieza con la diagonal
              (3 videos) y luego prueba las demás con el ganador.
            </p>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th scope="col" className="py-2 pr-2 font-medium">
                      Gancho \ ángulo
                    </th>
                    {m.cols.map((a, j) => (
                      <th key={j} scope="col" className="py-2 pr-2 font-medium">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.rows.map((h, i) => (
                    <tr key={i} className="border-t border-border">
                      <th
                        scope="row"
                        className="py-2 pr-2 text-left font-normal text-ink"
                      >
                        {h}
                      </th>
                      {m.cols.map((_, j) => (
                        <td key={j} className="py-2 pr-2">
                          {i === j ? (
                            <ToneBadge tone="g">Video {i + 1}</ToneBadge>
                          ) : (
                            <span className="text-xs text-muted">después</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div role="group" aria-labelledby="ck-t" className={card}>
            <h3 id="ck-t" className="mb-3 text-lg font-semibold text-ink">
              Checklist del creativo
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CREATIVE_CHECK.map((t, i) => (
                <label
                  key={i}
                  className="flex min-h-10 items-start gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                    checked={checks.has(i)}
                    onChange={(e) => {
                      const next = new Set(checks);
                      if (e.target.checked) next.add(i);
                      else next.delete(i);
                      setMk({ check: [...next].sort((a, b) => a - b) });
                    }}
                  />
                  {t}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {checks.size}/8 listos. Se guarda para este producto.
            </p>
          </div>
        </div>
      </div>
      {mentor}
    </div>
  );
}

/* ───────────── Página y WhatsApp ───────────── */

function Pagina({ c, toast }: { c: MkCtx; toast: Toast }) {
  const { S, fmt } = useCopiloto();
  const pg = pageTexts(c, fmt);
  const wa = waMessages(c, S.marca, fmt.money);
  return (
    <div className="space-y-4">
      <Edu>
        <strong>La página de producto es la que vende.</strong> Orden
        recomendado: título con beneficio → video o GIF en uso → precio tachado
        y oferta → 3–5 beneficios → reseñas → preguntas frecuentes → garantía y
        “pagas al recibir”. Los mensajes de WhatsApp suben la confirmación y la
        entrega, que en contraentrega son tu utilidad.
      </Edu>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="pg-t" className={cn(card, "space-y-3")}>
          <h3 id="pg-t" className="text-lg font-semibold text-ink">
            Textos de la página
          </h3>
          <h4 className="t-overline text-muted">Título</h4>
          <Say text={pg.tit} toast={toast} what="título" />
          <h4 className="t-overline text-muted">Precio</h4>
          <div className="rounded-md bg-surface-2 p-3 text-sm text-ink">
            {pg.tachado && (
              <>
                <s className="text-muted">{fmt.money(pg.ancla)}</s> →{" "}
              </>
            )}
            <strong>{fmt.money(c.p.precio)}</strong>
            {pg.tachado
              ? ` (ahorras ${fmt.pct(pg.ahorro)})`
              : " · agrega un precio tachado en la ficha"}
          </div>
          <h4 className="t-overline text-muted">Beneficios</h4>
          <Say text={pg.bul.join("\n")} toast={toast} what="beneficios" />
          <h4 className="t-overline text-muted">Preguntas frecuentes</h4>
          <dl className="space-y-2">
            {pg.faq.map(([q, a]) => (
              <div
                key={q}
                className="rounded-md border border-border p-3 text-sm"
              >
                <dt className="font-semibold text-ink">{q}</dt>
                <dd className="text-ink-2">{a}</dd>
              </div>
            ))}
          </dl>
          {!c.objs.length && (
            <p className="text-xs text-muted">
              Escribe las objeciones en la ficha y aparecerán aquí como
              preguntas.
            </p>
          )}
          <CopyButton
            text={pg.desc}
            toast={toast}
            label="Copiar descripción completa"
            done="Descripción copiada"
          />
        </section>
        <section aria-labelledby="wa-t" className={cn(card, "space-y-3")}>
          <h3 id="wa-t" className="text-lg font-semibold text-ink">
            Mensajes de WhatsApp
          </h3>
          <p className="text-sm text-muted">
            Reemplaza lo que está entre llaves. El mensaje 6 es clave: muchas
            devoluciones son porque el cliente no estaba en casa.
          </p>
          {wa.map(([t, m]) => (
            <div key={t}>
              <h4 className="mb-1 text-sm font-semibold text-ink">{t}</h4>
              <Say text={m} toast={toast} what={`mensaje ${t}`} />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

/* ───────────── Plan de lanzamiento ───────────── */

function Lanzamiento({ c }: { c: MkCtx }) {
  const { S, fmt } = useCopiloto();
  const L = launch(c.p, S.risk, fmt.money);
  const tip = (t: string) => {
    const x = tipFor(t);
    return x ? <InfoTip text={x.text} label={x.term} /> : null;
  };
  const rows: [string, string, string][] = [
    [
      "CTR",
      "≥ 1,2%",
      "El creativo: cambia el gancho de los primeros 3 segundos.",
    ],
    [
      "Conversión",
      "≥ 1,5%",
      "La página o la oferta: precio tachado, reseñas, combo, garantía.",
    ],
    [
      "CPA",
      `≤ ${fmt.money(L.g.cpaObj)}`,
      "La combinación creativo + página; o el precio es bajo para lo que cuesta vender.",
    ],
    [
      "% confirmación",
      "≥ 80%",
      "La velocidad de respuesta en WhatsApp (menos de 1 hora).",
    ],
    [
      "% entrega",
      "≥ 80%",
      "Direcciones mal tomadas, cliente ausente, transportadora o zona.",
    ],
  ];
  return (
    <div className="space-y-4">
      <Edu>
        <strong>Un test bien hecho responde una sola pregunta:</strong> ¿este
        producto, con esta oferta, consigue pedidos a un CPA que me deja ganar?
        El plan se arma con tu nivel de riesgo y la unidad económica del
        producto.
      </Edu>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          t="Presupuesto del test"
          v={fmt.money(L.g.presTest)}
          s={`${L.R.pedidosDecidir} pedidos a CPA objetivo`}
        />
        <Kpi t="Pauta diaria" v={fmt.money(L.diario)} s={`${L.dias} días`} />
        <Kpi
          t="CPA objetivo"
          v={fmt.money(L.g.cpaObj)}
          s={`máximo ${fmt.money(L.U.cpaMax)}`}
          tone="g"
        />
        <Kpi
          t="Corte sin ventas"
          v={fmt.money(L.R.killMult * L.U.cpaMax)}
          s={`${L.R.killMult.toFixed(1).replace(".", ",")}× CPA máximo`}
          tone="r"
        />
      </div>
      {!L.g.pass && (
        <ToneAlert tone="r">
          Este producto no pasa la validación de margen. Revisa el precio en 2 ·
          Productos › Precio y margen antes de lanzar.
        </ToneAlert>
      )}
      <section aria-labelledby="ps-t" className={card}>
        <h3 id="ps-t" className="mb-3 text-lg font-semibold text-ink">
          Paso a paso
        </h3>
        <ol className="space-y-2">
          {L.steps.map(([t, d], i) => {
            const tone = i === 3 ? "a" : i === 4 ? "g" : null;
            const Icon = tone ? TONE_ICON[tone] : null;
            return (
              <li
                key={t}
                className="flex gap-3 rounded-md border border-border px-3 py-2.5 text-sm"
              >
                {Icon ? (
                  <Icon
                    aria-hidden
                    className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT[tone!])}
                  />
                ) : (
                  <span aria-hidden className="mt-0.5 size-4 shrink-0" />
                )}
                <p>
                  <strong className="block font-semibold text-ink">{t}</strong>
                  <span className="text-ink-2">{d}</span>
                </p>
              </li>
            );
          })}
        </ol>
      </section>
      <section aria-labelledby="qm-t" className={card}>
        <h3 id="qm-t" className="mb-3 text-lg font-semibold text-ink">
          Qué mirar y qué significa
        </h3>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Indicador
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Sano
                </th>
                <th scope="col" className="py-2 font-medium">
                  Si está mal, el problema es…
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, sano, prob]) => (
                <tr key={k} className="border-t border-border">
                  <th
                    scope="row"
                    className="py-2 pr-3 text-left font-semibold text-ink"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {k}
                      {tip(
                        k === "% confirmación"
                          ? "confirmación"
                          : k === "% entrega"
                            ? "entrega"
                            : k,
                      )}
                    </span>
                  </th>
                  <td className="py-2 pr-3 whitespace-nowrap tabular">
                    {sano}
                  </td>
                  <td className="py-2 text-ink-2">{prob}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        <Link
          href={copilotoHref("marketing", "creativos")}
          className={buttonClass("primary", "md")}
        >
          <FilePenLine aria-hidden className="size-4" /> Ver los creativos
        </Link>
        <Link
          href={copilotoHref("productos", "res")}
          className={buttonClass("secondary", "md")}
        >
          <ReceiptText aria-hidden className="size-4" /> Registrar resultados
        </Link>
      </div>
    </div>
  );
}
