"use client";

import { ActionForm, CheckboxField, MoneyField, SelectField, SubmitButton, TextareaField } from "@/components/ui/form";
import { createBudgetAction, reallocateAction, updateBudgetAction, upsertBudgetLineAction } from "@/app/(app)/universidad/finanzas/actions";

type Opt = { id: string; label: string; group?: string };

export function CreateBudgetForm({ month, currency, previousMonth, suggestedIncome }: { month: string; currency: string; previousMonth: string | null; suggestedIncome: string }) {
  return (
    <ActionForm action={createBudgetAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="currency" value={currency} />
      <MoneyField label="Ingreso esperado del mes" name="expectedIncome" currency={currency} defaultValue={suggestedIncome} hint="Sugerido a partir de tus ingresos recurrentes o del promedio reciente. Ajústalo." optional />
      <MoneyField label="Meta de ahorro del mes" name="savingsTarget" currency={currency} optional hint="Si lo dejas vacío y eliges una plantilla con ahorro, se calcula como porcentaje del ingreso." />
      <SelectField label="Punto de partida" name="copyFromMonth" defaultValue={previousMonth ?? ""}>
        <option value="">Empezar desde cero</option>
        {previousMonth && <option value={previousMonth}>Copiar el presupuesto de {previousMonth.slice(0, 7)}</option>}
      </SelectField>
      <SelectField label="Plantilla educativa (opcional)" name="template" defaultValue="" hint="Solo sugiere una meta de ahorro; tú decides la distribución.">
        <option value="">Ninguna</option>
        <option value="zero_based">Base cero (asignar cada peso)</option>
        <option value="pay_yourself_first">Págate primero (10 % ahorro)</option>
        <option value="fifty_thirty_twenty">50 / 30 / 20 (20 % ahorro)</option>
      </SelectField>
      <div className="sm:col-span-2">
        <SubmitButton>Crear presupuesto</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function BudgetLineForm({ budgetId, currency, categories }: { budgetId: string; currency: string; categories: Opt[] }) {
  const groups = [...new Set(categories.map((c) => c.group ?? ""))];
  return (
    <ActionForm action={upsertBudgetLineAction} resetOnSuccess className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="budgetId" value={budgetId} />
      <SelectField label="Categoría" name="categoryId" className="sm:col-span-2" hint="Si la categoría ya tiene línea, se actualiza.">
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {categories
              .filter((c) => (c.group ?? "") === g)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
          </optgroup>
        ))}
      </SelectField>
      <MoneyField label="Mensual" name="planned" currency={currency} optional />
      <MoneyField label="o anual (÷ 12)" name="annual" currency={currency} optional hint="Ej. SOAT, predial, vacaciones." />
      <div className="sm:col-span-4">
        <SubmitButton size="sm">Guardar línea</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ReallocateForm({ currency, lines }: { currency: string; lines: Opt[] }) {
  return (
    <ActionForm action={reallocateAction} resetOnSuccess className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <SelectField label="Desde" name="fromLineId">
        {lines.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </SelectField>
      <SelectField label="Hacia" name="toLineId" defaultValue={lines[1]?.id}>
        {lines.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </SelectField>
      <MoneyField label="Importe" name="amount" currency={currency} />
      <SubmitButton size="sm" variant="secondary">
        Reasignar
      </SubmitButton>
    </ActionForm>
  );
}

export function BudgetMetaForm({ budget, currency }: { budget: { id: string; expectedIncome: string; savingsTarget: string; notes: string; approved: boolean }; currency: string }) {
  return (
    <ActionForm action={updateBudgetAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={budget.id} />
      <MoneyField label="Ingreso esperado" name="expectedIncome" currency={currency} defaultValue={budget.expectedIncome} optional hint="Vacío = usar lo recibido + lo previsto del mes." />
      <MoneyField label="Meta de ahorro" name="savingsTarget" currency={currency} defaultValue={budget.savingsTarget} />
      <TextareaField label="Notas" name="notes" defaultValue={budget.notes} optional className="sm:col-span-2" />
      <CheckboxField name="approve" label="Presupuesto aprobado (plan definitivo del mes)" defaultChecked={budget.approved} />
      <div className="sm:col-span-2">
        <SubmitButton size="sm" variant="secondary">
          Guardar
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
