import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { Logo } from "@/components/brand/logo";
import { ThemeCycleButton } from "@/components/theme/theme-switcher";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/universidad");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between bg-nav-bg p-10 lg:flex">
        <Link href="/" className="inline-flex w-fit rounded-md" aria-label="Crece Millo · Inicio">
          <Logo tone="oscuro" height={28} decorative />
        </Link>
        <div>
          <p className="t-overline text-nav-accent">Cruza la puerta</p>
          <p className="mt-3 max-w-md font-title text-[34px] leading-[40px] font-medium text-nav-ink-active">Sabe dónde estás. Decide qué sigue.</p>
          <p className="mt-4 max-w-md text-nav-ink">Un centro de control para tu dinero y una ruta de 7 niveles donde cada lección termina en una acción con tus datos.</p>
        </div>
        <p className="text-xs text-nav-label">Herramienta educativa; no es asesoría financiera.</p>
      </aside>
      <main id="contenido" className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="inline-flex rounded-md lg:hidden" aria-label="Crece Millo · Inicio">
            <Logo height={22} decorative />
          </Link>
          <ThemeCycleButton />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
