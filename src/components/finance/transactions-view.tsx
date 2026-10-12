import Link from "next/link";
import { ArrowLeftRight, Check, CheckCheck, Pencil, Receipt, SkipForward, Trash2, X } from "lucide-react";
import type { FinanceData } from "@/server/services/finance-data";
import { upcoming } from "@/server/services/dashboard";
import { categoryLabel } from "@/server/services/categories";
import { listTransactions, type TxFilters } from "@/server/services/transactions";
import type { Tx } from "@/lib/db/client";
import type { Fmt } from "@/server/format";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, Table, buttonClass, td, tdNum, th, thNum } from "@/components/ui/primitives";
import { ConfirmAction, InlineAction } from "@/components/ui/form";
import { confirmOccurrenceAction, deleteTransactionAction, reconcileAction, setStatusAction } from "@/app/(app)/universidad/finanzas/actions";

const PAGE = 50;
const STATUS_LABEL = { planned: "Previsto", posted: "Realizado", cancelled: "Anulado" } as const;
const STATUS_TONE = { planned: "info", posted: "pos", cancelled: "neutral" } as const;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function loadTransactionsView(tx: Tx, userId: string, d: FinanceData, params: Params, fixedKind?: "income" | "expense") {
  const kind = fixedKind ?? (one(params.tipo) as TxFilters["kind"]);
  const page = Math.max(1, Number(one(params.pagina) ?? 1) || 1);
  const categoryId = one(params.categoria);
  const categoryIds = categoryId ? [categoryId, ...d.categoryRows.filter((c) => c.parentId === categoryId).map((c) => c.id)] : undefined;
  const filters: TxFilters = {
    kind: kind && ["income", "expense", "transfer"].includes(kind) ? kind : undefined,
    status: (["planned", "posted", "cancelled"] as const).find((s) => s === one(params.estado)),
    accountId: one(params.cuenta),
    categoryIds,
    from: one(params.desde),
    to: one(params.hasta),
    q: one(params.q)?.slice(0, 80),
    limit: PAGE,
    offset: (page - 1) * PAGE,
  };
  if (filters.accountId && !d.accountRows.some((a) => a.id === filters.accountId)) filters.accountId = undefined;
  if (filters.from && !/^\d{4}-\d{2}-\d{2}$/.test(filters.from)) filters.from = undefined;
  if (filters.to && !/^\d{4}-\d{2}-\d{2}$/.test(filters.to)) filters.to = undefined;
  const { rows, total } = await listTransactions(tx, userId, filters);
  const pending = upcoming(d, 30).filter((u) => !fixedKind || u.kind === fixedKind);
  return { rows, total, page, filters, pending, kind: filters.kind };
}

