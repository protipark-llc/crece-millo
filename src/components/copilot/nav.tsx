import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "../ui/cn";

/** Ruta de navegación «Comunidad › Emprendedores › …» */
export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={it.label} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight aria-hidden className="size-3.5" />}
            {it.href ? (
              <Link href={it.href} className="hover:text-ink">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-2">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const TABS = [
  { key: "muro", label: "Muro", href: "/comunidad/emprendedores" },
  { key: "copiloto", label: "Co-Piloto", href: "/comunidad/emprendedores/copiloto" },
  { key: "ruta", label: "Ruta", href: "/comunidad/emprendedores/copiloto/ruta" },
];

/** Pestañas de la sección Emprendedores (indicador en accent, como en el diseño de Comunidad). */
export function EntrepreneurTabs({ current }: { current: "muro" | "ruta" | "copiloto" }) {
  return (
    <nav aria-label="Secciones de Emprendedores" className="mt-4 mb-5 flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={cn("-mb-px inline-flex h-11 shrink-0 items-center border-b-[3px] px-3 text-sm font-medium", t.key === current ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
