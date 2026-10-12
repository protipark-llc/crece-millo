"use client";

import { useState } from "react";
import { ActionForm, MoneyField, SelectField, SubmitButton, TextField, TextareaField } from "@/components/ui/form";
import { CURRENCIES } from "@/lib/money/currency";
import { contributionAction, createGoalAction, updateGoalAction } from "@/app/(app)/universidad/finanzas/actions";

const TYPES = [
  ["emergency_fund", "Fondo de emergencia"],
  ["education", "Educación"],
  ["housing", "Vivienda"],
  ["travel", "Viajes"],
  ["asset_purchase", "Compra de un bien"],
  ["financial_independence", "Independencia financiera"],
  ["investment", "Inversión"],
  ["other", "Otro"],
] as const;

export interface GoalDefaults {
  id?: string;
  name: string;
  type: string;
  currency: string;
  targetAmount: string;
  targetDate: string;
  priority: string;
  plannedMonthly: string;
  accountId: string;
  emergencyMonthsTarget: string;
  notes: string;
}

export function GoalForm({ defaults, accounts, today, suggestedMonths, essentialMonthly }: { defaults: GoalDefaults; accounts: { id: string; name: string }[]; today: string; suggestedMonths: number; essentialMonthly: string | null }) {
  const [type, setType] = useState(defaults.type);
  const editing = !!defaults.id;
  return (
    <ActionForm action={editing ? updateGoalAction : createGoalAction} className="grid gap-4 sm:grid-cols-2">
      {editing && <input type="hidden" name="id" value={defaults.id} />}
      {editing && <input type="hidden" name="type" value={defaults.type} />}
      {editing && <input type="hidden" name="currency" value={defaults.currency} />}
      <TextField label="Nombre" name="name" defaultValue={defaults.name} placeholder="Ej. Fondo de emergencia" required />
      {!editing && (
        <SelectField label="Tipo" name="type" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </SelectField>
      )}
      {!editing && (
        <SelectField label="Moneda" name="currency" defaultValue={defaults.currency}>
          {Object.values(CURRENCIES).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </SelectField>
      )}
      {type === "emergency_fund" && (
        <TextField
          label="Meses de gastos esenciales a cubrir"
          name="emergencyMonthsTarget"
          inputMode="numeric"
          defaultValue={defaults.emergencyMonthsTarget || String(suggestedMonths)}
          hint={essentialMonthly ? `Tu gasto esencial mensual de referencia es ${essentialMonthly}. Si dejas vacío el monto objetivo, se calcula meses × ese valor.` : "Registra gastos esenciales para calcular el monto automáticamente."}
        />
      )}
      <MoneyField label="Monto objetivo" name="targetAmount" currency={defaults.currency} defaultValue={defaults.targetAmount} optional={type === "emergency_fund"} />
      <TextField label="Fecha deseada" name="targetDate" type="date" defaultValue={defaults.targetDate} min={today} optional />
      <SelectField label="Prioridad" name="priority" defaultValue={defaults.priority || "3"}>
        <option value="1">1 · Muy alta</option>
        <option value="2">2 · Alta</option>
        <option value="3">3 · Media</option>
        <option value="4">4 · Baja</option>
        <option value="5">5 · Muy baja</option>
      </SelectField>
      <MoneyField label="Aporte mensual planeado" name="plannedMonthly" currency={defaults.currency} defaultValue={defaults.plannedMonthly} optional />
      <SelectField label="Cuenta donde guardas este dinero" name="accountId" defaultValue={defaults.accountId} optional>
        <option value="">Sin cuenta específica</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>
      {!editing && <MoneyField label="Ya tienes ahorrado" name="initialAmount" currency={defaults.currency} optional />}
      <TextareaField label="Notas" name="notes" defaultValue={defaults.notes} optional className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <SubmitButton>{editing ? "Guardar cambios" : "Crear objetivo"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ContributionForm({ goalId, currency, today }: { goalId: string; currency: string; today: string }) {
  return (
    <ActionForm action={contributionAction} resetOnSuccess className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="goalId" value={goalId} />
      <SelectField label="Movimiento" name="direction" defaultValue="in">
        <option value="in">Aporte</option>
        <option value="out">Retiro</option>
      </SelectField>
      <MoneyField label="Importe" name="amount" currency={currency} />
      <TextField label="Fecha" name="contributedOn" type="date" defaultValue={today} max={today} />
      <SubmitButton size="sm" variant="secondary">
        Registrar
      </SubmitButton>
    </ActionForm>
  );
}
