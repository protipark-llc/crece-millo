import type { Metadata } from "next";
import { loadForUser } from "@/server/action-utils";
import { loadState } from "@/server/services/copiloto";
import { CopilotoProvider } from "@/components/copiloto/store";
import { CopilotoHeader } from "@/components/copiloto/header";
import { CoachBar, CopilotoFooter } from "@/components/copiloto/coach";

export const metadata: Metadata = { title: "Co-Piloto de Negocio" };

/**
 * El estado del Co-Piloto se carga una vez aquí (una consulta) y vive en el navegador:
 * cambiar de pestaña no vuelve a la base, y cada cambio se guarda en segundo plano.
 */
export default async function CopilotoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const S = await loadForUser(({ tx, userId, today }) =>
    loadState(tx, userId, today),
  );
  return (
    <CopilotoProvider initial={S}>
      <CopilotoHeader />
      <CoachBar />
      <div className="mt-6">{children}</div>
      <CopilotoFooter />
    </CopilotoProvider>
  );
}
