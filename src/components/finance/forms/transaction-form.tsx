"use client";

import { useMemo, useState } from "react";
import { ActionForm, MoneyField, SelectField, SubmitButton, TextField, TextareaField } from "@/components/ui/form";
import { cn } from "@/components/ui/cn";
import { createTransactionAction, updateTransactionAction } from "@/app/(app)/universidad/finanzas/actions";

export interface FormAccount {
  id: string;
  name: string;
  currency: string;
}
export interface FormCategory {
  id: string;
  name: string;
  kind: "income" | "expense";
  parentId: string | null;
}
type Kind = "income" | "expense" | "transfer";

export interface TxDefaults {
  id?: string;
  kind: Kind;
  status: "planned" | "posted" | "cancelled";
  amount: string;
  accountId: string;
  toAccountId: string;
  toAmount: string;
  date: string;
  postedOn: string;
  categoryId: string;
  nature: string;
  incomeSource: string;
  description: string;
  counterparty: string;
  notes: string;
}

const KIND_LABEL: Record<Kind, string> = { expense: "Gasto", income: "Ingreso", transfer: "Transferencia" };
const SOURCES = [
  ["salary", "Salario"],
  ["fees", "Honorarios"],
  ["sales", "Ventas"],
  ["business", "Negocio"],
  ["investment", "Inversión"],
  ["rental", "Arriendo"],
  ["pension", "Pensión"],
  ["other", "Otra"],
] as const;
const FREQUENCIES = [
  ["once", "No se repite"],
  ["weekly", "Semanal"],
  ["biweekly", "Cada dos semanas"],
  ["semimonthly", "Quincenal (15 y fin de mes)"],
  ["monthly", "Mensual"],
  ["quarterly", "Trimestral"],
  ["yearly", "Anual"],
  ["daily", "Diaria"],
] as const;

export function TransactionForm({
  accounts,
  categories,
  defaults,
  today,
  lockKind = false,
  successHref,
}: {
  accounts: FormAccount[];
  categories: FormCategory[];
  defaults: TxDefaults;
  today: string;
  lockKind?: boolean;
  successHref?: string;
}) {
  const editing = !!defaults.id;
  const [kind, setKind] = useState<Kind>(defaults.kind);
  const [status, setStatus] = useState(defaults.status);
  const [accountId, setAccountId] = useState(defaults.accountId || accounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(defaults.toAccountId || accounts.find((a) => a.id !== (defaults.accountId || accounts[0]?.id))?.id || "");
  const [frequency, setFrequency] = useState("once");
  const account = accounts.find((a) => a.id === accountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const groups = useMemo(() => {
    const roots = categories.filter((c) => c.kind === kind && !c.parentId);
    return roots.map((r) => ({ root: r, children: categories.filter((c) => c.parentId === r.id) }));
  }, [categories, kind]);

  if (!accounts.length) {
    return <p className="text-sm text-ink-2">Primero crea una cuenta en la sección Cuentas.</p>;
  }
  const statusOptions =
    kind === "income"
      ? [["posted", "Recibido"], ["planned", "Previsto (aún no llega)"], ["cancelled", "Cancelado"]]
      : kind === "expense"
        ? [["posted", "Pagado"], ["planned", "Previsto / por pagar"], ["cancelled", "Cancelado"]]
        : [["posted", "Realizada"], ["planned", "Prevista"], ["cancelled", "Cancelada"]];
  return (
    <ActionForm
      action={editing ? updateTransactionAction : createTransactionAction}
      idempotent={!editing}
      resetOnSuccess={!editing && !successHref}
      onSuccessHref={successHref}
      className="space-y-5"
    >
      {editing && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="kind" value={kind} />
      {!lockKind && !editing && (
        <div role="radiogroup" aria-label="Tipo de movimiento" className="inline-flex rounded-lg bg-surface-2 p-1">
          {(["expense", "income", "transfer"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn("rounded-md px-4 py-1.5 text-sm font-medium", kind === k ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink")}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Descripción" name="description" defaultValue={defaults.description} placeholder={kind === "income" ? "Ej. Nómina octubre" : kind === "expense" ? "Ej. Mercado semanal" : "Ej. Ahorro del mes"} required />
        <MoneyField label="Importe" name="amount" currency={account?.currency ?? ""} defaultValue={defaults.amount} required />
        <SelectField label={kind === "transfer" ? "Desde la cuenta" : kind === "income" ? "Cuenta de destino" : "Pagado desde"} name="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </SelectField>
        {kind === "transfer" ? (
          <SelectField label="Hacia la cuenta" name="toAccountId" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} hint="Mover dinero entre tus cuentas no es ingreso ni gasto.">
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
          </SelectField>
        ) : (
          <SelectField label="Categoría" name="categoryId" defaultValue={defaults.categoryId} key={kind} optional>
            <option value="">Sin categoría</option>
            {groups.map((g) =>
              g.children.length ? (
                <optgroup key={g.root.id} label={g.root.name}>
                  <option value={g.root.id}>{g.root.name} (general)</option>
                  {g.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={g.root.id} value={g.root.id}>
                  {g.root.name}
                </option>
              ),
            )}
          </SelectField>
        )}
        {kind === "transfer" && toAccount && account && toAccount.currency !== account.currency && (
          <MoneyField label={`Importe recibido en ${toAccount.currency}`} name="toAmount" currency={toAccount.currency} defaultValue={defaults.toAmount} hint="Las cuentas tienen monedas distintas: indica cuánto llegó." />
        )}
        <SelectField label="Estado" name="status" value={status} onChange={(e) => setStatus(e.target.value as TxDefaults["status"])} hint={status === "planned" ? "No afecta tu saldo hasta que lo marques como realizado." : undefined}>
          {statusOptions.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </SelectField>
        <TextField
          label={status === "planned" ? "Fecha prevista o de vencimiento" : "Fecha"}
          name="date"
          type="date"
          defaultValue={defaults.date || today}
          max={status === "posted" && !editing ? today : undefined}
          required
        />
        {editing && status === "posted" && (
          <TextField label="Fecha efectiva" name="postedOn" type="date" defaultValue={defaults.postedOn} max={today} hint="Cuando el dinero realmente entró o salió." optional />
        )}
        {kind === "expense" && (
          <SelectField label="Tipo de gasto" name="nature" defaultValue={defaults.nature} hint="Esencial: necesario para vivir u obligatorio. Discrecional: puedes ajustarlo.">
            <option value="">Según la categoría</option>
            <option value="essential">Esencial</option>
            <option value="discretionary">Discrecional</option>
          </SelectField>
        )}
        {kind === "income" && (
          <SelectField label="Fuente" name="incomeSource" defaultValue={defaults.incomeSource || "salary"}>
            {SOURCES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </SelectField>
        )}
        {!editing && (
          <SelectField label="¿Se repite?" name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} hint={frequency !== "once" ? "Se crea una recurrencia: las próximas ocurrencias aparecen como previstas para que las confirmes." : undefined}>
            {FREQUENCIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </SelectField>
        )}
        {!editing && frequency !== "once" && <TextField label="Hasta" name="endDate" type="date" optional hint="Déjalo vacío si no tiene fecha final." />}
        <TextField label={kind === "income" ? "Pagador" : "Beneficiario"} name="counterparty" defaultValue={defaults.counterparty} optional />
        <TextareaField label="Observaciones" name="notes" defaultValue={defaults.notes} optional className="sm:col-span-2" />
      </div>
      <SubmitButton>{editing ? "Guardar cambios" : `Registrar ${KIND_LABEL[kind].toLowerCase()}`}</SubmitButton>
    </ActionForm>
  );
}
