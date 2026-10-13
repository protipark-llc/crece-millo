import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { financePage } from "@/server/page-data";
import { debtSummaries, netWorthNow } from "@/server/services/finance-data";
import { ASSET_TYPE_LABELS } from "@/server/services/planning";
import { accountBalance } from "@/lib/finance/cashflow";
import { convert } from "@/lib/finance/fx";
import { assetValueAt, netWorthSeries } from "@/lib/finance/networth";
import { Alert, Badge, ButtonLink, Card, CardHeader, PageHeader, Stat, Table, td, tdNum, th, thNum } from "@/components/ui/primitives";
import { LineChart } from "@/components/charts/charts";

export const metadata: Metadata = { title: "Patrimonio neto" };

const LIQ_LABEL = { liquid: "Líquido", semi_liquid: "Semilíquido", illiquid: "Ilíquido" } as const;

export default async function NetWorthPage() {
  const { d, f, nw, series, debts } = await financePage(({ d, f }) => ({
    d,
    f,
    nw: netWorthNow(d),
    series: netWorthSeries(d.today, 13, { accounts: d.accounts, txs: d.txs, assets: d.engineAssets, debts: d.engineDebts }, d.base, d.rates),
    debts: debtSummaries(d).filter((x) => x.balance > 0),
  }));
  const conv = (v: number, c: string) => convert(v, c, d.base, d.rates, d.today);
  type Row = { key: string; name: string; sub: string; value: number | null; debt: number; date: string | null; source: string | null; href?: string; liquidity: string };
  const rows: Row[] = [];
  for (const a of d.accountRows.filter((x) => !x.archivedAt)) {
    const bal = conv(accountBalance(d.accounts.find((x) => x.id === a.id)!, d.txs, d.today), a.currency) ?? 0;
    rows.push({ key: a.id, name: a.name, sub: "Cuenta", value: Math.max(0, bal), debt: Math.max(0, -bal), date: d.today, source: "Saldo registrado", liquidity: a.isLiquid ? "Líquido" : "Semilíquido" });
  }
  const linked = new Set<string>();
  for (const { asset } of d.assetRows.filter((x) => !x.asset.archivedAt)) {
    const engine = d.engineAssets.find((e) => e.id === asset.id)!;
    const v = assetValueAt(engine, d.today);
    const secured = debts.filter((x) => x.debt.securedAssetId === asset.id);
    secured.forEach((x) => linked.add(x.debt.id));
    rows.push({
      key: asset.id,
      name: asset.name,
      sub: ASSET_TYPE_LABELS[asset.type] + (secured.length ? ` · ${secured.map((x) => x.debt.name).join(", ")}` : ""),
      value: v ? conv(v.value, asset.currency) : null,
      debt: secured.reduce((s, x) => s + (conv(x.balance, x.debt.currency) ?? 0), 0),
      date: v?.valuedOn ?? null,
      source: v?.source ?? null,
      href: `/universidad/finanzas/patrimonio/${asset.id}`,
      liquidity: LIQ_LABEL[asset.liquidity],
    });
  }
  for (const x of debts.filter((x) => !linked.has(x.debt.id))) {
    rows.push({ key: x.debt.id, name: x.debt.name, sub: "Deuda sin bien asociado", value: null, debt: conv(x.balance, x.debt.currency) ?? 0, date: d.today, source: "Saldo calculado", href: `/universidad/finanzas/deudas/${x.debt.id}`, liquidity: "—" });
  }
  const totals = rows.reduce((s, r) => ({ value: s.value + (r.value ?? 0), debt: s.debt + r.debt }), { value: 0, debt: 0 });
  const first = series[0];
  const last = series.at(-1);
  return (
    <>
      <PageHeader
        title="Patrimonio neto"
        description="Lo que tienes menos lo que debes. Un bien valioso no es dinero disponible: por eso separamos patrimonio y liquidez."
        actions={
          <ButtonLink href="/universidad/finanzas/patrimonio/nuevo">
            <Plus aria-hidden className="size-4" /> Registrar activo
          </ButtonLink>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Patrimonio neto" value={nw.hasData ? f.money(nw.netWorth) : "—"} tone={nw.netWorth < 0 ? "neg" : undefined} sub={first && last && series.length > 1 ? `${f.signed(last.netWorth - first.netWorth)} desde ${f.month(first.date, true)}` : "Activos − pasivos"} />
        <Stat label="Activos" value={f.money(nw.assets)} />
        <Stat label="Pasivos" value={f.money(nw.liabilities)} />
        <Stat label="Liquidez inmediata" value={f.money(nw.liquid)} sub={`Semilíquido ${f.compact(nw.semiLiquid)} · ilíquido ${f.compact(nw.illiquid)}`} help="Solo el dinero líquido está disponible de inmediato para emergencias o pagos." />
      </div>
      {nw.unconvertedCount > 0 && <Alert tone="warn" className="mb-6">Algunos valores en otras monedas no se incluyeron por falta de tasa de cambio. Regístrala en Configuración.</Alert>}
      <Card className="mb-6">
        <CardHeader title="Evolución" description="Cierre de cada mes, calculado con los saldos, valoraciones y abonos registrados a cada fecha." />
        <div className="px-3 py-4 sm:px-5">
          {series.length > 1 ? (
            <LineChart
              title="Patrimonio neto al cierre de cada mes"
              labels={series.map((s) => f.axisMonth(s.date))}
              series={[{ key: "nw", label: "Patrimonio neto", color: "var(--series-1)", values: series.map((s) => s.netWorth) }]}
              currency={d.base}
              locale={d.locale}
            />
          ) : (
            <p className="py-8 text-center text-sm text-ink-2">La evolución aparecerá cuando tengas datos de más de un mes. Registra valoraciones periódicas de tus bienes para verla.</p>
          )}
        </div>
      </Card>
      <Card>
        <CardHeader title="Balance personal" description="Para cada bien: su valor, la deuda asociada y su valor neto. Un vehículo puede valer menos que lo que se debe por él." />
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Building2 aria-hidden className="size-6 text-muted" />
            <p className="text-sm text-ink-2">Registra cuentas, bienes o deudas para construir tu balance.</p>
          </div>
        ) : (
          <Table caption="Balance personal">
            <thead>
              <tr>
                <th className={th}>Descripción</th>
                <th className={thNum}>Valor</th>
                <th className={thNum}>Deuda</th>
                <th className={thNum}>Valor neto</th>
                <th className={th}>Valoración</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const net = (r.value ?? 0) - r.debt;
                return (
                  <tr key={r.key}>
                    <td className={td}>
                      {r.href ? (
                        <Link href={r.href} className="font-medium hover:underline">
                          {r.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{r.name}</span>
                      )}
                      <p className="text-xs text-muted">
                        {r.sub} {r.liquidity !== "—" && <Badge className="ml-1">{r.liquidity}</Badge>}
                      </p>
                    </td>
                    <td className={tdNum}>{r.value === null ? "—" : f.money(r.value)}</td>
                    <td className={tdNum}>{r.debt ? f.money(r.debt) : "—"}</td>
                    <td className={`${tdNum} font-medium ${net < 0 ? "text-neg" : ""}`}>{f.money(net)}</td>
                    <td className={`${td} text-xs text-muted`}>
                      {r.date ? f.date(r.date) : "Sin valoración"}
                      {r.source && <span className="block">{r.source}</span>}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-surface-2/60 font-semibold">
                <td className={td}>Total</td>
                <td className={tdNum}>{f.money(totals.value)}</td>
                <td className={tdNum}>{f.money(totals.debt)}</td>
                <td className={`${tdNum} ${totals.value - totals.debt < 0 ? "text-neg" : ""}`}>{f.money(totals.value - totals.debt)}</td>
                <td className={td} />
              </tr>
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
