import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/db/client";
import { getCurrentUser } from "@/server/session";
import { loadFinanceData } from "@/server/services/finance-data";
import { categoryLabel } from "@/server/services/categories";
import { toInputString } from "@/lib/money/money";
import { isISODate } from "@/lib/finance/dates";

/** Exporta los movimientos de la persona autenticada en CSV (separador ;, compatible con Excel en español). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const from = req.nextUrl.searchParams.get("desde") ?? "0000-01-01";
  const to = req.nextUrl.searchParams.get("hasta") ?? "9999-12-31";
  if ((from !== "0000-01-01" && !isISODate(from)) || (to !== "9999-12-31" && !isISODate(to))) {
    return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
  }
  const d = await withUser(user.id, (tx) => loadFinanceData(tx, user.id));
  const esc = (v: string) => {
    // Evita inyección de fórmulas al abrir el CSV en hojas de cálculo.
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const accountName = (id: string | null) => d.accountRows.find((a) => a.id === id)?.name ?? "";
  const header = ["fecha", "fecha_efectiva", "tipo", "estado", "descripcion", "categoria", "cuenta", "cuenta_destino", "moneda", "importe", "conciliado"];
  const lines = d.txRows
    .filter((t) => (t.postedOn ?? t.date) >= from && (t.postedOn ?? t.date) <= to)
    .sort((a, b) => ((a.postedOn ?? a.date) < (b.postedOn ?? b.date) ? -1 : 1))
    .map((t) =>
      [
        t.date,
        t.postedOn ?? "",
        { income: "ingreso", expense: "gasto", transfer: "transferencia" }[t.kind],
        { planned: "previsto", posted: "realizado", cancelled: "anulado" }[t.status],
        t.description,
        t.kind === "transfer" ? "" : categoryLabel(d.categoryRows, t.categoryId),
        accountName(t.accountId),
        accountName(t.toAccountId),
        t.currency,
        toInputString(t.amount, t.currency),
        t.reconciled ? "si" : "no",
      ]
        .map((v) => esc(String(v)))
        .join(";"),
    );
  const body = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="movimientos_${from}_${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
