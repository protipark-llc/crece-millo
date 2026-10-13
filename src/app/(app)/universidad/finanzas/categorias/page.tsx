import type { Metadata } from "next";
import { financePage } from "@/server/page-data";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { InlineAction } from "@/components/ui/form";
import { CategoryForm } from "@/components/finance/forms/category-form";
import { archiveCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Categorías" };

const NATURE = { essential: "Esencial", discretionary: "Discrecional" } as const;
const BEHAVIOR = { fixed: "Fijo", variable: "Variable" } as const;

export default async function CategoriesPage() {
  const { d } = await financePage(({ d }) => ({ d }));
  const roots = d.categoryRows.filter((c) => !c.parentId);
  const section = (kind: "expense" | "income") => (
    <Card>
      <CardHeader title={kind === "expense" ? "Categorías de gasto" : "Categorías de ingreso"} />
      <ul className="divide-y divide-border">
        {roots
          .filter((r) => r.kind === kind)
          .map((r) => (
            <li key={r.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-medium ${r.archived ? "text-muted line-through" : "text-ink"}`}>{r.name}</span>
                {r.nature && <Badge>{NATURE[r.nature]}</Badge>}
                {r.behavior && <Badge>{BEHAVIOR[r.behavior]}</Badge>}
                <span className="ml-auto">
                  <InlineAction action={archiveCategoryAction} fields={{ id: r.id, archived: r.archived ? "" : "on" }}>
                    {r.archived ? "Reactivar" : "Archivar"}
                  </InlineAction>
                </span>
              </div>
              {d.categoryRows.some((c) => c.parentId === r.id) && (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {d.categoryRows
                    .filter((c) => c.parentId === r.id)
                    .map((c) => (
                      <li key={c.id} className={`rounded-full border border-border px-2.5 py-0.5 text-xs ${c.archived ? "text-muted line-through" : "text-ink-2"}`}>
                        {c.name}
                      </li>
                    ))}
                </ul>
              )}
            </li>
          ))}
      </ul>
    </Card>
  );
  return (
    <>
      <PageHeader title="Categorías" description="Organiza tus movimientos. Archivar una categoría la oculta de los formularios sin perder la historia. Solo se admiten dos niveles." />
      <Card className="mb-6">
        <CardHeader title="Nueva categoría" />
        <div className="p-5">
          <CategoryForm parents={roots.filter((r) => !r.archived).map((r) => ({ id: r.id, name: r.name, kind: r.kind }))} />
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {section("expense")}
        {section("income")}
      </div>
    </>
  );
}
