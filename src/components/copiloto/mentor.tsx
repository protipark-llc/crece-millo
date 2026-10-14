"use client";

import { useState, type ReactNode } from "react";
import { Copy, Sparkles } from "lucide-react";
import type { MentorAction, MentorResult } from "@/lib/copiloto/mentor";
import type { Product } from "@/lib/copiloto/state";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "./store";
import { ToneAlert, useToast } from "./ui";

type Res =
  | { ok: true; data: unknown; restantes: number }
  | { ok: false; error: string; prompt?: string; restantes?: number };

/** Pide al servidor una respuesta del mentor. El servidor arma el prompt con tu estado guardado. */
async function askMentor(
  action: MentorAction,
  extra: Record<string, unknown>,
  flush: () => Promise<void>,
): Promise<Res> {
  await flush();
  try {
    const r = await fetch("/api/copiloto/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    return (await r.json()) as Res;
  } catch {
    return {
      ok: false,
      error: "Sin conexión. Revisa tu internet e intenta de nuevo.",
    };
  }
}

const TONE_CLS = {
  pos: "text-pos",
  warn: "text-warn",
  neg: "text-neg",
  info: "text-info",
} as const;

const Box = ({
  t,
  v,
  tone,
}: {
  t: string;
  v?: string | string[];
  tone?: "pos" | "warn" | "neg" | "info";
}) =>
  v && (Array.isArray(v) ? v.length : v.trim()) ? (
    <div className="rounded-md border border-border p-3 text-sm">
      <p
        className={cn("t-overline mb-1", tone ? TONE_CLS[tone] : "text-muted")}
      >
        {t}
      </p>
      <p className="text-ink">{Array.isArray(v) ? v.join(" · ") : v}</p>
    </div>
  ) : null;

const List = ({ t, a }: { t: string; a?: string[] }) =>
  a && a.length ? (
    <div className="text-sm">
      <p className="t-overline mb-1 text-muted">{t}</p>
      <ol className="list-decimal space-y-1 pl-5 text-ink">
        {a.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ol>
    </div>
  ) : null;

const Lead = ({ k, v }: { k: string; v: string }) => (
  <p className="text-sm text-ink">
    <strong className="text-brand">{k}:</strong> {v}
  </p>
);

/** Cómo se pinta cada respuesta (los render del original, L777, L960, L963, L1164, L1168, L1172). */
function render(a: MentorAction, d: unknown): ReactNode {
  if (a === "producto") {
    const j = d as MentorResult<"producto">;
    return (
      <>
        <Lead k="Estado" v={j.estado} />
        <p className="text-sm text-ink-2">{j.diagnostico}</p>
        <List t="Estrategia" a={j.estrategia} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Box t="Creativos" v={j.creativos} tone="info" />
          <Box t="Página y oferta" v={j.pagina_oferta} tone="pos" />
          <Box t="Logística y entregas" v={j.logistica} tone="warn" />
          <Box t="Presupuesto" v={j.presupuesto} />
        </div>
        <Box t="Siguiente paso" v={j.siguiente_paso} tone="neg" />
      </>
    );
  }
  if (a === "ofertas") {
    const j = d as MentorResult<"ofertas">;
    return (["upsells", "downsells", "cross_sells"] as const).map((k) =>
      j[k]?.length ? (
        <div key={k} className="space-y-2">
          <p className="t-overline text-muted">{k.replace("_", "-")}</p>
          {j[k].map((o, i) => (
            <div key={i} className="rounded-md bg-surface-2 p-3 text-sm">
              <p className="font-semibold text-ink">
                {o.nombre}{" "}
                <span className="ml-1 rounded-sm bg-info-soft px-1.5 py-0.5 text-xs text-info">
                  {o.precio}
                </span>
              </p>
              <p className="mt-1 text-ink-2">{o.por_que}</p>
              <p className="mt-2 rounded-md bg-surface p-2 text-ink">
                {o.mensaje}
              </p>
            </div>
          ))}
        </div>
      ) : null,
    );
  }
  if (a === "creativos") {
    const j = d as MentorResult<"creativos">;
    return (
      <>
        <List t="Ganchos" a={j.ganchos} />
        {j.guiones?.map((g, i) => (
          <div key={i} className="rounded-md bg-surface-2 p-3 text-sm">
            <p className="font-semibold text-ink">
              {g.titulo}{" "}
              <span className="font-normal text-muted">{g.duracion}</span>
            </p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-ink">
              {g.escenas.map((e, k) => (
                <li key={k}>{e}</li>
              ))}
            </ol>
          </div>
        ))}
        <List t="Textos" a={j.textos} />
        <List t="Titulares" a={j.titulares} />
      </>
    );
  }
  if (a === "test") {
    const j = d as MentorResult<"test">;
    return (
      <>
        <Lead k="Veredicto" v={j.veredicto} />
        <p className="text-sm text-ink-2">{j.diagnostico}</p>
        <List t="Acciones" a={j.acciones} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Box t="Ajuste de ads" v={j.ajuste_ads} tone="info" />
          <Box t="Foco UX / tienda" v={j.foco_ux} tone="pos" />
          <Box t="Riesgo a vigilar" v={j.riesgo} tone="warn" />
          <Box t="Siguiente paso" v={j.siguiente_paso} />
        </div>
      </>
    );
  }
  if (a === "plan") {
    const j = d as MentorResult<"plan">;
    return (
      <>
        <Lead k="Propósito" v={j.proposito} />
        <p className="text-sm text-ink-2">{j.propuesta_capital}</p>
        <List t="Próximos pasos" a={j.proximos_pasos} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Box t="Riesgo" v={j.justificacion_riesgo} tone="warn" />
          <Box t="Advertencia" v={j.advertencia} tone="neg" />
        </div>
      </>
    );
  }
  if (a === "semanal") {
    const j = d as MentorResult<"semanal">;
    return (
      <>
        <Lead k="Resumen" v={j.resumen} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Box t="Escalar" v={j.escalar} tone="pos" />
          <Box t="Optimizar" v={j.optimizar} tone="warn" />
          <Box t="Matar" v={j.matar} tone="neg" />
          <Box t="Siguiente test" v={j.siguiente_test} tone="info" />
        </div>
        <Box t="Capital esta semana" v={j.capital_semana} />
        <List t="Foco de la semana" a={j.foco_semana} />
      </>
    );
  }
  return null;
}

/**
 * Tarjeta del mentor: botón, esqueleto mientras piensa (aria-live), respuesta validada y la nota
 * «Respuesta generada por IA». Si falla, muestra el error y deja copiar el análisis para Claude.
 */
export function Mentor({
  action,
  label,
  intro,
  extra,
  onResult,
  doneMsg = "Textos mejorados con IA",
  compact,
}: {
  action: MentorAction;
  label: string;
  intro?: string;
  extra?: () => Record<string, unknown>;
  /** Para acciones que aplican la respuesta (alta rápida) en vez de mostrarla. */
  onResult?: (data: unknown) => void;
  /** Aviso cuando onResult aplica la respuesta. */
  doneMsg?: string;
  compact?: boolean;
}) {
  const { flush } = useCopiloto();
  const toast = useToast();
  const [state, setState] = useState<{ loading: boolean; res: Res | null }>({
    loading: false,
    res: null,
  });
  const go = async () => {
    setState({ loading: true, res: null });
    const res = await askMentor(action, extra?.() ?? {}, flush);
    if (res.ok && onResult) {
      onResult(res.data);
      toast.show(doneMsg);
      setState({ loading: false, res: null });
      return;
    }
    setState({ loading: false, res });
  };
  const btn = (
    <button
      type="button"
      onClick={go}
      disabled={state.loading}
      className={buttonClass("secondary", "md", "disabled:opacity-60")}
    >
      <Sparkles aria-hidden className="size-4 text-brand" />{" "}
      {state.loading ? "Consultando al mentor…" : label}
    </button>
  );
  const out = (
    <div aria-live="polite" className="contents">
      {state.loading && (
        <div
          role="status"
          className="mt-3 space-y-2 rounded-lg border border-border bg-surface p-4"
        >
          <span className="sr-only">El mentor está pensando…</span>
          {[90, 70, 80, 50].map((w, i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded bg-surface-3 motion-reduce:animate-none"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}
      {state.res && state.res.ok && (
        <div className="mt-3 space-y-3 rounded-lg border border-info bg-surface p-4">
          {render(action, state.res.data)}
          <p className="border-t border-border pt-2 text-xs text-muted">
            Respuesta generada por IA. No es asesoría financiera. Te quedan{" "}
            {state.res.restantes} consultas hoy.
          </p>
        </div>
      )}
      {state.res && !state.res.ok && (
        <div className="mt-3 space-y-2">
          <ToneAlert tone="a">{state.res.error}</ToneAlert>
          {state.res.prompt && (
            <CopyPrompt prompt={state.res.prompt} toast={toast} />
          )}
        </div>
      )}
    </div>
  );
  if (compact)
    return (
      <>
        {btn}
        {out}
        {toast.node}
      </>
    );
  return (
    <div className="rounded-lg border border-dashed border-border-strong p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-md bg-brand-soft"
        >
          <Sparkles className="size-4 text-brand" />
        </span>
        {intro && (
          <p className="min-w-0 flex-1 basis-56 text-sm text-ink-2">{intro}</p>
        )}
        {btn}
      </div>
      {out}
      {toast.node}
    </div>
  );
}

/** Respuesta del mentor guardada (p. ej. la estrategia de la ficha), con su fecha. */
export function MentorView({
  action,
  data,
  ts,
}: {
  action: MentorAction;
  data: unknown;
  ts: number;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-info bg-surface p-4">
      {render(action, data)}
      <p className="border-t border-border pt-2 text-xs text-muted">
        Generada por IA el{" "}
        {new Date(ts).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
        . No es asesoría financiera.
      </p>
    </div>
  );
}

function CopyPrompt({
  prompt,
  toast,
}: {
  prompt: string;
  toast: ReturnType<typeof useToast>;
}) {
  return (
    <details className="rounded-md border border-border bg-surface p-3 text-sm">
      <summary className="cursor-pointer font-semibold text-ink">
        Copiar el análisis para Claude
      </summary>
      <textarea
        readOnly
        value={prompt}
        rows={6}
        aria-label="Análisis para copiar en Claude"
        className="mt-2 w-full rounded-md border border-border bg-surface-2 p-2 text-xs text-ink"
      />
      <button
        type="button"
        className={buttonClass("secondary", "sm", "mt-2")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(prompt);
            toast.show("Copiado");
          } catch {
            toast.show("No se pudo copiar. Selecciona el texto y cópialo.");
          }
        }}
      >
        <Copy aria-hidden className="size-4" /> Copiar para Claude
      </button>
    </details>
  );
}

/** Botón «Mejorar textos con IA» de Alta rápida: aplica la respuesta al borrador (qaAI, L1036). */
export function AltaAI({
  draft,
  apply,
}: {
  draft: Product;
  apply: (j: MentorResult<"alta">) => void;
}) {
  return (
    <Mentor
      compact
      action="alta"
      label="Mejorar textos con IA"
      extra={() => ({ draft })}
      onResult={(d) => apply(d as MentorResult<"alta">)}
    />
  );
}
