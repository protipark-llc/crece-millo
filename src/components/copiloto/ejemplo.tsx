"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, LogOut } from "lucide-react";
import { setEjemploAction } from "@/app/(app)/comunidad/emprendedores/copiloto/ejemplo-actions";
import { useCopiloto } from "./store";

/** Entrar o salir del modo ejemplo (la demostración del paquete; nada se guarda). */
export function EjemploToggle() {
  const { demo } = useCopiloto();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={demo}
      onClick={() =>
        start(async () => {
          await setEjemploAction(!demo);
          router.refresh();
        })
      }
      className="inline-flex h-11 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-50"
    >
      {demo ? (
        <LogOut aria-hidden className="size-4" />
      ) : (
        <Eye aria-hidden className="size-4" />
      )}
      {pending ? "Cambiando…" : demo ? "Salir del ejemplo" : "Ver ejemplo"}
    </button>
  );
}

/** Aviso fijo mientras se ve el ejemplo. */
export function EjemploBanner() {
  const { demo } = useCopiloto();
  if (!demo) return null;
  return (
    <div
      role="status"
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-info bg-info-soft px-4 py-2.5 text-sm text-ink"
    >
      <Eye aria-hidden className="size-4 shrink-0 text-info" />
      <span className="min-w-0 flex-1">
        <strong>Modo ejemplo.</strong> Estás viendo la demostración con datos
        ficticios. Puedes cambiar todo, pero nada se guarda en tu cuenta.
      </span>
      <EjemploToggle />
    </div>
  );
}
