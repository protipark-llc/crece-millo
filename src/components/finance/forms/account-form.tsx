"use client";

import { ActionForm, CheckboxField, MoneyField, SelectField, SubmitButton, TextField, TextareaField } from "@/components/ui/form";
import { CURRENCIES } from "@/lib/money/currency";
import { createAccountAction, updateAccountAction } from "@/app/(app)/universidad/finanzas/actions";

const TYPES = [
  ["checking", "Cuenta corriente"],
  ["savings", "Cuenta de ahorros"],
  ["cash", "Efectivo"],
  ["digital_wallet", "Billetera digital (Nequi, Daviplata…)"],
  ["investment", "Cuenta de inversión"],
  ["other", "Otra"],
] as const;

export function AccountForm({
  defaultCurrency,
  today,
  account,
}: {
  defaultCurrency: string;
  today: string;
  account?: { id: string; name: string; type: string; currency: string; openingBalance: string; negative: boolean; openedOn: string; notes: string | null };
}) {
  return (
    <ActionForm action={account ? updateAccountAction : createAccountAction} resetOnSuccess={!account} className="grid gap-4 sm:grid-cols-2">
      {account && <input type="hidden" name="id" value={account.id} />}
      <TextField label="Nombre" name="name" defaultValue={account?.name} placeholder="Ej. Ahorros Bancolombia" required />
      <SelectField label="Tipo" name="type" defaultValue={account?.type ?? "savings"} hint="Efectivo, corrientes, ahorros y billeteras cuentan como caja disponible.">
        {TYPES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </SelectField>
      <SelectField label="Moneda" name="currency" defaultValue={account?.currency ?? defaultCurrency}>
        {Object.values(CURRENCIES).map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} · {c.name}
          </option>
        ))}
      </SelectField>
      <TextField label="Fecha de apertura del registro" name="openedOn" type="date" defaultValue={account?.openedOn ?? today} max={today} hint="Desde qué fecha registrarás movimientos en esta cuenta." />
      <MoneyField label="Saldo inicial" name="openingBalance" currency={account?.currency ?? defaultCurrency} defaultValue={account?.openingBalance ?? ""} hint="Lo que tenía la cuenta en la fecha de apertura." />
      <div className="flex items-end pb-2">
        <CheckboxField name="openingNegative" label="El saldo inicial es negativo (sobregiro)" defaultChecked={account?.negative} />
      </div>
      <TextareaField label="Notas" name="notes" optional defaultValue={account?.notes ?? ""} className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <SubmitButton>{account ? "Guardar cambios" : "Crear cuenta"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
