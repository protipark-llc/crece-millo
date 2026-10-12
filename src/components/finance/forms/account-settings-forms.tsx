"use client";

import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { CURRENCIES } from "@/lib/money/currency";
import { addRateAction, deleteAccountDataAction } from "@/app/(app)/configuracion/actions";

export function RateForm({ base, today }: { base: string; today: string }) {
  const codes = Object.keys(CURRENCIES);
  return (
    <ActionForm action={addRateAction} resetOnSuccess className="grid gap-3 sm:grid-cols-5 sm:items-end">
      <SelectField label="1 unidad de" name="from" defaultValue={codes.find((c) => c !== base) ?? "USD"}>
        {codes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <SelectField label="equivale a" name="to" defaultValue={base}>
        {codes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <TextField label="Tasa" name="rate" inputMode="decimal" placeholder="Ej. 4100,50" />
      <TextField label="Fecha" name="asOf" type="date" defaultValue={today} max={today} />
      <TextField label="Fuente" name="source" placeholder="Ej. TRM oficial" />
      <div className="sm:col-span-5">
        <SubmitButton size="sm" variant="secondary">
          Registrar tasa
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeleteAccountForm() {
  return (
    <ActionForm action={deleteAccountDataAction} className="flex flex-wrap items-end gap-3">
      <TextField label="Confirma con tu contraseña" name="password" type="password" autoComplete="current-password" className="min-w-60" />
      <SubmitButton variant="danger">Eliminar mi cuenta y todos mis datos</SubmitButton>
    </ActionForm>
  );
}
