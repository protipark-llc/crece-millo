"use client";

import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { createCategoryAction, updateCategoryAction } from "@/app/(app)/universidad/finanzas/actions";

export function CategoryForm({ parents, category }: { parents: { id: string; name: string; kind: string }[]; category?: { id: string; name: string; kind: string; nature: string; behavior: string } }) {
  return (
    <ActionForm action={category ? updateCategoryAction : createCategoryAction} resetOnSuccess={!category} className="grid gap-3 sm:grid-cols-5 sm:items-end">
      {category && <input type="hidden" name="id" value={category.id} />}
      <TextField label="Nombre" name="name" defaultValue={category?.name} required />
      {category ? (
        <input type="hidden" name="kind" value={category.kind} />
      ) : (
        <SelectField label="Tipo" name="kind" defaultValue="expense">
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </SelectField>
      )}
      {!category && (
        <SelectField label="Dentro de" name="parentId" defaultValue="" optional>
          <option value="">— Categoría principal —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.kind === "income" ? "ingreso" : "gasto"})
            </option>
          ))}
        </SelectField>
      )}
      <SelectField label="Naturaleza" name="nature" defaultValue={category?.nature ?? ""}>
        <option value="">Sin definir</option>
        <option value="essential">Esencial</option>
        <option value="discretionary">Discrecional</option>
      </SelectField>
      <SelectField label="Comportamiento" name="behavior" defaultValue={category?.behavior ?? ""}>
        <option value="">Sin definir</option>
        <option value="fixed">Fijo</option>
        <option value="variable">Variable</option>
      </SelectField>
      <SubmitButton size="sm" variant={category ? "secondary" : "primary"}>
        {category ? "Guardar" : "Crear"}
      </SubmitButton>
    </ActionForm>
  );
}
