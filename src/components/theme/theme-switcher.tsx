"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../ui/cn";
import { THEME_STORAGE_KEY } from "./theme-script";

type Pref = "light" | "dark" | "system";

const OPTIONS: { value: Pref; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function apply(pref: Pref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme-pref", pref);
}

function readPref(): Pref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/**
 * Selector Claro · Oscuro · Sistema (control segmentado). `withLabels` muestra el texto junto al
 * ícono (Configuración); sin él, solo íconos con nombre accesible (barra superior).
 */
function useThemePref() {
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    setPref(readPref());
  }, []);

  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  function choose(next: Pref) {
    setPref(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* sin almacenamiento: el cambio dura hasta recargar */
    }
    apply(next);
  }

  return { pref, choose };
}

export function ThemeSwitcher({ withLabels = false, className }: { withLabels?: boolean; className?: string }) {
  const { pref, choose } = useThemePref();
  return (
    <div role="radiogroup" aria-label="Tema" className={cn("inline-flex rounded-sm bg-surface-2 p-1", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={withLabels ? undefined : label}
            title={withLabels ? undefined : label}
            onClick={() => choose(value)}
            className={cn(
              "inline-flex min-h-9 min-w-10 items-center justify-center gap-1.5 rounded-sm px-2.5 text-sm font-medium text-ink-2 transition-colors duration-[var(--duration-fast)]",
              selected ? "bg-surface text-ink shadow-sm" : "hover:text-ink",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {withLabels && label}
          </button>
        );
      })}
    </div>
  );
}

/** Botón compacto para la barra superior móvil: alterna Claro → Oscuro → Sistema. */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { pref, choose } = useThemePref();
  const i = OPTIONS.findIndex((o) => o.value === pref);
  const current = OPTIONS[i] ?? OPTIONS[2]!;
  const next = OPTIONS[(i + 1) % OPTIONS.length]!;
  const Icon = current.icon;
  return (
    <button
      type="button"
      onClick={() => choose(next.value)}
      aria-label={`Tema: ${current.label}. Cambiar a ${next.label}`}
      title={`Tema: ${current.label}`}
      className={cn("inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-surface-2", className)}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
