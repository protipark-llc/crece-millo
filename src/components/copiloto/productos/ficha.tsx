"use client";

import { Copy, Trash2 } from "lucide-react";
import { FICHA, NUMK, duplicate, num } from "@/lib/copiloto/productos";
import { activeProduct } from "@/lib/copiloto/logic";
import { todayLocal } from "@/lib/copiloto/today";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import { useCopiloto } from "../store";
import { ConfirmButton, LabeledField, fieldClass } from "../ui";

/**
 * Ficha (FICHA, L690): se guarda al escribir. Cambiar el costo marca costoReal = true.
 * Los campos no se reescriben mientras se escriben (key por producto: cambian al cambiar de producto).
 */
export function Ficha() {
  const { S, updateProduct, addProduct, removeProduct, setSettings } =
    useCopiloto();
  const p = activeProduct(S);
  const set = (k: string, raw: string) => {
    const patch: Record<string, unknown> = {
      [k]: NUMK.has(k) ? num(raw) : raw,
    };
    if (k === "costo") patch.costoReal = true;
    updateProduct(p.id, patch);
  };
  return (
    <div key={p.id} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {FICHA.map(([group, fields]) => (
          <fieldset key={group} className="min-w-0 space-y-3">
            <legend className="mb-1 text-base font-semibold text-ink">
              {group}
            </legend>
            {fields.map((f) => (
              <LabeledField key={f.k} label={f.label}>
                {(id) =>
                  f.type === "select" ? (
                    <select
                      id={id}
                      defaultValue={String(p[f.k] ?? "")}
                      onChange={(e) => set(f.k, e.target.value)}
                      className={fieldClass}
                    >
                      {f.options!.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      id={id}
                      rows={2}
                      defaultValue={String(p[f.k] ?? "")}
                      onChange={(e) => set(f.k, e.target.value)}
                      className={cn(fieldClass, "h-auto py-2")}
                    />
                  ) : (
                    <input
                      id={id}
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "date"
                            ? "date"
                            : f.type === "url"
                              ? "url"
                              : "text"
                      }
                      inputMode={f.type === "number" ? "decimal" : undefined}
                      placeholder={f.type === "url" ? "https://" : undefined}
                      defaultValue={String(p[f.k] ?? "")}
                      onChange={(e) => set(f.k, e.target.value)}
                      className={cn(
                        fieldClass,
                        f.type === "number" && "text-right tabular",
                      )}
                    />
                  )
                }
              </LabeledField>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          className={buttonClass("secondary", "md")}
          onClick={() => {
            const c = duplicate(p, todayLocal());
            addProduct(c);
            setSettings({ active: c.id });
          }}
        >
          <Copy aria-hidden className="size-4" /> Duplicar producto
        </button>
        <ConfirmButton
          className={buttonClass("ghost", "md", "text-neg disabled:opacity-50")}
          disabled={S.products.length <= 1}
          title={`¿Eliminar ${p.nombre}?`}
          description="Sus resultados quedan en la bitácora."
          confirmLabel="Eliminar producto"
          onConfirm={() => removeProduct(p.id)}
        >
          <Trash2 aria-hidden className="size-4" /> Eliminar producto
        </ConfirmButton>
        <p className="text-xs text-muted">
          Los cambios se guardan solos.
          {S.products.length <= 1
            ? " No puedes eliminar tu único producto."
            : ""}
        </p>
      </div>
    </div>
  );
}