export function TransactionsView({
  d,
  f,
  view,
  params,
  basePath,
  fixedKind,
}: {
  d: FinanceData;
  f: Fmt;
  view: Awaited<ReturnType<typeof loadTransactionsView>>;
  params: Params;
  basePath: string;
  fixedKind?: "income" | "expense";
}) {
  const accountName = (id: string | null) => d.accountRows.find((a) => a.id === id)?.name ?? "—";
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, one(v)])), ...over })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const pages = Math.max(1, Math.ceil(view.total / PAGE));
  const categoryOptions = d.categoryRows.filter((c) => !c.archived && (!fixedKind || c.kind === fixedKind));
  return (
    <>
      {view.pending.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Pendientes y próximos 30 días" description="Confirma lo que ya ocurrió para que tus saldos sean reales. Lo vencido se asume hoy en las proyecciones." />
          <ul className="divide-y divide-border">
            {view.pending.slice(0, 12).map((u) => (
              <li key={u.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{u.description}</p>
                  <p className="text-xs text-muted">
                    {f.date(u.date)} · {accountName(u.accountId)} {u.ruleId && "· recurrente"}
                  </p>
                </div>
                {u.overdue && <Badge tone="warn">Vencido</Badge>}
                <span className={`tabular w-32 text-right ${u.kind === "income" ? "text-pos" : "text-ink"}`}>
                  {u.kind === "income" ? "+" : u.kind === "expense" ? "−" : ""}
                  {f.money(u.amount, u.currency)}
                </span>
                <div className="flex gap-1">
                  {u.txId ? (
                    <>
                      <InlineAction action={setStatusAction} fields={{ id: u.txId, status: "posted" }} title="Marcar como realizado">
                        <Check aria-hidden className="size-3.5" /> Realizado
                      </InlineAction>
                      <InlineAction action={setStatusAction} fields={{ id: u.txId, status: "cancelled" }} title="Anular">
                        <X aria-hidden className="size-3.5" /> Anular
                      </InlineAction>
                    </>
                  ) : (
                    u.ruleId && (
                      <>
                        <InlineAction action={confirmOccurrenceAction} fields={{ ruleId: u.ruleId, occurrenceDate: u.date, op: "post" }} title="Registrar como realizado">
                          <Check aria-hidden className="size-3.5" /> {u.date > d.today ? "Registrar hoy" : "Realizado"}
                        </InlineAction>
                        <InlineAction action={confirmOccurrenceAction} fields={{ ruleId: u.ruleId, occurrenceDate: u.date, op: "skip" }} title="Omitir esta ocurrencia">
                          <SkipForward aria-hidden className="size-3.5" /> Omitir
                        </InlineAction>
                      </>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <form method="get" action={basePath} className="grid gap-3 border-b border-border p-4 sm:grid-cols-3 lg:grid-cols-6" role="search" aria-label="Filtrar movimientos">
          <input name="q" defaultValue={one(params.q)} placeholder="Buscar descripción…" aria-label="Buscar" className="h-9 rounded-lg border border-border-strong bg-surface px-3 text-sm lg:col-span-2" />
          {!fixedKind && (
            <select name="tipo" defaultValue={one(params.tipo) ?? ""} aria-label="Tipo" className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm">
              <option value="">Todos los tipos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
              <option value="transfer">Transferencias</option>
            </select>
          )}
          <select name="estado" defaultValue={one(params.estado) ?? ""} aria-label="Estado" className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm">
            <option value="">Todos los estados</option>
            <option value="posted">Realizados</option>
            <option value="planned">Previstos</option>
            <option value="cancelled">Anulados</option>
          </select>
          <select name="cuenta" defaultValue={one(params.cuenta) ?? ""} aria-label="Cuenta" className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm">
            <option value="">Todas las cuentas</option>
            {d.accountRows.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select name="categoria" defaultValue={one(params.categoria) ?? ""} aria-label="Categoría" className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm">
            <option value="">Todas las categorías</option>
            {categoryOptions
              .filter((c) => !c.parentId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-muted">
            Desde <input type="date" name="desde" defaultValue={one(params.desde)} className="h-9 flex-1 rounded-lg border border-border-strong bg-surface px-2 text-sm text-ink" />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            Hasta <input type="date" name="hasta" defaultValue={one(params.hasta)} className="h-9 flex-1 rounded-lg border border-border-strong bg-surface px-2 text-sm text-ink" />
          </label>
          <div className="flex gap-2">
            <button type="submit" className={buttonClass("secondary", "sm", "h-9")}>
              Filtrar
            </button>
            <Link href={basePath} className={buttonClass("ghost", "sm", "h-9")}>
              Limpiar
            </Link>
          </div>
        </form>
        {view.rows.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title="No hay movimientos con estos filtros"
            action={
              <ButtonLink href={`/universidad/finanzas/movimientos/nuevo${fixedKind ? `?tipo=${fixedKind}` : ""}`}>
                Registrar {fixedKind === "income" ? "ingreso" : fixedKind === "expense" ? "gasto" : "movimiento"}
              </ButtonLink>
            }
          >
            Registra tus movimientos realizados y los que esperas. Los previstos no afectan tu saldo hasta que se realizan.
          </EmptyState>
        ) : (
          <>
            <Table caption="Movimientos">
              <thead>
                <tr>
                  <th className={th}>Fecha</th>
                  <th className={th}>Descripción</th>
                  <th className={th}>Estado</th>
                  <th className={thNum}>Importe</th>
                  <th className={th}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((t) => (
                  <tr key={t.id} className={t.status === "cancelled" ? "opacity-60" : undefined}>
                    <td className={`${td} whitespace-nowrap text-ink-2`}>{f.date(t.postedOn ?? t.date)}</td>
                    <td className={td}>
                      <p className="font-medium">
                        {t.kind === "transfer" && <ArrowLeftRight aria-label="Transferencia" className="mr-1 inline size-3.5 text-muted" />}
                        {t.description}
                      </p>
                      <p className="text-xs text-muted">
                        {t.kind === "transfer" ? `${accountName(t.accountId)} → ${accountName(t.toAccountId)}` : `${accountName(t.accountId)} · ${categoryLabel(d.categoryRows, t.categoryId)}`}
                        {t.recurrenceRuleId && " · recurrente"}
                        {t.debtId && " · pago de deuda"}
                      </p>
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                        {t.reconciled && (
                          <Badge tone="brand">
                            <CheckCheck aria-hidden className="size-3" /> Conciliado
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className={`${tdNum} ${t.kind === "income" ? "text-pos" : ""}`}>
                      {t.kind === "income" ? "+" : t.kind === "expense" ? "−" : ""}
                      {f.money(t.amount, t.currency)}
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-0.5">
                        {t.status === "planned" && (
                          <InlineAction action={setStatusAction} fields={{ id: t.id, status: "posted" }} title="Marcar como realizado">
                            <Check aria-hidden className="size-3.5" />
                            <span className="sr-only">Marcar como realizado</span>
                          </InlineAction>
                        )}
                        {t.status === "posted" && (
                          <InlineAction action={reconcileAction} fields={{ id: t.id, reconciled: t.reconciled ? "" : "on" }} title={t.reconciled ? "Quitar conciliación" : "Marcar conciliado con el extracto"}>
                            <CheckCheck aria-hidden className={`size-3.5 ${t.reconciled ? "text-brand" : ""}`} />
                            <span className="sr-only">{t.reconciled ? "Quitar conciliación" : "Conciliar"}</span>
                          </InlineAction>
                        )}
                        {!t.debtId && (
                          <Link href={`/universidad/finanzas/movimientos/${t.id}`} className="inline-flex h-8 items-center rounded-lg px-2 text-ink-2 hover:bg-surface-2 hover:text-ink" title="Editar">
                            <Pencil aria-hidden className="size-3.5" />
                            <span className="sr-only">Editar {t.description}</span>
                          </Link>
                        )}
                        <ConfirmAction
                          action={deleteTransactionAction}
                          fields={{ id: t.id }}
                          label={<span className="sr-only">Eliminar {t.description}</span>}
                          icon={<Trash2 aria-hidden className="size-3.5" />}
                          title="Eliminar movimiento"
                          description={
                            t.recurrenceRuleId
                              ? "Es una ocurrencia de una recurrencia: quedará anulada para que no se vuelva a generar."
                              : t.debtId
                                ? "Es un pago de deuda: también se eliminará el abono registrado en la deuda."
                                : `Se eliminará "${t.description}" y los saldos se recalcularán.`
                          }
                          confirmLabel="Eliminar"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between px-4 py-3 text-sm text-muted">
              <span>
                {view.total} movimiento(s) · página {view.page} de {pages}
              </span>
              <div className="flex gap-2">
                {view.page > 1 && (
                  <Link className={buttonClass("secondary", "sm")} href={qs({ pagina: String(view.page - 1) })}>
                    Anterior
                  </Link>
                )}
                {view.page < pages && (
                  <Link className={buttonClass("secondary", "sm")} href={qs({ pagina: String(view.page + 1) })}>
                    Siguiente
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
