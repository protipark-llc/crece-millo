"use client";

import { useState } from "react";
import { Eraser, Plus, X } from "lucide-react";
import { E, type TestResult } from "@/lib/copiloto/engine";
import { activeProduct, prodTests } from "@/lib/copiloto/logic";
import {
  CANALES,
  TO_EN_TEST,
  emptyRes,
  resInput,
  resultTest,
  type ResForm,
} from "@/lib/copiloto/productos";
import { todayLocal } from "@/lib/copiloto/today";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import { ConfirmButton, Kpi, LabeledField, fieldClass, useToast } from "../ui";

type NumKey = Exclude<keyof ResForm, "fecha" | "canal" | "notas">;
const COLS: [NumKey, string, string?][][] = [
  [
    ["dias", "Días que cubre"],
    ["ads", "Gasto en ads"],
  ],
  [
    ["imp", "Impresiones"],
    ["clics", "Clics"],
    ["ped", "Pedidos generados"],
    [
      "conf",
      "Pedidos confirmados",
      "Confirmados por WhatsApp y despachados. Vacío = todos.",
    ],
  ],
  [
    [
      "ent",
      "Pedidos entregados",
      "Vacío = se estima con el % de entrega esperado.",
    ],
    ["aov", "Ticket promedio (AOV)", "Vacío = precio + upsell esperado."],
  ],
];

const th =
  "border-b border-border px-3 py-2.5 text-xs font-medium whitespace-nowrap text-muted";
const td = "border-b border-border px-3 py-2.5 whitespace-nowrap tabular";

