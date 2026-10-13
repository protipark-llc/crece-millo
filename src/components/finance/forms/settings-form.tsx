"use client";

import { useState } from "react";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextField, TextareaField } from "@/components/ui/form";
import { COUNTRIES, CURRENCIES } from "@/lib/money/currency";
import { updateSettingsAction } from "@/app/(app)/configuracion/actions";

export interface SettingsDefaults {
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  incomeStability: string;
  dependentsCount: string;
  dependentsNotes: string;
  singleIncomeHousehold: boolean;
  emergencyMonthsTarget: string;
  businessExpensesEnabled: boolean;
}

export function SettingsForm({ defaults, markProfile = false, compact = false }: { defaults: SettingsDefaults; markProfile?: boolean; compact?: boolean }) {
  const [country, setCountry] = useState(defaults.country);
  const c = COUNTRIES.find((x) => x.code === country);
  return (
    <ActionForm action={updateSettingsAction} className="grid gap-4 sm:grid-cols-2">
      {markProfile && <input type="hidden" name="markProfile" value="1" />}
      <SelectField label="País" name="country" value={country} onChange={(e) => setCountry(e.target.value)}>
        {COUNTRIES.map((x) => (
          <option key={x.code} value={x.code}>
            {x.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Moneda principal" name="currency" defaultValue={country !== defaults.country ? (c?.currency ?? defaults.currency) : defaults.currency} key={`cur-${country}`} hint="Los totales consolidados se expresan en esta moneda.">
        {Object.values(CURRENCIES).map((x) => (
          <option key={x.code} value={x.code}>
            {x.code} · {x.name}
          </option>
        ))}
      </SelectField>
      {!compact && (
        <>
          <TextField label="Formato regional" name="locale" defaultValue={country !== defaults.country ? c?.locale : defaults.locale} key={`loc-${country}`} hint="Ej. es-CO: 1.234.567,89 y fechas día/mes/año." />
          <TextField label="Zona horaria" name="timezone" defaultValue={country !== defaults.country ? c?.timezone : defaults.timezone} key={`tz-${country}`} hint="Define qué día es 'hoy' para tus cálculos." />
        </>
      )}
      {compact && (
        <>
          <input type="hidden" name="locale" value={country !== defaults.country ? (c?.locale ?? defaults.locale) : defaults.locale} />
          <input type="hidden" name="timezone" value={country !== defaults.country ? (c?.timezone ?? defaults.timezone) : defaults.timezone} />
        </>
      )}
      <SelectField label="Estabilidad de tus ingresos" name="incomeStability" defaultValue={defaults.incomeStability} hint="Afecta la sugerencia de meses del fondo de emergencia.">
        <option value="">Prefiero no decir</option>
        <option value="stable">Estables (salario fijo)</option>
        <option value="mixed">Mixtos (fijo + variable)</option>
        <option value="variable">Variables (independiente, comisiones, negocio)</option>
      </SelectField>
      <TextField label="Personas que dependen económicamente de ti" name="dependentsCount" inputMode="numeric" defaultValue={defaults.dependentsCount} optional />
      <TextareaField label="Notas sobre dependientes" name="dependentsNotes" defaultValue={defaults.dependentsNotes} optional className="sm:col-span-2" />
      <TextField label="Meses objetivo del fondo de emergencia" name="emergencyMonthsTarget" inputMode="numeric" defaultValue={defaults.emergencyMonthsTarget} optional hint="Déjalo vacío para usar la sugerencia." />
      <div className="flex flex-col justify-end gap-3 pb-1">
        <CheckboxField name="singleIncomeHousehold" label="El hogar depende de un solo ingreso" defaultChecked={defaults.singleIncomeHousehold} />
        <CheckboxField name="businessExpensesEnabled" label="Habilitar categoría de gastos de negocio" defaultChecked={defaults.businessExpensesEnabled} />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>Guardar</SubmitButton>
      </div>
    </ActionForm>
  );
}
