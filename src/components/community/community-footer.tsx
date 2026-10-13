"use client";

import { usePathname } from "next/navigation";

/** Pie de Comunidad. El Co-Piloto tiene su propio aviso (más completo), así que ahí no se repite. */
export function CommunityFooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/comunidad/emprendedores/copiloto") ? null : <>{children}</>;
}
