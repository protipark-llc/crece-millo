"use client";

import { ActionForm, CheckboxField, MoneyField, SubmitButton, TextField } from "@/components/ui/form";
import { updateRuleAction } from "@/app/(app)/universidad/finanzas/actions";

export function RuleForm({ rule }: { rule: { id: string; description: string; amount: string; currency: string; endDate: string; active: boolean } }) {
  return (
    <ActionForm action={updateRuleAction} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="id" value={rule.id} />
      <TextField label="Descripción" name="description" defaultValue={rule.description} />
      <MoneyField label="Importe" name="amount" currency={rule.currency} defaultValue={rule.amount} hint="Aplica a las próximas ocurrencias." />
      <TextField label="Termina" name="endDate" type="date" defaultValue={rule.endDate} optional />
      <div className="flex flex-col gap-2">
        <CheckboxField name="active" label="Activa" defaultChecked={rule.active} />
        <SubmitButton size="sm" variant="secondary">
          Guardar
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