/** Resultados de venta (renderResults, L730–740): registro con vista previa en vivo e historial. */
export function Resultados() {
  const { S, fmt, addTest, updateProduct, removeTest } = useCopiloto();
  const p = activeProduct(S);
  const toast = useToast();
  const [v, setV] = useState<ResForm>(() => emptyRes(todayLocal()));
  const set = (k: keyof ResForm, val: string) =>
    setV((o) => ({ ...o, [k]: val }));
  const f = resInput(v, todayLocal());
  const c = E.test(f, p);
  const canSave = f.ads > 0 || f.ped > 0;
  const history = prodTests(S, p.id).slice().reverse();

  const numField = ([k, label, hint]: [NumKey, string, string?]) => (
    <LabeledField key={k} label={label} hint={hint}>
      {(id) => (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          value={v[k]}
          onChange={(e) => set(k, e.target.value)}
          className={cn(fieldClass, "text-right tabular")}
        />
      )}
    </LabeledField>
  );

  return (
    <div className="space-y-6">
      <form
        aria-labelledby="res-t"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          const today = todayLocal();
          addTest(resultTest(S, p, v, today));
          if (TO_EN_TEST.includes(p.etapa))
            updateProduct(p.id, { etapa: "En test" });
          setV(emptyRes(today));
          toast.show("Resultado registrado");
        }}
      >
        <h3 id="res-t" className="text-base font-semibold text-ink">
          Registrar resultado (un día, una semana o un test)
        </h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          <div className="space-y-3">
            <LabeledField label="Fecha">
              {(id) => (
                <input
                  id={id}
                  type="date"
                  value={v.fecha}
                  onChange={(e) => set("fecha", e.target.value)}
                  className={fieldClass}
                />
              )}
            </LabeledField>
            <LabeledField label="Canal">
              {(id) => (
                <select
                  id={id}
                  value={v.canal}
                  onChange={(e) => set("canal", e.target.value)}
                  className={fieldClass}
                >
                  {CANALES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              )}
            </LabeledField>
            {COLS[0]!.map(numField)}
          </div>
          <div className="space-y-3">{COLS[1]!.map(numField)}</div>
          <div className="space-y-3">
            {COLS[2]!.map(numField)}
            <LabeledField label="Notas (creativo, ángulo, cambio que hiciste)">
              {(id) => (
                <input
                  id={id}
                  value={v.notas}
                  onChange={(e) => set("notas", e.target.value)}
                  className={fieldClass}
                />
              )}
            </LabeledField>
          </div>
        </div>

        <Preview c={c} fmt={fmt} />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!canSave}
            className={buttonClass("primary", "md", "disabled:opacity-50")}
          >
            <Plus aria-hidden className="size-4" /> Registrar resultado
          </button>
          <button
            type="button"
            className={buttonClass("ghost", "md")}
            onClick={() => setV(emptyRes(todayLocal()))}
          >
            <Eraser aria-hidden className="size-4" /> Limpiar
          </button>
          {!canSave && (
            <p className="text-xs text-muted">
              Escribe el gasto en ads o los pedidos para registrar.
            </p>
          )}
        </div>
      </form>

      <section
        aria-labelledby="hist-t"
        className="rounded-lg border border-border bg-surface"
      >
        <h3
          id="hist-t"
          className="p-4 text-base font-semibold text-ink sm:px-5"
        >
          Historial de este producto
        </h3>
        <div
          tabIndex={0}
          role="region"
          aria-label="Tabla con desplazamiento"
          className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus"
        >
          <table className="w-full min-w-[1280px] text-sm">
            <thead>
              <tr className="text-left">
                {[
                  "Fecha",
                  "Canal",
                  "Días",
                  "Gasto",
                  "Impr.",
                  "Clics",
                  "CTR",
                  "Pedidos",
                  "Confirm.",
                  "Entreg.",
                  "Recaudo",
                  "ROAS",
                  "CPA",
                  "Neta",
                  "Veredicto",
                  "Notas",
                ].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(
                      th,
                      i >= 2 && i <= 13 && "text-right",
                      i === 0 && "pl-5",
                    )}
                  >
                    {h}
                  </th>
                ))}
                <th scope="col" className={cn(th, "pr-5")}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-5 py-6 text-center text-muted">
                    Todavía no hay resultados. Registra el primero arriba.
                  </td>
                </tr>
              ) : (
                history.map((t) => {
                  const r = t.c as unknown as TestResult;
                  const fecha = String(
                    t.form.fecha || new Date(t.ts).toISOString().slice(0, 10),
                  );
                  return (
                    <tr key={t.id}>
                      <td className={cn(td, "pl-5")}>{fecha}</td>
                      <td className={td}>{String(t.form.canal || "")}</td>
                      <td className={cn(td, "text-right")}>
                        {Number(t.form.dias) || "—"}
                      </td>
                      <td className={cn(td, "text-right")}>
                        {fmt.money(r.ads)}
                      </td>
                      <td className={cn(td, "text-right")}>
                        {r.imp ? r.imp.toLocaleString("es-CO") : "—"}
                      </td>
                      <td className={cn(td, "text-right")}>{r.clics || "—"}</td>
                      <td className={cn(td, "text-right")}>
                        {r.ctr == null ? "—" : fmt.pct(r.ctr)}
                      </td>
                      <td className={cn(td, "text-right")}>{r.ped}</td>
                      <td className={cn(td, "text-right")}>
                        {Math.round(r.conf ?? r.ped)}
                      </td>
                      <td className={cn(td, "text-right")}>
                        {Math.round(r.ent)}
                      </td>
                      <td className={cn(td, "text-right")}>
                        {fmt.money(r.ingresos)}
                      </td>
                      <td className={cn(td, "text-right")}>{fmt.x(r.roas)}</td>
                      <td className={cn(td, "text-right")}>
                        {fmt.money(r.cpa)}
                      </td>
                      <td
                        className={cn(
                          td,
                          "text-right font-semibold",
                          r.neta >= 0 ? "text-pos" : "text-neg",
                        )}
                      >
                        {fmt.money(r.neta)}
                      </td>
                      <td className={td}>{t.verdict}</td>
                      <td className={cn(td, "min-w-[140px] whitespace-normal")}>
                        {String(t.form.notas || "")}
                      </td>
                      <td className={cn(td, "pr-5")}>
                        <ConfirmButton
                          aria-label={`Borrar el registro del ${fecha}`}
                          className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-neg"
                          title="¿Borrar este registro?"
                          description={`Se quita el resultado del ${fecha} (${String(t.form.canal || "")}) y se recalculan las métricas.`}
                          confirmLabel="Borrar"
                          onConfirm={() => removeTest(t.id)}
                        >
                          <X aria-hidden className="size-4" />
                        </ConfirmButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      {toast.node}
    </div>
  );
}

function Preview({
  c,
  fmt,
}: {
  c: TestResult;
  fmt: ReturnType<typeof useCopiloto>["fmt"];
}) {
  return (
    <div
      aria-label="Vista previa del registro"
      role="group"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
    >
      <Kpi
        t="Utilidad neta"
        v={fmt.money(c.neta)}
        s="de este registro"
        tone={c.neta >= 0 ? "g" : "r"}
      />
      <Kpi
        t="ROAS"
        v={fmt.x(c.roas)}
        s={`equilibrio ${fmt.x(c.roasEq)}`}
        tone={c.roas >= c.roasEq ? "g" : "r"}
      />
      <Kpi
        t="CPA"
        v={fmt.money(c.cpa)}
        s={`máximo ${fmt.money(c.cpaMax)}`}
        tone={c.cpa <= c.cpaMax ? "g" : "r"}
      />
      <Kpi
        t="CTR"
        v={c.ctr === null ? "—" : fmt.pct(c.ctr)}
        s={c.cpc === null ? "" : `CPC ${fmt.money(c.cpc)}`}
      />
      <Kpi
        t="Conversión"
        v={c.cvr === null ? "—" : fmt.pct(c.cvr)}
        s="pedidos / clics"
      />
    </div>
  );
}
