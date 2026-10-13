"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Barra de progreso superior: aparece en cuanto se toca un enlace interno y desaparece al
 * llegar la nueva página. Da respuesta inmediata sin precargar páginas (cada precarga
 * consultaría la base de datos).
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // mismo lugar o solo #ancla
      clearTimeout(timer.current);
      setState("loading");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    timer.current = setTimeout(() => setState("idle"), 300);
    return () => clearTimeout(timer.current);
  }, [pathname, search]);

  if (state === "idle") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className={
          state === "loading"
            ? "h-full w-[85%] origin-left bg-accent motion-safe:animate-[nav-progress_8s_cubic-bezier(.1,.7,.2,1)_forwards]"
            : "h-full w-full bg-accent opacity-0 transition-opacity duration-300"
        }
      />
    </div>
  );
}
