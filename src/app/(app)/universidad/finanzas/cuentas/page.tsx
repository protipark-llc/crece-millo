import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, Pencil } from "lucide-react";
import { financePage } from "@/server/page-data";
import { accountBalances } from "@/lib/finance/cashflow";
import { addDays } from "@/lib/finance/dates";
import { convert } from "@/lib/finance/fx";
import { ACCOUNT_TYPE_LABELS } from "@/server/services/accounts";
import { Badge, Card, CardHeader, EmptyState, InfoTip, PageHeader, Stat, Table, td, tdNum, th, thNum } from "@/components/ui/primitives";
import { ConfirmAction } from "@/components/ui/form";
import { AccountForm } from "@/components/finance/forms/account-form";
import { archiveAccountAction } from "../actions";

export const metadata: Metadata = { title: "Cuentas" };

export default async function AccountsPage() {
  const { d, f, rows } = await financePage(({ d, f }) => {
    const to = addDays(d.today, 30);
    const balances = accountBalances(d.accounts, d.txs, d.rules, d.today, to);
    const rows = d.accountRows.map((a, i) => ({ a, b: balances[i]! }));
    return { d, f, rows };
  });
  const active = rows.filter((r) => !r.a.archivedAt);
  const toBase = (v: number, c: string) => convert(v, c, d.base, d.rates, d.today);
  const liquid = active.filter((r) => r.a.isLiquid).reduce((s, r) => s + (toBase(r.b.registered, r.a.currency) ?? 0), 0);
  const nonLiquid = active.filter((r) => !r.a.isLiquid).reduce((s, r) => s + (toBase(r.b.registered, r.a.currency) ?? 0), 0);
  const projected = active.filter((r) => r.a.isLiquid).reduce((s, r) => s + (toBase(r.b.projected, r.a.currency) ?? 0), 0);
  return (
    <>
      <PageHeader title="Cuentas" description="Tu dinero vive en cuentas. Los saldos se calculan a partir del saldo inicial y de los movimientos registrados." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Caja disponible" value={f.money(liquid)} help="Suma de saldos registrados de efectivo, cuentas corrientes, de ahorro y billeteras." />
        <Stat label="Proyectado a 30 días" value={f.money(projected)} tone={projected < 0 ? "neg" : undefined} help="Saldo de caja si se cumplen los movimientos previstos y recurrentes de los próximos 30 días." />
        <Stat label="Cuentas de inversión" value={f.money(nonLiquid)} help="No se cuentan como caja disponible: retirar puede tomar tiempo o tener costos." />
      </div>
      <Card className="mb-6">
        <CardHeader title="Tus cuentas" description="Registrado = movimientos realizados. Conciliado = solo los que verificaste contra tu extracto. Proyectado = con lo previsto a 30 días." />
        {rows.length === 0 ? (
          <EmptyState icon={<Landmark className="size-6" />} title="Aún no tienes cuentas">
            Crea tu primera cuenta con el saldo que tiene hoy. Puede ser una cuenta de ahorros, efectivo o una billetera digital.
          </EmptyState>
        ) : (
          <Table caption="Cuentas y saldos">
            <thead>
              <tr>
                <th className={th}>Cuenta</th>
                <th className={thNum}>Registrado</th>
                <th className={thNum}>
                  <span className="inline-flex items-center gap-1">
                    Conciliado <InfoTip text="Saldo considerando solo los movimientos que marcaste como conciliados. Si difiere del registrado, revisa tu extracto." />
                  </span>
                </th>
                <th className={thNum}>Proyectado 30 d</th>
                <th className={th}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, b }) => (
                <tr key={a.id} className={a.archivedAt ? "opacity-60" : undefined}>
                  <td className={td}>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted">
                      {ACCOUNT_TYPE_LABELS[a.type]} · {a.currency} {a.isLiquid ? "" : "· no líquida"} {a.archivedAt && <Badge>Archivada</Badge>}
                    </p>
                  </td>
                  <td className={`${tdNum} ${b.registered < 0 ? "text-neg" : ""}`}>{f.money(b.registered, a.currency)}</td>
                  <td className={tdNum}>{f.money(b.reconciled, a.currency)}</td>
                  <td className={`${tdNum} ${b.projected < 0 ? "text-neg" : ""}`}>{f.money(b.projected, a.currency)}</td>
                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-1">
                      <Link href={`/universidad/finanzas/cuentas/${a.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
                        <Pencil aria-hidden className="size-3.5" /> Editar
                      </Link>
                      <ConfirmAction
                        action={archiveAccountAction}
                        fields={{ id: a.id, archived: a.archivedAt ? "" : "on" }}
                        label={a.archivedAt ? "Reactivar" : "Archivar"}
                        title={a.archivedAt ? "Reactivar cuenta" : "Archivar cuenta"}
                        description={a.archivedAt ? "La cuenta volverá a aparecer en formularios y en tu caja." : "La cuenta dejará de aparecer en formularios y en tu caja disponible. Su historia se conserva."}
                        danger={false}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader title="Nueva cuenta" />
        <div className="p-5">
          <AccountForm defaultCurrency={d.base} today={d.today} />
        </div>
      </Card>
    </>
  );
}
