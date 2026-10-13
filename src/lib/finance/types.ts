/**
 * Tipos del motor financiero. Son independientes de la base de datos y de la UI:
 * los repositorios convierten filas de PostgreSQL a estas estructuras.
 */
import type { Minor } from "@/lib/money/money";
import type { ISODate } from "./dates";

export type TxKind = "income" | "expense" | "transfer";
/** planned = previsto (aún no afecta caja), posted = realizado, cancelled = anulado. */
export type TxStatus = "planned" | "posted" | "cancelled";
export type Nature = "essential" | "discretionary";
export type CostBehavior = "fixed" | "variable";

export type AccountType = "cash" | "checking" | "savings" | "digital_wallet" | "investment" | "other";

export const LIQUID_ACCOUNT_TYPES: AccountType[] = ["cash", "checking", "savings", "digital_wallet"];

export interface EngineAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: Minor;
  openedOn: ISODate;
  /** Se cuenta como caja disponible (liquidez inmediata). */
  isLiquid: boolean;
  archived?: boolean;
}

export interface EngineTx {
  id: string;
  kind: TxKind;
  status: TxStatus;
  /** Importe positivo en la moneda de la cuenta origen. */
  amount: Minor;
  currency: string;
  accountId: string;
  /** Solo transferencias: cuenta destino e importe recibido (en su moneda). */
  toAccountId?: string | null;
  toAmount?: Minor | null;
  /** Fecha prevista / de vencimiento. */
  date: ISODate;
  /** Fecha efectiva (cuando status = posted). */
  postedOn?: ISODate | null;
  categoryId?: string | null;
  nature?: Nature | null;
  reconciled?: boolean;
  recurrenceRuleId?: string | null;
  occurrenceDate?: ISODate | null;
  debtId?: string | null;
  description?: string;
}

export type Frequency =
  | "once"
  | "daily"
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface EngineRule {
  id: string;
  kind: TxKind;
  amount: Minor;
  currency: string;
  accountId: string;
  toAccountId?: string | null;
  toAmount?: Minor | null;
  categoryId?: string | null;
  nature?: Nature | null;
  debtId?: string | null;
  description: string;
  frequency: Frequency;
  startDate: ISODate;
  endDate?: ISODate | null;
  active: boolean;
}

export interface EngineCategory {
  id: string;
  name: string;
  kind: "income" | "expense";
  parentId: string | null;
  nature: Nature | null;
  behavior: CostBehavior | null;
  systemKey?: string | null;
}

/** Tasa de cambio: 1 unidad de `from` = `rate` unidades de `to`, válida desde `asOf`. */
export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  asOf: ISODate;
}

export function effectiveDate(tx: Pick<EngineTx, "status" | "date" | "postedOn">): ISODate {
  return tx.status === "posted" ? (tx.postedOn ?? tx.date) : tx.date;
}
