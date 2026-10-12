"use client";

import { useState } from "react";
import { ActionForm, MoneyField, SelectField, SubmitButton, TextField, TextareaField } from "@/components/ui/form";
import { CURRENCIES } from "@/lib/money/currency";
import { addValuationAction, createAssetAction, updateAssetAction } from "@/app/(app)/universidad/finanzas/actions";

const TYPES: [string, string, string][] = [
  ["real_estate", "Inmueble", "illiquid"],
  ["vehicle", "Vehículo", "illiquid"],
  ["investment", "Inversión (CDT, fondos, acciones)", "semi_liquid"],
  ["business", "Participación en empresa", "illiquid"],
  ["retirement", "Fondo de pensiones / cesantías", "illiquid"],
  ["receivable", "Cuenta por cobrar (te deben)", "semi_liquid"],
  ["valuables", "Muebles, joyas, arte", "illiquid"],
  ["other", "Otro", "illiquid"],
];

const LIQ = (
  <>
    <option value="liquid">Líquido (disponible ya)</option>
    <option value="semi_liquid">Semilíquido (días o semanas)</option>
    <option value="illiquid">Ilíquido (meses o costoso de vender)</option>
  </>
);

export function AssetForm({ defaultCurrency, today }: { defaultCurrency: string; today: string }) {
  const [type, setType] = useState("real_estate");
  const [liq, setLiq] = useState("illiquid");
  const [currency, setCurrency] = useState(defaultCurrency);
  return (
    <ActionForm action={createAssetAction} className="grid gap-4 sm:grid-cols-2">
      <TextField label="Nombre" name="name" placeholder="Ej. Apartamento Chapinero" required />
      <SelectField
        label="Tipo"
        name="type"
        value={type}
        onChange={(e) => {
          setType(e.target.value);
          setLiq(TYPES.find((t) => t[0] === e.target.value)?.[2] ?? "illiquid");
        }}
      >
        {TYPES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </SelectField>
      <SelectField label="Liquidez" name="liquidity" value={liq} onChange={(e) => setLiq(e.target.value)} hint="Qué tan rápido podrías convertirlo en dinero sin perder valor.">
        {LIQ}
      </SelectField>
      <SelectField label="Moneda" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {Object.values(CURRENCIES).map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </SelectField>
      <MoneyField label="Valor estimado" name="value" currency={currency} required />
      <TextField label="Fecha de la valoración" name="valuedOn" type="date" defaultValue={today} max={today} />
      <TextField label="Fuente de la estimación" name="source" placeholder="Ej. avalúo comercial, tabla Fasecolda, extracto" optional className="sm:col-span-2" />
      <TextareaField label="Notas" name="notes" optional className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <SubmitButton>Registrar activo</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function AssetEditForm({ asset }: { asset: { id: string; name: string; liquidity: string; notes: string } }) {
  return (
    <ActionForm action={updateAssetAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={asset.id} />
      <TextField label="Nombre" name="name" defaultValue={asset.name} />
      <SelectField label="Liquidez" name="liquidity" defaultValue={asset.liquidity}>
        {LIQ}
      </SelectField>
      <TextareaField label="Notas" name="notes" defaultValue={asset.notes} optional className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <SubmitButton variant="secondary">Guardar</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ValuationForm({ assetId, currency, today }: { assetId: string; currency: string; today: string }) {
  return (
    <ActionForm action={addValuationAction} resetOnSuccess className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="assetId" value={assetId} />
      <MoneyField label="Nuevo valor" name="value" currency={currency} />
      <TextField label="Fecha" name="valuedOn" type="date" defaultValue={today} max={today} />
      <TextField label="Fuente" name="source" optional />
      <SubmitButton size="sm" variant="secondary">
        Registrar valoración
      </SubmitButton>
    </ActionForm>
  );
}
