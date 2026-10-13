import type { FinanceData } from "@/server/services/finance-data";
import type { FormAccount, FormCategory, TxDefaults } from "./forms/transaction-form";

export function txFormData(d: FinanceData): { accounts: FormAccount[]; categories: FormCategory[] } {
  return {
    accounts: d.accountRows.filter((a) => !a.archivedAt).map((a) => ({ id: a.id, name: a.name, currency: a.currency })),
    categories: d.categoryRows
      .filter((c) => !c.archived && (c.systemKey !== "business" || d.settings.businessExpensesEnabled))
      .map((c) => ({ id: c.id, name: c.name, kind: c.kind, parentId: c.parentId })),
  };
}

export const emptyTx = (kind: TxDefaults["kind"], today: string): TxDefaults => ({
  kind,
  status: "posted",
  amount: "",
  accountId: "",
  toAccountId: "",
  toAmount: "",
  date: today,
  postedOn: "",
  categoryId: "",
  nature: "",
  incomeSource: "",
  description: "",
  counterparty: "",
  notes: "",
});
