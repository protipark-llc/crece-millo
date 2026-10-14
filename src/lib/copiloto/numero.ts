/**
 * Números que escribe la persona en es-CO: «56.000», «56000», «1,2» o «1.2».
 * En campos enteros (paso ≥ 1) el punto y la coma son separadores de miles; en campos con
 * decimales (paso < 1) un solo separador seguido de 1–2 dígitos se toma como decimal.
 */
export function parseNum(raw: string, decimals: boolean): number | null {
  const t = raw.trim().replace(/[\s$% ]/g, "");
  if (t === "" || t === "-") return null;
  let s: string;
  if (decimals) {
    const m = t.match(/^(-?[\d.,]*?)[.,](\d{1,2})$/);
    s = m ? m[1]!.replace(/[.,]/g, "") + "." + m[2] : t.replace(/[.,]/g, "");
  } else s = t.replace(/[.,]/g, "");
  if (!/^-?\d*(\.\d+)?$/.test(s) || s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const fmtCache = new Map<number, Intl.NumberFormat>();
/** «56.000», «1,2»: miles con punto y coma decimal, con hasta `dec` decimales. */
export function formatNum(n: number, dec = 0): string {
  let f = fmtCache.get(dec);
  if (!f)
    fmtCache.set(
      dec,
      (f = new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: dec,
        useGrouping: true,
      })),
    );
  return f.format(n);
}

/** Paso con flechas: ±paso, o ±10 pasos con Shift; respeta mínimo y máximo y evita 0,30000000004. */
export function stepNum(
  v: number,
  step: number,
  dir: 1 | -1,
  big: boolean,
  min?: number,
  max?: number,
): number {
  const decs = (String(step).split(".")[1] ?? "").length;
  let n = Number((v + dir * step * (big ? 10 : 1)).toFixed(decs));
  if (min !== undefined) n = Math.max(min, n);
  if (max !== undefined) n = Math.min(max, n);
  return n;
}
