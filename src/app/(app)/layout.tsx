import { LogOut } from "lucide-react";
import { requireUser } from "@/server/session";
import { Sidebar } from "@/components/shell/sidebar";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { currentSections } from "@/server/sections";
import { logoutAction } from "../auth-actions";

export const dynamic = "force-dynamic";

function Account({ name, email, tone }: { name: string; email: string; tone: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="min-w-0">
        <p className={dark ? "truncate text-sm font-medium text-nav-ink-active" : "truncate text-sm font-medium text-ink"}>{name}</p>
        <p className={dark ? "truncate text-xs text-nav-label" : "truncate text-xs text-muted"}>{email}</p>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className={
            dark
              ? "inline-flex size-10 items-center justify-center rounded-md text-nav-ink hover:bg-white/10 hover:text-nav-ink-active"
              : "inline-flex size-11 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink"
          }
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut aria-hidden className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { enabled } = await currentSections();
  return (
    <div className="lg:flex">
      <Sidebar
        userName={user.name}
        enabled={enabled}
        footer={<Account name={user.name} email={user.email} tone="dark" />}
        mobileFooter={<Account name={user.name} email={user.email} tone="light" />}
      />
      <main id="contenido" className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
        <div className="mx-auto max-w-[var(--content-max)]">
          <div className="mb-2 hidden justify-end lg:flex">
            <ThemeSwitcher />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
