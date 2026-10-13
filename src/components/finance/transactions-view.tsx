import Link from "next/link";
import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, CheckCheck, Clock, Pencil, Receipt, Search, SkipForward, Trash2, X } from "lucide-react";
import type { FinanceData } from "@/server/services/finance-data";
import { upcoming } from "@/server/services/dashboard";
import { categoryLabel } from "@/server/services/categories";
import { listTransactions, type TxFilters } from "@/server/services/transactions";
import type { Tx } from "@/lib/db/client";
import type { Fmt } from "@/server/format";
import { Badge, ButtonLink, Card, EmptyState, Table, buttonClass, td, tdNum, th, thNum } from "@/components/ui/primitives";
import { AutoSubmitForm } from "@/components/ui/auto-submit-form";
import { cn } from "@/components/ui/cn";
import { ConfirmAction, InlineAction } from "@/components/ui/form";
import { confirmOccurrenceAction, deleteTransactionAction, reconcileAction, setStatusAction } from "@/app/(app)/universidad/finanzas/actions";

const PAGE = 50;
const KIND_ICON = { income: ArrowDownLeft, expense: ArrowUpRight, transfer: ArrowLeftRight } as const;
const KIND_TABS = [
  { key: "", label: "Todos" },
  { key: "expense", label: "Gastos" },
  { key: "income", label: "Ingresos" },
  { key: "transfer", label: "Transferencias" },
] as const;
const field = "h-11 w-full rounded-md border border-control-border bg-surface px-3 text-sm text-ink";

/** Estado del movimiento, siempre con ícono y palabra. */
function StatusBadge({ status, reconciled }: { status: "planned" | "posted" | "cancelled"; reconciled: boolean }) {
  if (status === "cancelled") return <Badge tone="neutral">Anulado</Badge>;
  if (status === "planned")
    return (
      <Badge tone="info">
        <Clock aria-hidden className="size-3" /> Previsto
      </Badge>
    );
  if (reconciled)
    return (
      <Badge tone="neutral">
        <CheckCheck aria-hidden className="size-3" /> Conciliado
      </Badge>
    );
  return (
    <Badge tone="pos">
      <Check aria-hidden className="size-3" /> Realizado
    </Badge>
  );
}

