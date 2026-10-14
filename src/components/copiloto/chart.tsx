"use client";

import { useEffect, useRef, useState } from "react";

export interface CopSeries {
  key: string;
  label: string;
  /** Rol de color de tokens.css (var(--pos), var(--info)…). */
  color: string;
  values: number[];
  dashed?: boolean;
}

const PAD = { l: 84, r: 12, t: 12, b: 28 };

/**
 * Gráfico de líneas de un solo eje (montos en pesos, ya formateados con el formateador del Co-Piloto).
 * Cada serie lleva color y nombre en la leyenda, y los datos están en una tabla («Ver datos en tabla»).
 */
export function CopLineChart({
  title,
  labels,
  series,
  money,
  height = 260,
  zeroLine = true,
  xLabel = "Punto",
}: {
  title: string;
  labels: string[];
  series: CopSeries[];
  money: (n: number) => string;
  height?: number;
  zeroLine?: boolean;
  xLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(260, Math.round(e!.contentRect.width))),
    );
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.values);
  const mxY = Math.max(...all, 1) * 1.06;
  const mnY = Math.min(0, ...all);
  const n = labels.length - 1 || 1;
  const X = (k: number) => PAD.l + (k / n) * (W - PAD.l - PAD.r);
  const Y = (v: number) =>
    height - PAD.b - ((v - mnY) / (mxY - mnY || 1)) * (height - PAD.t - PAD.b);
  const every = Math.max(
    1,
    Math.ceil(labels.length / Math.max(1, Math.floor((W - PAD.l) / 56))),
  );

  return (
    <figure className="min-w-0">
      <figcaption className="sr-only">{title}</figcaption>
      <ul
        aria-label="Leyenda"
        className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2"
      >
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-0.5 w-4"
              style={{
                background: s.color,
                borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
              }}
            />
            {s.label}
          </li>
        ))}
      </ul>
      <div
        ref={ref}
        className="w-full min-w-0 overflow-hidden"
        style={{ minHeight: height }}
      >
        {W > 0 && (
          <svg
            width={W}
            height={height}
            role="img"
            aria-label={`${title}. Los datos están en la tabla debajo.`}
          >
            {[0, 1, 2, 3, 4].map((k) => {
              const val = mnY + ((mxY - mnY) * k) / 4;
              return (
                <g key={k}>
                  <line
                    x1={PAD.l}
                    x2={W - PAD.r}
                    y1={Y(val)}
                    y2={Y(val)}
                    stroke="var(--chart-grid)"
                  />
                  <text
                    x={PAD.l - 8}
                    y={Y(val) + 4}
                    fontSize="11"
                    textAnchor="end"
                    fill="var(--muted)"
                    className="tabular"
                  >
                    {money(val)}
                  </text>
                </g>
              );
            })}
            {labels.map((l, k) =>
              k % every === 0 || k === labels.length - 1 ? (
                <text
                  key={k}
                  x={X(k)}
                  y={height - 8}
                  fontSize="10"
                  textAnchor="middle"
                  fill="var(--muted)"
                >
                  {l}
                </text>
              ) : null,
            )}
            {zeroLine && (
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={Y(0)}
                y2={Y(0)}
                stroke="var(--chart-axis)"
                strokeDasharray="4 4"
              />
            )}
            {series.map((s) => (
              <g key={s.key}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.6}
                  strokeDasharray={s.dashed ? "6 4" : undefined}
                  strokeLinejoin="round"
                  points={s.values.map((v, k) => `${X(k)},${Y(v)}`).join(" ")}
                />
                {s.values.length <= 40 &&
                  s.values.map((v, k) =>
                    k === 0 ? null : (
                      <circle
                        key={k}
                        cx={X(k)}
                        cy={Y(v)}
                        r={3.5}
                        fill={s.color}
                      />
                    ),
                  )}
              </g>
            ))}
          </svg>
        )}
      </div>
      <details className="mt-2 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-ink-2 hover:text-ink">
          Ver datos en tabla
        </summary>
        <div tabIndex={0} role="region" aria-label="Tabla con desplazamiento" className="mt-2 max-h-72 overflow-auto focus-visible:outline-2 focus-visible:outline-focus">
          <table className="w-full text-xs">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-2 py-1 text-left font-medium text-muted"
                >
                  {xLabel}
                </th>
                {series.map((s) => (
                  <th
                    key={s.key}
                    scope="col"
                    className="px-2 py-1 text-right font-medium text-muted"
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={i} className="border-t border-border">
                  <th
                    scope="row"
                    className="px-2 py-1 text-left font-normal text-ink-2"
                  >
                    {l || "Inicio"}
                  </th>
                  {series.map((s) => (
                    <td
                      key={s.key}
                      className="px-2 py-1 text-right text-ink tabular"
                    >
                      {money(s.values[i] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
