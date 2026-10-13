"use client";

import { useState } from "react";
import { ActionForm, CheckboxField, MoneyField, SelectField, SubmitButton, TextField, TextareaField } from "@/components/ui/form";
import { CURRENCIES } from "@/lib/money/currency";
import { effectiveAnnual, monthlyRate, type RateBasis } from "@/lib/finance/debt";
import { createDebtAction, recordPaymentAction, updateDebtAction } from "@/app/(app)/universidad/finanzas/actions";

const TYPES = [
  ["credit_card", "Tarjeta de crédito"],
  ["personal_loan", "Préstamo personal / libre inversión"],
  ["vehicle", "Crédito de vehículo"],
  ["mortgage", "Hipoteca / leasing habitacional"],
  ["student_loan", "Crédito educativo (p. ej. ICETEX)"],
  ["family", "Deuda familiar"],
  ["employer", "Deuda con la empresa"],
  ["informal", "Préstamo informal"],
  ["other", "Otra"],
] as const;

export interface DebtDefaults {
  id?: string;
  name: string;
  creditor: string;
  type: string;
  currency: string;
  openingBalance: string;
  balanceDate: string;
  ratePercent: string;
  rateBasis: string;
  minimumPayment: string;
  paymentDay: string;
  remainingTermMonths: string;
  monthlyFees: string;
  daysPastDue: string;
  arrearsAmount: string;
  securedAssetId: string;
  customPriority: string;
  status: string;
  notes: string;
}

function RatePreview({ rate, basis }: { rate: string; basis: string }) {
  const r = Number(rate.replace(",", "."));
  if (!rate || !basis || !Number.isFinite(r) || r < 0) return null;
  const m = monthlyRate(r, basis as RateBasis);
  const ea = effectiveAnnual(r, basis as RateBasis);
  const fmt = (v: number) => (v * 100).toLocaleString("es-CO", { maximumFractionDigits: 2 }) + " %";
  return (
    <p className="text-xs text-ink-2 sm:col-span-2">
      Equivale a <strong>{fmt(m)} mensual</strong> y <strong>{fmt(ea)} efectivo anual</strong>. Para comparar deudas siempre usamos la tasa efectiva anual.
    </p>
  );
}

export function DebtForm({ defaults, assets, today }: { defaults: DebtDefaults; assets: { id: string; name: string }[]; today: string }) {
  const [rate, setRate] = useState(defaults.ratePercent);
  const [basis, setBasis] = useState(defaults.rateBasis);
  const [currency, setCurrency] = useState(defaults.currency);
  const editing = !!defaults.id;
  return (
    <ActionForm action={editing ? updateDebtAction : createDebtAction} className="grid gap-4 sm:grid-cols-2">
      {editing && <input type="hidden" name="id" value={defaults.id} />}
      <TextField label="Nombre" name="name" defaultValue={defaults.name} placeholder="Ej. Tarjeta Visa" required />
      <TextField label="Acreedor" name="creditor" defaultValue={defaults.creditor} optional />
      <SelectField label="Tipo" name="type" defaultValue={defaults.type}>
        {TYPES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </SelectField>
      <SelectField label="Moneda" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {Object.values(CURRENCIES).map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </SelectField>
      <MoneyField label="Capital pendiente" name="openingBalance" currency={currency} defaultValue={defaults.openingBalance} hint="El saldo que debes en la fecha indicada (según tu extracto)." required />
      <TextField label="Fecha de ese saldo" name="balanceDate" type="date" defaultValue={defaults.balanceDate || today} max={today} />
      <TextField label="Tasa de interés (%)" name="ratePercent" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} optional hint="Déjala vacía si no la conoces: el cálculo te advertirá." />
      <SelectField label="Tipo de tasa" name="rateBasis" value={basis} onChange={(e) => setBasis(e.target.value)}>
        <option value="">Sin tasa / desconocida</option>
        <option value="EA">Efectiva anual (E.A.)</option>
        <option value="NAMV">Nominal anual mes vencido (N.A.M.V.)</option>
        <option value="EM">Efectiva mensual (M.V.)</option>
      </SelectField>
      <RatePreview rate={rate} basis={basis} />
      <MoneyField label="Cuota mínima mensual" name="minimumPayment" currency={currency} defaultValue={defaults.minimumPayment} optional />
      <TextField label="Día de pago" name="paymentDay" inputMode="numeric" defaultValue={defaults.paymentDay} optional />
      <TextField label="Plazo restante (meses)" name="remainingTermMonths" inputMode="numeric" defaultValue={defaults.remainingTermMonths} optional />
      <MoneyField label="Cargos fijos mensuales" name="monthlyFees" currency={currency} defaultValue={defaults.monthlyFees} optional hint="Cuota de manejo, seguros, etc." />
      <TextField label="Días en mora" name="daysPastDue" inputMode="numeric" defaultValue={defaults.daysPastDue} optional />
      <MoneyField label="Valor en mora" name="arrearsAmount" currency={currency} defaultValue={defaults.arrearsAmount} optional />
      <SelectField label="Bien asociado (garantía)" name="securedAssetId" defaultValue={defaults.securedAssetId} optional hint="Ej. hipoteca → inmueble. Permite ver el valor neto de cada bien.">
        <option value="">Ninguno</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>
      <TextField label="Prioridad personalizada" name="customPriority" inputMode="numeric" defaultValue={defaults.customPriority} optional hint="1 = pagar primero. Se usa en la estrategia personalizada." />
      {editing && (
        <SelectField label="Estado" name="status" defaultValue={defaults.status}>
          <option value="active">Activa</option>
          <option value="paused">En pausa / acuerdo de pago</option>
          <option value="paid_off">Pagada</option>
        </SelectField>
      )}
      <TextareaField label="Notas" name="notes" defaultValue={defaults.notes} optional className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <SubmitButton>{editing ? "Guardar cambios" : "Registrar deuda"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PaymentForm({ debtId, currency, accounts, today, suggested }: { debtId: string; currency: string; accounts: { id: string; name: string }[]; today: string; suggested: string }) {
  if (!accounts.length) return <p className="text-sm text-ink-2">Necesitas una cuenta en {currency} para registrar pagos.</p>;
  return (
    <ActionForm action={recordPaymentAction} idempotent resetOnSuccess className="grid gap-3 sm:grid-cols-3 sm:items-end">
      <input type="hidden" name="debtId" value={debtId} />
      <MoneyField label="Pago" name="amount" currency={currency} defaultValue={suggested} />
      <SelectField label="Desde la cuenta" name="accountId">
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>
      <TextField label="Fecha" name="paidOn" type="date" defaultValue={today} max={today} />
      <MoneyField label="De esto, intereses" name="interest" currency={currency} optional hint="Según tu extracto. Si lo dejas vacío, se estima." />
      <MoneyField label="Cargos" name="fees" currency={currency} optional />
      <CheckboxField name="isExtra" label="Es un abono extra a capital" />
      <div className="sm:col-span-3">
        <SubmitButton size="sm">Registrar pago</SubmitButton>
      </div>
    </ActionForm>
  );
}
