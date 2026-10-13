import { and, asc, eq, isNull } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import type { EngineCategory } from "@/lib/finance/types";
import { NotFoundError, UserFacingError } from "./errors";

type Nat = "essential" | "discretionary" | null;
type Beh = "fixed" | "variable" | null;
interface Seed {
  name: string;
  nature: Nat;
  behavior: Beh;
  key?: string;
  children?: [string, Nat?, Beh?][];
}

/**
 * Categorías iniciales. Inspiradas en la tabla de flujo de caja del libro de referencia
 * y en presupuestos reales de hogares colombianos; la persona puede renombrarlas,
 * archivarlas o crear las suyas.
 */
export const DEFAULT_EXPENSE_CATEGORIES: Seed[] = [
  {
    name: "Vivienda",
    nature: "essential",
    behavior: "fixed",
    key: "housing",
    children: [["Arriendo o hipoteca"], ["Administración"], ["Impuesto predial"], ["Mantenimiento y reparaciones", "essential", "variable"], ["Aseo y ayuda doméstica"], ["Seguridad y vigilancia"]],
  },
  {
    name: "Servicios públicos",
    nature: "essential",
    behavior: "fixed",
    children: [["Energía"], ["Agua y alcantarillado"], ["Gas"], ["Internet y TV"], ["Celular y telefonía"]],
  },
  {
    name: "Alimentación",
    nature: "essential",
    behavior: "variable",
    children: [["Mercado"], ["Restaurantes y domicilios", "discretionary"], ["Café y meriendas", "discretionary"]],
  },
  {
    name: "Transporte",
    nature: "essential",
    behavior: "variable",
    children: [["Transporte público"], ["Combustible"], ["Peajes y parqueaderos"], ["Mantenimiento del vehículo"], ["Impuestos y seguros del vehículo", "essential", "fixed"], ["Taxis y aplicaciones", "discretionary"]],
  },
  {
    name: "Salud",
    nature: "essential",
    behavior: "variable",
    children: [["Medicina prepagada o seguro médico", "essential", "fixed"], ["Medicamentos"], ["Odontología"], ["Gastos no cubiertos por el seguro"]],
  },
  {
    name: "Educación",
    nature: "essential",
    behavior: "fixed",
    children: [["Matrículas y pensiones"], ["Útiles y uniformes", "essential", "variable"], ["Cursos y formación de adultos"], ["Transporte escolar"]],
  },
  {
    name: "Hijos y familia",
    nature: "essential",
    behavior: "variable",
    children: [["Actividades extracurriculares", "discretionary"], ["Mesada"], ["Ayuda a parientes"], ["Cuota alimentaria", "essential", "fixed"]],
  },
  {
    name: "Mascotas",
    nature: "essential",
    behavior: "variable",
    children: [["Alimento de mascotas"], ["Veterinario y cuidados"], ["Seguro de mascotas", "essential", "fixed"]],
  },
  {
    name: "Cuidado personal y vestuario",
    nature: "discretionary",
    behavior: "variable",
    children: [["Ropa y calzado"], ["Peluquería y belleza"], ["Gimnasio y deporte", "discretionary", "fixed"], ["Suplementos"]],
  },
  {
    name: "Seguros",
    nature: "essential",
    behavior: "fixed",
    children: [["Seguro de vida"], ["Seguro exequial"], ["Otros seguros"]],
  },
  {
    name: "Deudas",
    nature: "essential",
    behavior: "fixed",
    key: "debts",
    children: [["Cuotas de créditos"], ["Pagos de tarjetas de crédito"], ["Deudas familiares o informales"]],
  },
  {
    name: "Suscripciones",
    nature: "discretionary",
    behavior: "fixed",
    key: "subscriptions",
    children: [["Streaming y música"], ["Aplicaciones y software"], ["Nube y almacenamiento"]],
  },
  {
    name: "Ocio y celebraciones",
    nature: "discretionary",
    behavior: "variable",
    children: [["Salidas y fines de semana"], ["Vacaciones y viajes"], ["Regalos y celebraciones"], ["Hobbies y pasatiempos"]],
  },
  { name: "Donaciones", nature: "discretionary", behavior: "variable" },
  {
    name: "Impuestos",
    nature: "essential",
    behavior: "variable",
    children: [["Impuesto de renta"], ["Seguridad social (independientes)", "essential", "fixed"], ["Otros impuestos"]],
  },
  { name: "Gastos de negocio", nature: "essential", behavior: "variable", key: "business" },
  { name: "Imprevistos y misceláneos", nature: "discretionary", behavior: "variable" },
];

