"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatMoney } from "@/lib/money/money";

export interface Series {
  key: string;
  label: string;
  /** Rol de color: var(--chart-1) … var(--chart-3). */
  color: string;
  values: (number | null)[];
}

interface Common {
  labels: string[];
  series: Series[];
  currency: string;
  locale: string;
  height?: number;
  /** Índice desde el cual los valores son proyecciones (línea punteada / barra clara). */
  projectedFrom?: number | null;
  title: string;
  /** Texto de la vista de tabla. */
  tableCaption?: string;
}

function niceStep(range: number, ticks: number) {
  const raw = range / Math.max(1, ticks);
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function scaleY(series: Series[], includeZero = true) {
  let min = includeZero ? 0 : Number.POSITIVE_INFINITY;
  let max = includeZero ? 0 : Number.NEGATIVE_INFINITY;
  for (const s of series) for (const v of s.values) if (v !== null) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min === max) max = min + 1;
  const step = niceStep(max - min, 4);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t));
  return { lo, hi, ticks };
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  // Sin ancho inicial: el SVG no se dibuja hasta medir el contenedor, así nunca lo ensancha.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.round(e!.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

function Legend({ series, projected }: { series: Series[]; projected: boolean }) {
  if (series.length < 2 && !projected) return null;
  return (
    <ul className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Leyenda">
      {series.length >= 2 &&
        series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-xs" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      {projected && (
        <li className="flex items-center gap-1.5">
          <svg aria-hidden width="18" height="6">
            <line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          Proyectado
        </li>
      )}
    </ul>
  );
}

