"use client";

import Link from "next/link";
import { Download, Plus, Search, Zap } from "lucide-react";
import { ETAPAS } from "@/lib/copiloto/state";
import {
  SORTS,
  blankProduct,
  claseTone,
  etapaTone,
  filterSort,
  portfolio,
} from "@/lib/copiloto/productos";
import { todayLocal } from "@/lib/copiloto/today";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import { ToneBadge } from "../tone";
import { Kpi, downloadText, fieldClass } from "../ui";
import { productsCsv } from "@/lib/copiloto/logic";

const th =
  "border-b border-border px-3 py-2.5 text-xs font-medium whitespace-nowrap text-muted";
const td = "border-b border-border px-3 py-2.5 whitespace-nowrap tabular";

/** Base de datos de productos (renderPortfolio, L707): 6 indicadores, filtros y tabla de 14 columnas. */
export function Portfolio() {
  const { S, fmt, setSettings, addProduct } = useCopiloto();
  const { rows, kpis: k } = portfolio(S);
  const list = filterSort(rows, S.pf);
  const setPf = (patch: Partial<typeof S.pf>) =>
    setSettings({ pf: { ...S.pf, ...patch } });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          t="Productos"
          v={k.productos}
          s={`${k.claseA} clase A · ${k.claseB} clase B`}
        />
        <Kpi t="En test" v={k.enTest} tone="a" s="" />
        <Kpi t="Ganadores" v={k.ganadores} s="ganador o escalando" tone="g" />
        <Kpi
          t="Gasto total en ads"
          v={fmt.money(k.ads)}
          s={`${k.conDatos} producto(s) con datos`}
        />
        <Kpi t="Recaudo total" v={fmt.money(k.ingresos)} />
        <Kpi
          t="Utilidad neta real"
          v={fmt.money(k.neta)}
          s={k.ads ? `ROAS global ${fmt.x(k.ingresos / k.ads)}` : "sin datos"}
          tone={k.neta >= 0 ? "g" : "r"}
        />
      </div>

      <section
        aria-labelledby="pf-t"
        className="rounded-lg border border-border bg-surface"
      >
        <div className="flex flex-wrap items-center gap-2 p-4 sm:p-5">
          <h2 id="pf-t" className="mr-auto text-lg font-semibold text-ink">
            Base de datos de productos
          </h2>
          <label className="relative block w-full sm:w-52">
            <span className="sr-only">Buscar producto</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            />
            <input
              value={S.pf.q}
              onChange={(e) => setPf({ q: e.target.value })}
              placeholder="Buscar producto…"
              className={cn(fieldClass, "pl-9")}
            />
          </label>
          <label className="w-[calc(50%-4px)] sm:w-auto">
            <span className="sr-only">Etapa</span>
            <select
              value={S.pf.etapa}
              onChange={(e) => setPf({ etapa: e.target.value })}
              className={fieldClass}
            >
              <option value="">Todas las etapas</option>
              {ETAPAS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <label className="w-[calc(50%-4px)] sm:w-auto">
            <span className="sr-only">Orden</span>
            <select
              value={S.pf.sort}
              onChange={(e) => setPf({ sort: e.target.value })}
              className={fieldClass}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="?alta=1"
            scroll={false}
            className={buttonClass("primary", "md")}
          >
            <Zap aria-hidden className="size-4" /> Alta rápida
          </Link>
          <button
            type="button"
            className={buttonClass("secondary", "md")}
            onClick={() => {
              const p = blankProduct(todayLocal());
              addProduct(p);
              setSettings({ active: p.id, ptab: "ficha" });
            }}
          >
            <Plus aria-hidden className="size-4" /> En blanco
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText("productos_para_notion.csv", productsCsv(S))
            }
            className={buttonClass("ghost", "md")}
          >
            <Download aria-hidden className="size-4" /> CSV para Notion
          </button>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <caption className="sr-only">
              Productos. Elige uno para abrir su ficha.
            </caption>
            <thead>
              <tr className="text-left">
                {[
                  "Producto",
                  "Etapa",
                  "Clase",
                  "Puntaje",
                  "Precio",
                  "Utilidad/pedido",
                  "Registros",
                  "Gasto",
                  "Pedidos",
                  "Entrega real",
                  "ROAS",
                  "CPA",
                  "Neta",
                  "Sugerencia",
                ].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(
                      th,
                      i >= 3 && i <= 12 && "text-right",
                      i === 0 && "pl-5",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-5 py-6 text-center text-muted">
                    No hay productos con ese filtro.
                  </td>
                </tr>
              ) : (
                list.map(({ p, ev, a, sg }) => {
                  const active = p.id === S.active;
                  const et = etapaTone(p.etapa);
                  const up = ev.g.u.utilidadPedido;
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        active ? "bg-surface-2" : "hover:bg-surface-2/60",
                      )}
                    >
                      <td className={cn(td, "pl-5")}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSettings({ active: p.id })}
                          className="text-left"
                        >
                          <span className="block font-semibold text-ink hover:underline">
                            {p.nombre}
                          </span>
                          <span className="block text-xs text-muted">
                            {String(p.categoria ?? "")} ·{" "}
                            {String(p.subnicho ?? "")}
                          </span>
                        </button>
                      </td>
                      <td className={td}>
                        {et ? (
                          <ToneBadge tone={et}>{p.etapa}</ToneBadge>
                        ) : (
                          <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-ink-2">
                            {p.etapa}
                          </span>
                        )}
                      </td>
                      <td className={td}>
                        <ToneBadge tone={claseTone(ev.clase)}>
                          Clase {ev.clase}
                        </ToneBadge>
                      </td>
                      <td className={cn(td, "text-right")}>{ev.total}</td>
                      <td className={cn(td, "text-right")}>
                        {fmt.money(p.precio)}
                      </td>
                      <td
                        className={cn(
                          td,
                          "text-right",
                          up > 0 ? "text-pos" : "text-neg",
                        )}
                      >
                        {fmt.money(up)}
                      </td>
                      <td className={cn(td, "text-right")}>{a ? a.n : 0}</td>
                      <td className={cn(td, "text-right")}>
                        {a ? fmt.money(a.ads) : "—"}
                      </td>
                      <td className={cn(td, "text-right")}>
                        {a ? a.ped : "—"}
                      </td>
                      <td className={cn(td, "text-right")}>
                        {a && a.conf ? fmt.pct(a.tasaEntrega) : "—"}
                      </td>
                      <td className={cn(td, "text-right")}>
                        {a ? fmt.x(a.roas) : "—"}
                      </td>
                      <td className={cn(td, "text-right")}>
                        {a && a.ped ? fmt.money(a.cpa) : "—"}
                      </td>
                      <td
                        className={cn(
                          td,
                          "text-right",
                          a ? (a.neta >= 0 ? "text-pos" : "text-neg") : "",
                        )}
                      >
                        {a ? fmt.money(a.neta) : "—"}
                      </td>
                      <td className={cn(td, "pr-5")}>
                        <ToneBadge tone={sg.tone}>{sg.label}</ToneBadge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-muted">
          Elige un producto para abrir su ficha. Clase A = testear ya · B =
          testear si no hay A · C = no testear.
        </p>
      </section>
    </div>
  );
}
