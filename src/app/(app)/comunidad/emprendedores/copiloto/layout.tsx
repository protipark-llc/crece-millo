import type { Metadata } from "next";
import { cookies } from "next/headers";
import { EJEMPLO_COOKIE, ejemploState } from "@/lib/copiloto/ejemplo";
import { loadForUser } from "@/server/action-utils";
import { loadState } from "@/server/services/copiloto";
import { CopilotoProvider } from "@/components/copiloto/store";
import { CopilotoHeader } from "@/components/copiloto/header";
import { EjemploBanner } from "@/components/copiloto/ejemplo";
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
  const demo = (await cookies()).get(EJEMPLO_COOKIE)?.value === "1";
  const S = await loadForUser(async ({ tx, userId, today }) =>
    demo ? ejemploState(today) : loadState(tx, userId, today),
  );
  return (
    <CopilotoProvider key={demo ? "ejemplo" : "cuenta"} initial={S} demo={demo}>
      <CopilotoHeader />
      <EjemploBanner />
      <CoachBar />
      <div className="mt-6">{children}</div>
      <CopilotoFooter />
    </CopilotoProvider>
  );
}
