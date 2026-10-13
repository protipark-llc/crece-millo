import Link from "next/link";
import { redirect } from "next/navigation";
import { Sprout } from "lucide-react";
import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/universidad");
  return (
    <main id="contenido" className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold text-ink">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand text-brand-ink">
            <Sprout aria-hidden className="size-5" />
          </span>
          Crece
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">{children}</div>
      </div>
    </main>
  );
}
