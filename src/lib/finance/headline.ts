/**
 * Respuesta principal del Panel: «¿Cómo voy este mes?» en una frase.
 *
 * Regla (entrega de diseño v1, §7): déficit de caja > categoría sobre su ritmo > en orden.
 *  1. Sin cuentas: no se puede responder; se invita a registrarlas.
 *  2. Si la caja proyectada queda en negativo en los próximos 90 días → peligro.
 *  3. Si alguna categoría ya superó lo planeado → atención (la de mayor exceso).
 *  4. Si alguna categoría va por encima de su ritmo (cierre proyectado > plan) → atención
 *     (la de mayor porcentaje usado).
 *  5. Si no, «vas bien».
 *
 * Solo presenta resultados que ya calcula el motor (flujo de caja y presupuesto); no calcula nada nuevo.
 * El tono va siempre acompañado de palabras («Atención», «Ojo con»), nunca solo de color.
 */
import type { Minor } from "@/lib/money/money";
import type { ISODate } from "./dates";

export type HeadlineTone = "pos" | "warn" | "neg" | "neutral";

export interface HeadlineSegment {
  text: string;
  /** Parte resaltada (color de estado); el resto va en tinta. */
  emphasis?: boolean;
}

export interface Headline {
  tone: HeadlineTone;
  segments: HeadlineSegment[];
}

export interface HeadlineLine {
  label: string;
  planned: Minor;
  executed: Minor;
  overLimit: boolean;
  projectedOverLimit: boolean;
}

export interface HeadlineInput {
  hasAccounts: boolean;
  firstNegativeDate: ISODate | null;
  lines: HeadlineLine[] | null;
  formatDate: (d: ISODate) => string;
  formatPct: (v: number) => string;
  formatMoney: (m: Minor) => string;
}

/** Nombre corto de la categoría: «Alimentación › Mercado» → «Mercado». */
export function shortCategory(label: string): string {
  const parts = label.split("›");
  return (parts[parts.length - 1] ?? label).trim();
}

export function panelHeadline(i: HeadlineInput): Headline {
  if (!i.hasAccounts) {
    return { tone: "neutral", segments: [{ text: "Empecemos: registra tus cuentas para saber cuánto te alcanza." }] };
  }
  if (i.firstNegativeDate) {
    return {
      tone: "neg",
      segments: [{ text: "Atención: " }, { text: `tu caja podría quedar en negativo el ${i.formatDate(i.firstNegativeDate)}.`, emphasis: true }],
    };
  }
  const lines = (i.lines ?? []).filter((l) => l.planned > 0);
  const over = lines.filter((l) => l.overLimit).sort((a, b) => b.executed - b.planned - (a.executed - a.planned))[0];
  if (over) {
    return {
      tone: "warn",
      segments: [
        { text: "Tu caja cubre el mes, pero " },
        { text: `${shortCategory(over.label)} ya pasó lo planeado`, emphasis: true },
        { text: ` por ${i.formatMoney(over.executed - over.planned)}.` },
      ],
    };
  }
  const pace = lines.filter((l) => l.projectedOverLimit).sort((a, b) => b.executed / b.planned - a.executed / a.planned)[0];
  if (pace) {
    return {
      tone: "warn",
      segments: [
        { text: "Vas bien: tu caja cubre el mes. " },
        { text: `Ojo con ${shortCategory(pace.label)},`, emphasis: true },
        { text: ` que ya va en ${i.formatPct(pace.executed / pace.planned)}.` },
      ],
    };
  }
  if (i.lines === null) {
    return { tone: "pos", segments: [{ text: "Vas bien: tu caja cubre los próximos 90 días." }] };
  }
  return { tone: "pos", segments: [{ text: "Vas bien: tu caja cubre el mes y tu presupuesto va en orden." }] };
}
