/**
 * Patrimonio neto = activos − pasivos, valorado en una fecha.
 *
 * - Activos: saldos de cuentas (registrados a la fecha) + último avalúo de cada activo
 *   con fecha ≤ fecha de corte. Un saldo de cuenta negativo (sobregiro) se trata como pasivo.
 * - Pasivos: saldo pendiente de cada deuda a la fecha (saldo inicial − abonos a capital
 *   registrados hasta esa fecha).
 * - La liquidez se reporta aparte: un inmueble o un vehículo no son dinero disponible.
 */
import { convert } from "./fx";
import { accountBalance } from "./cashflow";
import { addMonthsClamped, monthEnd, type ISODate } from "./dates";
import type { EngineAccount, EngineTx, ExchangeRate } from "./types";
import type { Minor } from "@/lib/money/money";

export type Liquidity = "liquid" | "semi_liquid" | "illiquid";

export interface EngineAsset {
  id: string;
  name: string;
  type: string;
  currency: string;
  liquidity: Liquidity;
  valuations: { value: Minor; valuedOn: ISODate; source: string | null }[];
}

export interface EngineDebt {
  id: string;
  name: string;
  currency: string;
  openingBalance: Minor;
  balanceDate: ISODate;
  securedAssetId?: string | null;
  payments: { date: ISODate; principal: Minor }[];
}

export function debtBalanceAt(debt: EngineDebt, date: ISODate): Minor | null {
  if (date < debt.balanceDate) return null;
  let b = debt.openingBalance;
  for (const p of debt.payments) if (p.date >= debt.balanceDate && p.date <= date) b -= p.principal;
  return Math.max(0, b);
}

export function assetValueAt(asset: EngineAsset, date: ISODate): { value: Minor; valuedOn: ISODate; source: string | null } | null {
  let best: EngineAsset["valuations"][number] | null = null;
  for (const v of asset.valuations) if (v.valuedOn <= date && (!best || v.valuedOn > best.valuedOn)) best = v;
  return best;
}

export interface NetWorthSnapshot {
  date: ISODate;
  assets: Minor;
  liabilities: Minor;
  netWorth: Minor;
  liquid: Minor;
  semiLiquid: Minor;
  illiquid: Minor;
  hasData: boolean;
  unconvertedCount: number;
}

export function netWorthAt(
  date: ISODate,
  data: { accounts: EngineAccount[]; txs: EngineTx[]; assets: EngineAsset[]; debts: EngineDebt[] },
  baseCurrency: string,
  rates: ExchangeRate[] = [],
): NetWorthSnapshot {
  let assets = 0;
  let liabilities = 0;
  let liquid = 0;
  let semiLiquid = 0;
  let illiquid = 0;
  let hasData = false;
  let unconvertedCount = 0;
  const conv = (amount: Minor, currency: string) => {
    const c = convert(amount, currency, baseCurrency, rates, date);
    if (c === null) unconvertedCount++;
    return c ?? 0;
  };
  for (const a of data.accounts) {
    if (date < a.openedOn) continue;
    hasData = true;
    const bal = conv(accountBalance(a, data.txs, date), a.currency);
    if (bal < 0) {
      liabilities += -bal;
      continue;
    }
    assets += bal;
    if (a.isLiquid) liquid += bal;
    else semiLiquid += bal;
  }
  for (const asset of data.assets) {
    const v = assetValueAt(asset, date);
    if (!v) continue;
    hasData = true;
    const value = conv(v.value, asset.currency);
    assets += value;
    if (asset.liquidity === "liquid") liquid += value;
    else if (asset.liquidity === "semi_liquid") semiLiquid += value;
    else illiquid += value;
  }
  for (const d of data.debts) {
    const b = debtBalanceAt(d, date);
    if (b === null) continue;
    hasData = true;
    liabilities += conv(b, d.currency);
  }
  return { date, assets, liabilities, netWorth: assets - liabilities, liquid, semiLiquid, illiquid, hasData, unconvertedCount };
}

/** Serie de cierres mensuales para los últimos `months` meses (el último es `today`). */
export function netWorthSeries(
  today: ISODate,
  months: number,
  data: Parameters<typeof netWorthAt>[1],
  baseCurrency: string,
  rates: ExchangeRate[] = [],
): NetWorthSnapshot[] {
  const out: NetWorthSnapshot[] = [];
  for (let i = months - 1; i >= 1; i--) {
    out.push(netWorthAt(monthEnd(addMonthsClamped(today, -i, 1)), data, baseCurrency, rates));
  }
  out.push(netWorthAt(today, data, baseCurrency, rates));
  return out.filter((s) => s.hasData);
}

/** Tabla tipo balance: valor del activo, deuda asociada y valor neto (equity). */
export function assetEquity(
  assets: EngineAsset[],
  debts: EngineDebt[],
  date: ISODate,
): { assetId: string; name: string; value: Minor | null; debt: Minor; equity: Minor | null }[] {
  return assets.map((a) => {
    const v = assetValueAt(a, date)?.value ?? null;
    const debt = debts
      .filter((d) => d.securedAssetId === a.id)
      .reduce((s, d) => s + (debtBalanceAt(d, date) ?? 0), 0);
    return { assetId: a.id, name: a.name, value: v, debt, equity: v === null ? null : v - debt };
  });
}
