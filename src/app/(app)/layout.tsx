import { LogOut } from "lucide-react";
import { requireUser } from "@/server/session";
import { Sidebar } from "@/components/shell/sidebar";
import { logoutAction } from "../auth-actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const footer = (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut aria-hidden className="size-4" />
        </button>
      </form>
    </div>
  );
  return (
    <div className="lg:flex">
      <Sidebar footer={footer} />
      <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