function DataTable({ labels, series, currency, locale, caption, projectedFrom }: { labels: string[]; series: Series[]; currency: string; locale: string; caption: string; projectedFrom?: number | null }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-semibold text-ink hover:underline">Ver datos en tabla</summary>
      <div className="relative mt-2 max-h-72 overflow-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th className="px-2 py-1 text-left font-medium text-muted">Periodo</th>
              {series.map((s) => (
                <th key={s.key} className="px-2 py-1 text-right font-medium text-muted">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={l + i} className="border-t border-border">
                <td className="px-2 py-1 text-ink-2">
                  {l}
                  {projectedFrom !== null && projectedFrom !== undefined && i >= projectedFrom ? " (proyectado)" : ""}
                </td>
                {series.map((s) => (
                  <td key={s.key} className="tabular px-2 py-1 text-right text-ink">
                    {s.values[i] === null || s.values[i] === undefined ? "—" : formatMoney(s.values[i]!, currency, locale)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const PAD = { top: 12, right: 12, bottom: 28, left: 64 };

/** Índices de etiquetas del eje X que caben sin solaparse (aprox. 6,5 px por carácter). */
function visibleTicks(labels: string[], step: number): Set<number> {
  const maxLen = Math.max(1, ...labels.map((l) => l.length));
  const need = maxLen * 6.5 + 12;
  const every = Math.max(1, Math.ceil(need / Math.max(1, step)));
  const out = new Set<number>();
  for (let i = 0; i < labels.length; i += every) out.add(i);
  const last = labels.length - 1;
  const lastDrawn = Math.max(...out);
  if (last !== lastDrawn) {
    if ((last - lastDrawn) * step >= need) out.add(last);
    else if (lastDrawn > 0) {
      out.delete(lastDrawn);
      out.add(last);
    }
  }
  return out;
}

function Tooltip({ x, width, label, rows }: { x: number; width: number; label: string; rows: { color: string; label: string; value: string }[] }) {
  const left = Math.min(Math.max(x + 12, 0), width - 200);
  return (
    <div className="pointer-events-none absolute top-2 z-10 w-[188px] rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg" style={{ left }}>
      <p className="mb-1 font-medium text-ink">{label}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-2 text-ink-2">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-xs" style={{ background: r.color }} />
            {r.label}
          </span>
          <span className="tabular text-ink">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

function useHover(n: number) {
  const [idx, setIdx] = useState<number | null>(null);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setIdx((i) => Math.min(n - 1, (i ?? -1) + 1));
    else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, (i ?? n) - 1));
    else if (e.key === "Escape") setIdx(null);
    else return;
    e.preventDefault();
  };
  return { idx, setIdx, onKey };
}

export function LineChart({
  labels,
  series,
  currency,
  locale,
  height = 240,
  projectedFrom = null,
  title,
  tableCaption,
  zeroLine = true,
  mark,
  todayIndex,
}: Common & {
  zeroLine?: boolean;
  /** Punto destacado (p. ej. el saldo más bajo) en chart-mark, con su etiqueta escrita. */
  mark?: { index: number; label: string } | null;
  /** Índice de «hoy»: línea vertical punteada con la palabra «hoy». */
  todayIndex?: number | null;
}) {
  const { ref, width } = useWidth();
  const { idx, setIdx, onKey } = useHover(labels.length);
  const { lo, hi, ticks } = useMemo(() => scaleY(series, zeroLine), [series, zeroLine]);
  const iw = width - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (labels.length <= 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo)) * ih;
  const path = (vals: (number | null)[], from: number, to: number) => {
    let d = "";
    let pen = false;
    for (let i = from; i <= to && i < vals.length; i++) {
      const v = vals[i];
      if (v === null || v === undefined) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const ticksX = visibleTicks(labels, labels.length > 1 ? iw / (labels.length - 1) : iw);
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    const i = labels.length <= 1 ? 0 : Math.round((px / iw) * (labels.length - 1));
    setIdx(Math.max(0, Math.min(labels.length - 1, i)));
  };
  const split = projectedFrom ?? labels.length;
  return (
    <figure className="w-full min-w-0">
      <figcaption className="sr-only">{title}</figcaption>
      <Legend series={series} projected={projectedFrom !== null && projectedFrom < labels.length} />
      <div ref={ref} className="relative w-full min-w-0 overflow-hidden" style={{ minHeight: height }}>
        {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${title}. Usa las flechas para recorrer los valores.`}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerMove={onMove}
          onPointerLeave={() => setIdx(null)}
          onBlur={() => setIdx(null)}
          className="touch-pan-y select-none"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 && zeroLine ? "var(--chart-axis)" : "var(--chart-grid)"} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)" className="tabular">
                {formatMoney(t, currency, locale, { compact: true })}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            ticksX.has(i) ? (
              <text key={l + i} x={x(i)} y={height - 8} textAnchor={i === labels.length - 1 && labels.length > 1 ? "end" : i === 0 ? "start" : "middle"} fontSize="11" fill="var(--muted)">
                {l}
              </text>
            ) : null,
          )}
          {series.map((s) => (
            <g key={s.key}>
              <path d={path(s.values, 0, split - 1 >= 0 ? Math.min(split, labels.length - 1) : 0)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {split < labels.length && (
                <path d={path(s.values, Math.max(0, split), labels.length - 1)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
              )}
              {s.values.length > 0 && s.values[s.values.length - 1] !== null && (
                <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1]!)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              )}
            </g>
          ))}
          {todayIndex !== null && todayIndex !== undefined && todayIndex >= 0 && todayIndex < labels.length && (
            <g aria-hidden>
              <line x1={x(todayIndex)} x2={x(todayIndex)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--chart-axis)" strokeWidth={1} strokeDasharray="2 3" />
              <text x={x(todayIndex) + 4} y={PAD.top + 10} fontSize="11" fill="var(--muted)">
                hoy
              </text>
            </g>
          )}
          {mark && series[0] && series[0].values[mark.index] !== null && series[0].values[mark.index] !== undefined && (
            <g aria-hidden>
              <circle cx={x(mark.index)} cy={y(series[0].values[mark.index]!)} r={6} fill="var(--chart-mark)" stroke="var(--surface)" strokeWidth={2} />
              <text
                x={x(mark.index)}
                y={Math.min(PAD.top + ih - 4, y(series[0].values[mark.index]!) + 22)}
                textAnchor={mark.index > labels.length * 0.75 ? "end" : mark.index < labels.length * 0.25 ? "start" : "middle"}
                fontSize="12"
                fontWeight="600"
                fill="var(--ink)"
                className="tabular"
              >
                {mark.label}
              </text>
            </g>
          )}
          {idx !== null && (
            <g>
              <line x1={x(idx)} x2={x(idx)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--chart-axis)" strokeWidth={1} />
              {series.map((s) =>
                s.values[idx] !== null && s.values[idx] !== undefined ? (
                  <circle key={s.key} cx={x(idx)} cy={y(s.values[idx]!)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ) : null,
              )}
            </g>
          )}
        </svg>
        )}
        {idx !== null && width > 0 && (
          <Tooltip
            x={x(idx)}
            width={width}
            label={`${labels[idx]}${projectedFrom !== null && idx >= projectedFrom ? " · proyectado" : ""}`}
            rows={series.map((s) => ({ color: s.color, label: s.label, value: s.values[idx] === null || s.values[idx] === undefined ? "—" : formatMoney(s.values[idx]!, currency, locale) }))}
          />
        )}
      </div>
      <DataTable labels={labels} series={series} currency={currency} locale={locale} caption={tableCaption ?? title} projectedFrom={projectedFrom} />
    </figure>
  );
}

export function ColumnChart({ labels, series, currency, locale, height = 240, projectedFrom = null, title, tableCaption }: Common) {
  const { ref, width } = useWidth();
  const { idx, setIdx, onKey } = useHover(labels.length);
  const { lo, hi, ticks } = useMemo(() => scaleY(series, true), [series]);
  const iw = width - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const band = iw / Math.max(1, labels.length);
  const gap = 2;
  const barW = Math.max(3, Math.min(24, (band * 0.7 - gap * (series.length - 1)) / series.length));
  const groupW = barW * series.length + gap * (series.length - 1);
  const y = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo)) * ih;
  const ticksX = visibleTicks(labels, band);
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - PAD.left) / band);
    setIdx(i >= 0 && i < labels.length ? i : null);
  };
  const r = 4;
  const bar = (cx: number, v: number) => {
    const y0 = y(0);
    const y1 = y(v);
    const h = Math.abs(y0 - y1);
    if (h < 0.5) return "";
    const top = Math.min(y0, y1);
    const rr = Math.min(r, h, barW / 2);
    if (v >= 0) {
      return `M${cx},${y0}V${top + rr}Q${cx},${top} ${cx + rr},${top}H${cx + barW - rr}Q${cx + barW},${top} ${cx + barW},${top + rr}V${y0}Z`;
    }
    const bottom = top + h;
    return `M${cx},${y0}V${bottom - rr}Q${cx},${bottom} ${cx + rr},${bottom}H${cx + barW - rr}Q${cx + barW},${bottom} ${cx + barW},${bottom - rr}V${y0}Z`;
  };
  return (
    <figure className="w-full min-w-0">
      <figcaption className="sr-only">{title}</figcaption>
      <Legend series={series} projected={false} />
      {projectedFrom !== null && projectedFrom < labels.length && <p className="-mt-1 mb-2 text-xs text-muted">Las barras más claras son proyecciones.</p>}
      <div ref={ref} className="relative w-full min-w-0 overflow-hidden" style={{ minHeight: height }}>
        {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${title}. Usa las flechas para recorrer los valores.`} tabIndex={0} onKeyDown={onKey} onPointerMove={onMove} onPointerLeave={() => setIdx(null)} onBlur={() => setIdx(null)} className="touch-pan-y select-none">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)" className="tabular">
                {formatMoney(t, currency, locale, { compact: true })}
              </text>
            </g>
          ))}
          {idx !== null && <rect x={PAD.left + idx * band} y={PAD.top} width={band} height={ih} fill="var(--surface-2)" />}
          {labels.map((l, i) => {
            const start = PAD.left + i * band + (band - groupW) / 2;
            const projected = projectedFrom !== null && i >= projectedFrom;
            return (
              <g key={l + i} opacity={projected ? 0.45 : 1}>
                {series.map((s, si) => {
                  const v = s.values[i];
                  if (v === null || v === undefined) return null;
                  return <path key={s.key} d={bar(start + si * (barW + gap), v)} fill={s.color} />;
                })}
              </g>
            );
          })}
          {labels.map((l, i) =>
            ticksX.has(i) ? (
              <text key={"x" + l + i} x={PAD.left + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
                {l}
              </text>
            ) : null,
          )}
        </svg>
        )}
        {idx !== null && width > 0 && (
          <Tooltip
            x={PAD.left + idx * band + band / 2}
            width={width}
            label={`${labels[idx]}${projectedFrom !== null && idx >= projectedFrom ? " · proyectado" : ""}`}
            rows={series.map((s) => ({ color: s.color, label: s.label, value: s.values[idx] === null || s.values[idx] === undefined ? "—" : formatMoney(s.values[idx]!, currency, locale) }))}
          />
        )}
      </div>
      <DataTable labels={labels} series={series} currency={currency} locale={locale} caption={tableCaption ?? title} projectedFrom={projectedFrom} />
    </figure>
  );
}

/** Barras horizontales de una sola serie (p. ej. gasto por categoría). Valor al final de cada barra. */
export function BarList({ items, currency, locale, title, total }: { items: { label: string; value: number; hint?: string }[]; currency: string; locale: string; title: string; total?: number }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink">{i.label}</span>
              <span className="tabular shrink-0 text-ink-2">
                {formatMoney(i.value, currency, locale)}
                {total ? <span className="ml-1.5 text-xs text-muted">{Math.round((i.value / total) * 100)} %</span> : null}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-2">
              <div className="h-2 rounded-r-full" style={{ width: `${(i.value / max) * 100}%`, background: "var(--chart-1)" }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
