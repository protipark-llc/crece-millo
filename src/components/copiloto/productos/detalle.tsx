"use client";

import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { E } from "@/lib/copiloto/engine";
import { activeProduct } from "@/lib/copiloto/logic";
import { PTABS, copilotoHref } from "@/lib/copiloto/nav";
import { claseTone, etapaTone, suggestion } from "@/lib/copiloto/productos";
import { useCopiloto } from "../store";
import { ToneBadge } from "../tone";
import { SubTabs } from "../ui";
import { Ficha } from "./ficha";
import { Evaluacion } from "./evaluacion";
import { Resultados } from "./resultados";
import { Analisis } from "./analisis";

/** Código de subpestaña (S.ptab) desde ?vista= (slug o código); si falta, el último que usaste. */
export function usePtab(): string {
  const { S } = useCopiloto();
  const q = useSearchParams().get("vista");
  const hit = PTABS.find((t) => t.slug === q || t.code === q);
  return hit
    ? hit.code
    : PTABS.some((t) => t.code === S.ptab)
      ? S.ptab
      : "ficha";
}

/** Detalle del producto activo (pDetail, L228–268): encabezado, insignias y 5 subpestañas. */
export function Detalle({ precio }: { precio?: ReactNode }) {
  const { S, setSettings } = useCopiloto();
  const ptab = usePtab();
  useEffect(() => {
    if (ptab !== S.ptab) setSettings({ ptab });
  }, [ptab, S.ptab, setSettings]);
  const p = activeProduct(S);
  const ev = E.evaluate(p, S.risk);
  const sg = suggestion(S, p);
  const et = etapaTone(p.etapa);
  return (
    <section
      aria-labelledby="pd-t"
      className="rounded-lg border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="t-overline text-muted">Producto activo</p>
          <h2 id="pd-t" className="mt-0.5 text-xl font-semibold text-ink">
            {p.nombre}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {et ? (
            <ToneBadge tone={et}>{p.etapa}</ToneBadge>
          ) : (
            <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-ink-2">
              {p.etapa}
            </span>
          )}
          <ToneBadge tone={claseTone(ev.clase)}>Clase {ev.clase}</ToneBadge>
          <ToneBadge tone="b">Puntaje {ev.total}/100</ToneBadge>
          <ToneBadge tone={sg.tone}>{sg.label}</ToneBadge>
        </div>
      </div>
      <div className="mt-4">
        <SubTabs
          label="Secciones del producto"
          current={ptab}
          items={PTABS.map((t, i) => ({
            key: t.code,
            label: `${i + 1} · ${t.label}`,
            href: copilotoHref("productos", t.slug),
          }))}
        />
      </div>
      <div className="mt-5">
        {ptab === "ficha" && <Ficha />}
        {ptab === "eval" && <Evaluacion />}
        {ptab === "res" && <Resultados />}
        {ptab === "ana" && <Analisis />}
        {ptab === "precio" && precio}
      </div>
    </section>
  );
}
