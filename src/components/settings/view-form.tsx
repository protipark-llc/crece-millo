"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { REQUIRED_SECTIONS, SECTIONS, VIEW_LABELS, VIEW_PRESETS, enabledSections, type ViewMode } from "@/lib/sections";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { cn } from "@/components/ui/cn";
import { setViewAction } from "@/app/(app)/configuracion/actions";

const GROUPS = ["Universidad", "Finanzas personales", "Comunidad", "Cuenta"] as const;

/**
 * Vista de la cuenta: Esencial, Pro o Personalizada. Marcar o desmarcar una sección pasa a
 * «Personalizada» partiendo de lo que se ve hoy. Ocultar no borra datos.
 */
export function ViewForm({ mode: initialMode, sections: initialSections }: { mode: ViewMode; sections: string[] | null }) {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [picked, setPicked] = useState<string[]>(enabledSections({ viewMode: initialMode, sections: initialSections }));
  const choose = (m: ViewMode) => {
    setMode(m);
    if (m !== "personalizada") setPicked([...VIEW_PRESETS[m]]);
  };
  const toggle = (key: string) => {
    if (REQUIRED_SECTIONS.includes(key)) return;
    setMode("personalizada");
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  };
  return (
    <ActionForm action={setViewAction} className="space-y-5">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="sections" value={picked.join(",")} />
      <div role="radiogroup" aria-label="Vista" className="grid gap-3 md:grid-cols-3">
        {(["esencial", "pro", "personalizada"] as ViewMode[]).map((m) => {
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(m)}
              className={cn("flex flex-col items-start rounded-lg p-4 text-left transition-colors", on ? "border-2 border-brand bg-surface-2" : "border border-border hover:bg-surface-2")}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-semibold text-ink">{VIEW_LABELS[m].name}</span>
                {on && (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand text-brand-ink">
                    <Check aria-hidden className="size-3.5" />
                  </span>
                )}
              </span>
              <span className="mt-1 text-sm text-ink-2">{VIEW_LABELS[m].text}</span>
            </button>
          );
        })}
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Secciones visibles</legend>
        <p className="mt-0.5 text-xs text-muted">Marca o desmarca para armar tu vista. Ocultar una sección no borra sus datos.</p>
        <div className="mt-3 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {GROUPS.map((g) => (
            <div key={g}>
              <p className="t-overline text-muted">{g}</p>
              <ul className="mt-2 space-y-1">
                {SECTIONS.filter((s) => s.group === g).map((s) => {
                  const required = REQUIRED_SECTIONS.includes(s.key);
                  return (
                    <li key={s.key}>
                      <label className={cn("flex min-h-10 cursor-pointer items-start gap-2.5 rounded-md px-1 py-1.5 text-sm", required && "cursor-not-allowed")}>
                        <input
                          type="checkbox"
                          checked={picked.includes(s.key)}
                          disabled={required}
                          onChange={() => toggle(s.key)}
                          className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                        />
                        <span>
                          <span className="text-ink">{s.label}</span>
                          {required && <span className="block text-xs text-muted">Siempre visible</span>}
                          {s.help && !required && <span className="block text-xs text-muted">{s.help}</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </fieldset>
      <SubmitButton>Guardar vista</SubmitButton>
    </ActionForm>
  );
}
