"use client";

import { Mentor } from "./mentor";
import { useActionState, useEffect, useId, useRef } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet, Trash2, Upload, X } from "lucide-react";
import { E, type TestResult } from "@/lib/copiloto/engine";
import { copilotoHref } from "@/lib/copiloto/nav";
import { testsCsv, verdictTone } from "@/lib/copiloto/logic";
import type { Saved } from "@/lib/copiloto/state";
import {
  importBackupAction,
  resetCopilotoAction,
} from "@/app/(app)/comunidad/emprendedores/copiloto/respaldo-actions";
import type { ActionState } from "@/server/action-utils";
import { EmptyState, buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "./store";
import { ToneBadge } from "./tone";
import { ConfirmButton, Kpi, ToneAlert, downloadText, fieldClass } from "./ui";

const card = "rounded-lg border border-border bg-surface p-4 sm:p-5";
const th =
  "border-b border-border px-3 py-2 text-xs font-medium whitespace-nowrap text-muted";
const td = "border-b border-border px-3 py-2.5 whitespace-nowrap tabular";
const isoDay = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/** Bitácora (renderBitacora, L1133–1146). */
export function Bitacora() {
  const { S, fmt, demo, removeTest, removeSaved } = useCopiloto();
  const real = E.real(S.tests);
  const all = ([...S.plans, ...S.sims] as Saved[]).sort((a, b) => b.ts - a.ts);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi t="Tests guardados" v={S.tests.length} />
        <Kpi
          t="Ganadores"
          v={S.tests.filter((t) => /Escalar/.test(t.verdict)).length}
          s="veredicto Escalar"
          tone="g"
        />
        <Kpi
          t="Muertos"
          v={S.tests.filter((t) => /matar/i.test(t.verdict)).length}
          s="aprendizaje pagado"
          tone="r"
        />
        <Kpi
          t="ROAS real"
          v={real ? fmt.x(real.roas) : "—"}
          s={real ? `CPA ${fmt.money(real.cpa)}` : "sin datos"}
        />
        <Kpi
          t="% entrega real"
          v={real ? fmt.pct(real.entrega) : "—"}
          s="ponderado"
        />
        <Kpi
          t="Utilidad neta tests"
          v={real ? fmt.money(real.neta) : "—"}
          tone={real ? (real.neta >= 0 ? "g" : "r") : null}
          s={real ? "" : undefined}
        />
      </div>

      <section aria-labelledby="bt-t" className={card}>
        <h2 id="bt-t" className="mb-3 text-lg font-semibold text-ink">
          Tests guardados
        </h2>
        {S.tests.length === 0 ? (
          <EmptyState
            title="Aún no hay tests"
            action={
              <Link
                href={copilotoHref("productos", "res")}
                className={buttonClass("secondary", "md")}
              >
                Registrar un resultado
              </Link>
            }
          >
            Regístralos en Productos › Resultados de venta o en Analizar test.
          </EmptyState>
        ) : (
          <div tabIndex={0} role="region" aria-label="Tabla con desplazamiento" className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="text-left">
                  {[
                    "Fecha",
                    "Test",
                    "Producto",
                    "Riesgo",
                    "Ads",
                    "Pedidos",
                    "Entrega",
                    "ROAS",
                    "CPA",
                    "U. neta",
                    "Veredicto",
                  ].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={cn(th, i >= 3 && i <= 9 && "text-right")}
                    >
                      {h}
                    </th>
                  ))}
                  <th scope="col" className={th}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {S.tests.map((t) => {
                  const c = t.c as unknown as TestResult;
                  const fecha = fmt.fecha(isoDay(t.ts));
                  return (
                    <tr key={t.id}>
                      <td className={td}>{fecha}</td>
                      <td className={cn(td, "max-w-56 whitespace-normal")}>
                        {String(t.form.nombre || "—")}
                      </td>
                      <td className={cn(td, "max-w-56 whitespace-normal")}>
                        {t.producto}
                      </td>
                      <td className={cn(td, "text-right")}>{t.risk}</td>
                      <td className={cn(td, "text-right")}>
                        {fmt.money(c.ads)}
                      </td>
                      <td className={cn(td, "text-right")}>{c.ped}</td>
                      <td className={cn(td, "text-right")}>
                        {fmt.pct(c.tasaEntrega)}
                      </td>
                      <td className={cn(td, "text-right")}>{fmt.x(c.roas)}</td>
                      <td className={cn(td, "text-right")}>
                        {fmt.money(c.cpa)}
                      </td>
                      <td
                        className={cn(
                          td,
                          "text-right font-semibold",
                          c.neta >= 0 ? "text-pos" : "text-neg",
                        )}
                      >
                        {fmt.money(c.neta)}
                      </td>
                      <td className={td}>
                        <ToneBadge tone={verdictTone(t.verdict)}>
                          {t.verdict}
                        </ToneBadge>
                      </td>
                      <td className={td}>
                        <ConfirmButton
                          aria-label={`Borrar el test ${String(t.form.nombre || "")} del ${fecha}`}
                          className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-neg"
                          title="¿Borrar este test?"
                          description="Se quita de la bitácora y del historial del producto."
                          confirmLabel="Borrar"
                          onConfirm={() => removeTest(t.id)}
                        >
                          <X aria-hidden className="size-4" />
                        </ConfirmButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="bp-t" className={card}>
        <h2 id="bp-t" className="mb-3 text-lg font-semibold text-ink">
          Planes y simulaciones
        </h2>
        {all.length === 0 ? (
          <EmptyState
            title="Aún no guardas planes ni simulaciones"
            action={
              <Link
                href={copilotoHref("crecer")}
                className={buttonClass("secondary", "md")}
              >
                Ir a Crecer
              </Link>
            }
          >
            Cuando guardes un plan en Planificar capital o una simulación en
            Crecer, quedan aquí con fecha y riesgo.
          </EmptyState>
        ) : (
          <div tabIndex={0} role="region" aria-label="Tabla con desplazamiento" className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left">
                  {["Fecha", "Tipo", "Riesgo", "Detalle"].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={cn(th, i === 2 && "text-right")}
                    >
                      {h}
                    </th>
                  ))}
                  <th scope="col" className={th}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {all.map((x) => {
                  const fecha = fmt.fecha(isoDay(x.ts));
                  const r = x.resumen as Record<string, number | null>;
                  const detail =
                    x.tipo === "Plan"
                      ? `Meta ${fmt.money(Number(x.form.R) || 0)}/${String(x.form.unidad)} · inyectar ${fmt.money(r.tot ?? 0)} · ROAS objetivo ${fmt.x(r.targetROAS ?? 0)}`
                      : `${x.producto ?? ""} · patrimonio ${fmt.money(r.patrimonio ?? 0)} · ROI ${fmt.pct(r.roi ?? 0)}${r.quiebra !== null && r.quiebra !== undefined ? " · se agota" : ""}`;
                  return (
                    <tr key={x.id}>
                      <td className={td}>{fecha}</td>
                      <td className={td}>{x.tipo}</td>
                      <td className={cn(td, "text-right")}>{x.risk}</td>
                      <td className={cn(td, "whitespace-normal")}>{detail}</td>
                      <td className={td}>
                        <ConfirmButton
                          aria-label={`Borrar ${x.tipo.toLowerCase()} del ${fecha}`}
                          className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-neg"
                          title={`¿Borrar ${x.tipo === "Plan" ? "este plan" : "esta simulación"}?`}
                          description="No se puede deshacer."
                          confirmLabel="Borrar"
                          onConfirm={() =>
                            removeSaved(
                              x.tipo === "Plan" ? "plan" : "sim",
                              x.id,
                            )
                          }
                        >
                          <X aria-hidden className="size-4" />
                        </ConfirmButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="rs-t" className={card}>
          <h2 id="rs-t" className="text-lg font-semibold text-ink">
            Revisión semanal con el mentor
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            Junta todo (productos, tests, plan, riesgo) y pide una revisión: qué
            escalar, qué matar y cuánto capital mover.
          </p>
          <div className="mt-3">
            <Mentor compact action="semanal" label="Hacer revisión semanal" />
          </div>
        </section>
        <Respaldo demo={demo} />
      </div>
    </div>
  );
}

function TestsCsvButton() {
  const { S } = useCopiloto();
  return (
    <button
      type="button"
      className={buttonClass("ghost", "md")}
      onClick={() => downloadText("tests_para_notion.csv", testsCsv(S))}
    >
      <FileSpreadsheet aria-hidden className="size-4" /> Tests a CSV (para
      Notion)
    </button>
  );
}

function Respaldo({ demo }: { demo: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [imp, importAction, importing] = useActionState<ActionState, FormData>(
    importBackupAction,
    { ok: false },
  );
  const [res, resetAction, resetting] = useActionState<ActionState, FormData>(
    resetCopilotoAction,
    { ok: false },
  );
  const dlgId = useId();
  // Tras importar o borrar, el estado del navegador se vuelve a cargar desde la cuenta.
  useEffect(() => {
    if (imp.ok || res.ok) {
      const t = setTimeout(() => window.location.reload(), 900);
      return () => clearTimeout(t);
    }
  }, [imp.ok, imp.nonce, res.ok, res.nonce]);
  return (
    <section aria-labelledby="rp-t" className={card}>
      <h2 id="rp-t" className="text-lg font-semibold text-ink">
        Respaldo y portabilidad
      </h2>
      {demo ? (
        <>
          <p className="mt-1 text-sm text-ink-2">
            En el modo ejemplo no hay datos tuyos que respaldar ni importar. Sal
            del ejemplo para respaldar tu cuenta.
          </p>
          <div className="mt-3">
            <TestsCsvButton />
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-2">
            Tus datos se guardan en tu cuenta de Crece Millo. Exporta un
            respaldo cuando quieras y guárdalo en Drive › Dropshipping › 4.
            Finanzas.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="/api/copiloto/exportar/respaldo"
              className={buttonClass("secondary", "md")}
            >
              <Download aria-hidden className="size-4" /> Exportar respaldo
              (JSON)
            </a>
            <form ref={formRef} action={importAction}>
              <input
                ref={fileRef}
                type="file"
                name="archivo"
                accept=".json,application/json"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={() => {
                  if (fileRef.current?.files?.length)
                    formRef.current?.requestSubmit();
                }}
              />
              <button
                type="button"
                disabled={importing}
                className={buttonClass(
                  "secondary",
                  "md",
                  "disabled:opacity-50",
                )}
                onClick={() => fileRef.current?.click()}
              >
                <Upload aria-hidden className="size-4" />{" "}
                {importing ? "Importando…" : "Importar respaldo"}
              </button>
            </form>
            <TestsCsvButton />
            <button
              type="button"
              className={buttonClass("ghost", "md", "text-neg")}
              onClick={() =>
                (
                  document.getElementById(dlgId) as HTMLDialogElement | null
                )?.showModal()
              }
            >
              <Trash2 aria-hidden className="size-4" /> Borrar todo
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Importar reemplaza todos tus datos del Co-Piloto por los del archivo
            (respaldos del original v3 o v4, o de Crece Millo).
          </p>
          <div aria-live="polite" className="mt-2 space-y-2">
            {imp.error && (
              <ToneAlert tone="r">
                {imp.fieldErrors?.archivo ?? imp.error}
              </ToneAlert>
            )}
            {imp.ok && imp.message && (
              <ToneAlert tone="g">{imp.message} Cargando tus datos…</ToneAlert>
            )}
            {res.ok && res.message && (
              <ToneAlert tone="g">{res.message}</ToneAlert>
            )}
          </div>
          <dialog
            id={dlgId}
            aria-labelledby={`${dlgId}-t`}
            className="m-auto w-[min(460px,calc(100vw-32px))] rounded-lg border border-border bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
          >
            <form action={resetAction} className="space-y-3 p-5">
              <h2 id={`${dlgId}-t`} className="text-lg font-semibold">
                ¿Borrar todos tus datos del Co-Piloto?
              </h2>
              <p className="text-sm text-ink-2">
                Se borran productos, tests, planes, simulaciones y la ruta.
                Vuelves a empezar con los productos de ejemplo. ¿Exportaste un
                respaldo?
              </p>
              <label className="block text-sm font-medium text-ink">
                Escribe BORRAR para confirmar
                <input
                  name="confirmacion"
                  autoComplete="off"
                  className={cn(fieldClass, "mt-1")}
                  aria-invalid={
                    res.fieldErrors?.confirmacion ? true : undefined
                  }
                />
              </label>
              {res.error && (
                <p className="text-sm text-neg">
                  {res.fieldErrors?.confirmacion ?? res.error}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="inline-flex h-11 items-center rounded-md px-4 text-sm font-semibold text-ink hover:bg-surface-2"
                  onClick={(e) =>
                    (
                      e.currentTarget.closest("dialog") as HTMLDialogElement
                    ).close()
                  }
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="inline-flex h-11 items-center rounded-md bg-neg px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {resetting ? "Borrando…" : "Borrar todo"}
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}
    </section>
  );
}