function amountClass(kind: string, cancelled = false) {
  return cn("tabular font-semibold whitespace-nowrap", cancelled ? "text-muted line-through" : kind === "income" ? "text-pos" : kind === "expense" ? "text-neg" : "text-ink");
}
function sign(kind: string) {
  return kind === "income" ? "+" : kind === "expense" ? "−" : "";
}

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
  const overdue = view.pending.filter((u) => u.overdue).length;
  const showAllPending = one(params.pendientes) === "todos";
  const pendingShown = showAllPending ? view.pending.slice(0, 30) : view.pending.slice(0, 5);
  const hasFilters = ["q", "estado", "cuenta", "categoria", "desde", "hasta", ...(fixedKind ? [] : ["tipo"])].some((k) => one(params[k]));
  const dayLabel = (iso: string) => {
    if (iso === d.today) return `Hoy · ${f.date(iso).replace(/ \d{4}$/, "")}`;
    const wd = new Intl.DateTimeFormat(d.locale, { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
    return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} · ${f.date(iso).replace(/ \d{4}$/, "")}`;
  };
  const sub = (t: (typeof view.rows)[number]) =>
    (t.kind === "transfer" ? `${accountName(t.accountId)} → ${accountName(t.toAccountId)}` : `${accountName(t.accountId)} · ${categoryLabel(d.categoryRows, t.categoryId)}`) +
    (t.recurrenceRuleId ? " · recurrente" : "") +
    (t.debtId ? " · pago de deuda" : "");
  // Agrupación por día para la lista móvil.
  const groups: { day: string; net: number; rows: typeof view.rows }[] = [];
  for (const t of view.rows) {
    const day = t.postedOn ?? t.date;
    let g = groups[groups.length - 1];
    if (!g || g.day !== day) groups.push((g = { day, net: 0, rows: [] }));
    g.rows.push(t);
    if (t.status !== "cancelled" && t.currency === d.base) g.net += t.kind === "income" ? t.amount : t.kind === "expense" ? -t.amount : 0;
  }
  const from = view.total ? (view.page - 1) * PAGE + 1 : 0;
  const to = Math.min(view.total, view.page * PAGE);

  return (
    <>
      {view.pending.length > 0 && (
        <Card className={cn("mb-5 overflow-hidden", overdue > 0 && "border-warn/40")}>
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
                Por confirmar y próximos 30 días
                {overdue > 0 && (
                  <Badge tone="warn">
                    <AlertTriangle aria-hidden className="size-3" /> {overdue} {overdue === 1 ? "vencido" : "vencidos"}
                  </Badge>
                )}
              </h2>
              <p className="mt-0.5 text-xs text-muted">Confirma lo que ya pasó para que tus saldos sean reales. Lo vencido se asume hoy en las proyecciones.</p>
            </div>
            {view.pending.length > 3 && (
              <Link href={qs({ pendientes: showAllPending ? undefined : "todos" })} scroll={false} className="inline-flex min-h-9 items-center text-sm font-semibold text-ink hover:underline">
                {showAllPending ? "Ver menos" : `Ver los ${view.pending.length}`}
              </Link>
            )}
          </div>
          <ul className="divide-y divide-border border-t border-border">
            {pendingShown.map((u) => (
              <li
                key={u.key}
                className={cn("grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-sm sm:px-5 md:flex md:flex-wrap", u.overdue && "bg-warn-soft", !showAllPending && "[&:nth-child(n+4)]:hidden md:[&:nth-child(n+4)]:flex")}
              >
                <span className={cn("hidden w-28 shrink-0 tabular md:block", u.overdue ? "font-semibold text-warn" : "text-ink-2")}>
                  {u.date === d.today ? `Hoy · ${f.date(u.date).replace(/ \d{4}$/, "")}` : f.date(u.date)}
                  {u.overdue && u.date !== d.today && <span className="block text-xs font-medium">Vencido</span>}
                </span>
                <div className="min-w-0 md:flex-1 md:basis-48">
                  <p className="truncate font-semibold text-ink">{u.description}</p>
                  <p className="truncate text-xs text-muted">
                    <span className={cn("md:hidden", u.overdue && "font-semibold text-warn")}>
                      {u.overdue ? (u.date === d.today ? "Vence hoy" : `Vencido · ${f.date(u.date)}`) : f.date(u.date)} ·{" "}
                    </span>
                    {accountName(u.accountId)}
                    {u.kind !== "transfer" && ` · ${categoryLabel(d.categoryRows, u.categoryId)}`}
                    {u.ruleId && " · recurrente"}
                  </p>
                </div>
                <span className={cn(amountClass(u.kind), "text-right md:w-28")}>
                  {sign(u.kind)}
                  {f.money(u.amount, u.currency)}
                </span>
                <div className="col-span-2 flex gap-1">
                  {u.txId ? (
                    <>
                      <InlineAction action={setStatusAction} fields={{ id: u.txId, status: "posted" }} title="Marcar como realizado" className="border border-border-strong bg-surface text-ink">
                        <Check aria-hidden className="size-3.5" /> {u.overdue && u.kind === "expense" ? "Ya lo pagué" : "Realizado"}
                      </InlineAction>
                      <InlineAction action={setStatusAction} fields={{ id: u.txId, status: "cancelled" }} title="Anular">
                        <X aria-hidden className="size-3.5" /> Anular
                      </InlineAction>
                    </>
                  ) : (
                    u.ruleId && (
                      <>
                        <InlineAction
                          action={confirmOccurrenceAction}
                          fields={{ ruleId: u.ruleId, occurrenceDate: u.date, op: "post" }}
                          title="Registrar como realizado"
                          className="border border-border-strong bg-surface text-ink"
                        >
                          <Check aria-hidden className="size-3.5" /> {u.date > d.today ? "Registrar hoy" : u.kind === "expense" ? "Ya lo pagué" : "Realizado"}
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
        <AutoSubmitForm action={basePath} className="space-y-3 border-b border-border p-4" role="search" aria-label="Filtrar movimientos">
          {one(params.tipo) && fixedKind === undefined && <input type="hidden" name="tipo" value={one(params.tipo)} />}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Buscar</span>
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input type="search" name="q" defaultValue={one(params.q)} placeholder="Buscar: mercado, arriendo, salario…" className={cn(field, "pl-9")} />
            </label>
            {!fixedKind && (
              <nav aria-label="Tipo de movimiento" className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:rounded-md lg:bg-surface-2 lg:p-1">
                {KIND_TABS.map((k) => {
                  const active = (one(params.tipo) ?? "") === k.key;
                  return (
                    <Link
                      key={k.key}
                      href={qs({ tipo: k.key || undefined, pagina: undefined })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium lg:h-9 lg:rounded-md lg:border-0 lg:px-3",
                        active ? "border-brand bg-brand text-brand-ink lg:bg-surface lg:text-ink lg:shadow-sm" : "border-border-strong text-ink-2 hover:text-ink",
                      )}
                    >
                      {k.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <select name="estado" defaultValue={one(params.estado) ?? ""} aria-label="Estado" className={field}>
              <option value="">Todos los estados</option>
              <option value="posted">Realizados</option>
              <option value="planned">Previstos</option>
              <option value="cancelled">Anulados</option>
            </select>
            <select name="cuenta" defaultValue={one(params.cuenta) ?? ""} aria-label="Cuenta" className={field}>
              <option value="">Todas las cuentas</option>
              {d.accountRows.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select name="categoria" defaultValue={one(params.categoria) ?? ""} aria-label="Categoría" className={field}>
              <option value="">Todas las categorías</option>
              {categoryOptions
                .filter((c) => !c.parentId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="relative">
                <span className="sr-only">Desde</span>
                <input type="date" name="desde" defaultValue={one(params.desde)} aria-label="Desde" className={cn(field, "px-2")} />
              </label>
              <label className="relative">
                <span className="sr-only">Hasta</span>
                <input type="date" name="hasta" defaultValue={one(params.hasta)} aria-label="Hasta" className={cn(field, "px-2")} />
              </label>
            </div>
            <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-1">
              {hasFilters ? (
                <Link href={fixedKind || !one(params.tipo) ? basePath : `${basePath}?tipo=${one(params.tipo)}`} className="inline-flex min-h-9 items-center text-sm font-semibold text-ink hover:underline">
                  Limpiar filtros
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs whitespace-nowrap text-muted">{view.total} en total</span>
            </div>
          </div>
        </AutoSubmitForm>
        {view.rows.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title={hasFilters ? "No hay movimientos con estos filtros" : "Aún no hay movimientos"}
            action={
              <ButtonLink href={`/universidad/finanzas/movimientos/nuevo${fixedKind ? `?tipo=${fixedKind}` : ""}`}>
                Registrar {fixedKind === "income" ? "ingreso" : fixedKind === "expense" ? "gasto" : "movimiento"}
              </ButtonLink>
            }
          >
            Registra lo que ya pasó y lo que esperas. Lo previsto no afecta tu saldo hasta que se realiza.
          </EmptyState>
        ) : (
          <>
            {/* Escritorio y tableta: tabla */}
            <div className="hidden md:block">
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
                  {view.rows.map((t) => {
                    const Icon = KIND_ICON[t.kind];
                    const cancelled = t.status === "cancelled";
                    return (
                      <tr key={t.id}>
                        <td className={`${td} whitespace-nowrap text-ink-2 tabular`}>{f.date(t.postedOn ?? t.date)}</td>
                        <td className={td}>
                          <div className="flex items-center gap-3">
                            <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-2">
                              <Icon className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className={cn("font-semibold", cancelled && "text-muted line-through")}>
                                {t.kind === "transfer" && <span className="sr-only">Transferencia: </span>}
                                {t.description}
                              </p>
                              <p className="text-xs text-muted">{sub(t)}</p>
                            </div>
                          </div>
                        </td>
                        <td className={td}>
                          <StatusBadge status={t.status} reconciled={t.reconciled} />
                        </td>
                        <td className={cn(tdNum, amountClass(t.kind, cancelled))}>
                          {sign(t.kind)}
                          {f.money(t.amount, t.currency)}
                        </td>
                        <td className={`${td} text-right`}>
                          <RowActions t={t} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            {/* Móvil: lista agrupada por día */}
            <div className="md:hidden">
              {groups.map((g) => (
                <section key={g.day} aria-label={dayLabel(g.day)}>
                  <div className="flex items-center justify-between bg-surface-2 px-4 py-2 text-sm">
                    <h3 className="font-semibold text-ink-2">{dayLabel(g.day)}</h3>
                    <span className="tabular text-ink-2">{g.net === 0 ? "" : `${g.net > 0 ? "+" : ""}${f.money(g.net)}`}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {g.rows.map((t) => {
                      const Icon = KIND_ICON[t.kind];
                      const cancelled = t.status === "cancelled";
                      return (
                        <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                          <span aria-hidden className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-2">
                            <Icon className="size-4" />
                          </span>
                          {t.debtId ? (
                            <div className="min-w-0 flex-1">
                              <p className={cn("truncate font-semibold text-ink", cancelled && "text-muted line-through")}>{t.description}</p>
                              <p className="truncate text-xs text-muted">{sub(t)}</p>
                            </div>
                          ) : (
                            <Link href={`/universidad/finanzas/movimientos/${t.id}`} className="min-w-0 flex-1">
                              <p className={cn("truncate font-semibold text-ink", cancelled && "text-muted line-through")}>{t.description}</p>
                              <p className="truncate text-xs text-muted">{sub(t)}</p>
                            </Link>
                          )}
                          <div className="flex flex-col items-end gap-1">
                            <span className={amountClass(t.kind, cancelled)}>
                              {sign(t.kind)}
                              {f.money(t.amount, t.currency)}
                            </span>
                            <StatusBadge status={t.status} reconciled={t.reconciled} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted">
              <span>
                Mostrando {from}–{to} de {view.total} · más recientes primero
              </span>
              <div className="flex gap-2">
                {view.page > 1 ? (
                  <Link className={buttonClass("secondary", "sm")} href={qs({ pagina: String(view.page - 1) })}>
                    Anterior
                  </Link>
                ) : (
                  <span aria-disabled className={buttonClass("secondary", "sm", "pointer-events-none text-muted")}>
                    Anterior
                  </span>
                )}
                {view.page < pages ? (
                  <Link className={buttonClass("secondary", "sm")} href={qs({ pagina: String(view.page + 1) })}>
                    Siguiente
                  </Link>
                ) : (
                  <span aria-disabled className={buttonClass("secondary", "sm", "pointer-events-none text-muted")}>
                    Siguiente
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

function RowActions({ t }: { t: Awaited<ReturnType<typeof loadTransactionsView>>["rows"][number] }) {
  return (
    <div className="flex justify-end gap-0.5">
      {t.status === "planned" && (
        <InlineAction action={setStatusAction} fields={{ id: t.id, status: "posted" }} title="Marcar como realizado">
          <Check aria-hidden className="size-4" />
          <span className="sr-only">Marcar como realizado</span>
        </InlineAction>
      )}
      {t.status === "posted" && (
        <InlineAction action={reconcileAction} fields={{ id: t.id, reconciled: t.reconciled ? "" : "on" }} title={t.reconciled ? "Quitar conciliación" : "Marcar conciliado con el extracto"}>
          <CheckCheck aria-hidden className={cn("size-4", t.reconciled ? "text-ink" : "text-muted")} />
          <span className="sr-only">{t.reconciled ? "Quitar conciliación" : "Conciliar"}</span>
        </InlineAction>
      )}
      {!t.debtId && (
        <Link href={`/universidad/finanzas/movimientos/${t.id}`} className="inline-flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink" title="Editar">
          <Pencil aria-hidden className="size-4" />
          <span className="sr-only">Editar {t.description}</span>
        </Link>
      )}
      <ConfirmAction
        action={deleteTransactionAction}
        fields={{ id: t.id }}
        label={<span className="sr-only">Eliminar {t.description}</span>}
        icon={<Trash2 aria-hidden className="size-4 text-neg" />}
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
  );
}