export const DEFAULT_INCOME_CATEGORIES: { name: string; key?: string }[] = [
  { name: "Salario", key: "salary" },
  { name: "Honorarios" },
  { name: "Ventas" },
  { name: "Ingresos del negocio" },
  { name: "Rendimientos de inversiones" },
  { name: "Arriendos recibidos" },
  { name: "Pensión" },
  { name: "Aportes de terceros (gastos compartidos)", key: "shared" },
  { name: "Reembolsos y devoluciones" },
  { name: "Otros ingresos" },
];

export async function seedDefaultCategories(tx: Tx, userId: string): Promise<void> {
  let order = 0;
  for (const group of DEFAULT_EXPENSE_CATEGORIES) {
    const [parent] = await tx
      .insert(categories)
      .values({ userId, name: group.name, kind: "expense", nature: group.nature, behavior: group.behavior, systemKey: group.key ?? null, sortOrder: order++ })
      .returning({ id: categories.id });
    for (const [childName, nat, beh] of group.children ?? []) {
      await tx.insert(categories).values({
        userId,
        name: childName,
        kind: "expense",
        parentId: parent!.id,
        nature: nat === undefined ? group.nature : nat,
        behavior: beh === undefined ? group.behavior : beh,
        sortOrder: order++,
      });
    }
  }
  for (const c of DEFAULT_INCOME_CATEGORIES) {
    await tx.insert(categories).values({ userId, name: c.name, kind: "income", systemKey: c.key ?? null, sortOrder: order++ });
  }
}

export interface CategoryRow {
  id: string;
  name: string;
  kind: "income" | "expense";
  parentId: string | null;
  nature: Nat;
  behavior: Beh;
  systemKey: string | null;
  archived: boolean;
  sortOrder: number;
}

export async function listCategories(tx: Tx, userId: string, opts: { includeArchived?: boolean } = {}): Promise<CategoryRow[]> {
  const rows = await tx
    .select()
    .from(categories)
    .where(opts.includeArchived ? eq(categories.userId, userId) : and(eq(categories.userId, userId), isNull(categories.archivedAt)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    parentId: r.parentId,
    nature: r.nature,
    behavior: r.behavior,
    systemKey: r.systemKey,
    archived: r.archivedAt !== null,
    sortOrder: r.sortOrder,
  }));
}

export function toEngineCategories(rows: CategoryRow[]): EngineCategory[] {
  return rows.map((r) => ({ id: r.id, name: r.name, kind: r.kind, parentId: r.parentId, nature: r.nature, behavior: r.behavior, systemKey: r.systemKey }));
}

/** Nombre "Grupo › Subcategoría" para listas y selectores. */
export function categoryLabel(rows: CategoryRow[], id: string | null): string {
  if (!id) return "Sin categoría";
  const c = rows.find((r) => r.id === id);
  if (!c) return "Categoría archivada";
  const parent = c.parentId ? rows.find((r) => r.id === c.parentId) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

export async function createCategory(
  tx: Tx,
  userId: string,
  input: { name: string; kind: "income" | "expense"; parentId: string | null; nature: Nat; behavior: Beh },
) {
  if (input.parentId) {
    const [parent] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.id, input.parentId), eq(categories.userId, userId)));
    if (!parent) throw new NotFoundError("La categoría principal");
    if (parent.kind !== input.kind) throw new UserFacingError("La subcategoría debe ser del mismo tipo que su categoría principal.");
    if (parent.parentId) throw new UserFacingError("Solo se admiten dos niveles: categoría y subcategoría.");
  }
  const [row] = await tx
    .insert(categories)
    .values({ userId, ...input, sortOrder: 1000 })
    .returning();
  return row!;
}

export async function setCategoryArchived(tx: Tx, userId: string, id: string, archived: boolean) {
  const res = await tx
    .update(categories)
    .set({ archivedAt: archived ? new Date() : null })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning({ id: categories.id });
  if (res.length === 0) throw new NotFoundError("La categoría");
}

export async function renameCategory(tx: Tx, userId: string, id: string, newName: string, nature: Nat, behavior: Beh) {
  const res = await tx
    .update(categories)
    .set({ name: newName, nature, behavior })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning({ id: categories.id });
  if (res.length === 0) throw new NotFoundError("La categoría");
}
