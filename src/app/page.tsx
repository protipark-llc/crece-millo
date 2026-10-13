import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, LineChart, PiggyBank, ShieldCheck, Target, Waves } from "lucide-react";
import { getCurrentUser } from "@/server/session";
import { currentSections } from "@/server/sections";
import { buttonClass } from "@/components/ui/primitives";
import { Logo } from "@/components/brand/logo";
import { ThemeCycleButton } from "@/components/theme/theme-switcher";
import { LEARNING_AREAS } from "@/lib/education/catalog";
import { cn } from "@/components/ui/cn";

export const dynamic = "force-dynamic";

export default async function Landing() {
  if (await getCurrentUser()) redirect((await currentSections()).home);
  const features = [
    { icon: Waves, title: "Flujo de caja real y proyectado", text: "Mira cuánto dinero tendrás cada semana y anticipa meses con déficit antes de que lleguen." },
    { icon: PiggyBank, title: "Presupuesto que se compara con la realidad", text: "Planea por categoría, reasigna cuando haga falta y ve tu ejecución sin hojas de cálculo." },
    { icon: Target, title: "Deudas, ahorro y objetivos", text: "Compara avalancha y bola de nieve, calcula tu fondo de emergencia y el aporte para cada meta." },
    { icon: LineChart, title: "Patrimonio y escenarios", text: "Activos menos pasivos, separando lo líquido de lo que no lo es, y simulaciones que no tocan tus datos." },
  ];
  const method = [
    { n: "1", title: "Ubícate", text: "Un diagnóstico de 8 pasos te muestra cuánto entra, cuánto sale y dónde está tu dinero. Tu primer resultado llega en 3 minutos." },
    { n: "2", title: "Planea", text: "Presupuesto, flujo de caja, deudas y objetivos en un solo lugar, con proyecciones que explican sus supuestos." },
    { n: "3", title: "Actúa con tus datos", text: "14 lecciones cortas en 7 niveles. Cada una termina en un reto práctico dentro de tu propio centro de control." },
  ];
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="inline-flex rounded-md" aria-label="Crece Millo · Inicio">
              <Logo height={24} decorative />
            </Link>
            <nav aria-label="Secciones" className="hidden gap-5 text-sm text-ink-2 md:flex">
              <a href="#metodo" className="hover:text-ink">
                El método
              </a>
              <a href="#areas" className="hover:text-ink">
                Áreas
              </a>
            </nav>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <ThemeCycleButton />
            <Link href="/ingresar" className={buttonClass("ghost", "md", "px-3")}>
              Ingresar
            </Link>
            <Link href="/registro" className={buttonClass("primary", "md", "hidden sm:inline-flex")}>
              Crear cuenta gratis
            </Link>
          </nav>
        </div>
      </header>
      <main id="contenido">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="t-overline text-ink">Universidad digital de crecimiento personal</p>
            <h1 className="mt-4 font-title text-[40px] leading-[44px] font-medium tracking-[-0.02em] text-ink sm:text-[56px] sm:leading-[60px]">
              Sabe dónde estás. Decide qué sigue.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-7 text-ink-2">
              Empezamos por tu dinero: un centro de control para ver tu mes con claridad y una ruta de 7 niveles donde cada lección termina en una acción con tus propios datos. Sin juicios y sin promesas de riqueza rápida.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/registro" className={buttonClass("primary", "lg")}>
                Empezar mi diagnóstico gratis
              </Link>
              <a href="#metodo" className={buttonClass("ghost", "lg")}>
                Ver cómo funciona
              </a>
            </div>
            <p className="mt-4 text-xs text-muted">3 minutos para tu primer resultado · Hecho en Colombia, para Latinoamérica</p>
          </div>
          <figure className="relative" aria-label="Vista previa del panel con datos ficticios">
            <div className="rounded-lg border border-border bg-surface p-5 shadow-lg">
              <p className="t-overline text-ink">Vista previa · datos ficticios</p>
              <p className="mt-2 font-title text-[22px] leading-7 font-medium text-ink">
                Vas bien: tu caja cubre el mes. <span className="text-warn">Ojo con Mercado,</span> que ya va en 83 %.
              </p>
              <dl className="mt-4 grid grid-cols-3 divide-x divide-border text-xs">
                <div className="pr-3">
                  <dt className="text-muted">Te entró</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-pos tabular">+$ 4.200.000</dd>
                </div>
                <div className="px-3">
                  <dt className="text-muted">Gastaste</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-neg tabular">−$ 2.610.000</dd>
                </div>
                <div className="pl-3">
                  <dt className="text-muted">Te queda</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink tabular">$ 1.590.000</dd>
                </div>
              </dl>
              <svg viewBox="0 0 400 90" className="mt-4 w-full" aria-hidden>
                <path d="M0 70H400" stroke="var(--chart-axis)" strokeWidth="1" />
                <path d="M0 30L45 28L90 34L125 22" fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M125 22L170 28L215 20L255 48L290 64L330 38L400 34" fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
                <circle cx="290" cy="64" r="6" fill="var(--chart-mark)" stroke="var(--surface)" strokeWidth="2" />
              </svg>
              <p className="mt-2 text-xs text-muted">Tu caja a 90 días, con el punto más bajo explicado.</p>
            </div>
            <div className="absolute -right-2 -bottom-6 flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-md sm:-right-6">
              <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-accent-ink">
                <Check className="size-4" />
              </span>
              <span className="text-xs">
                <span className="block font-semibold text-ink">Lección completa</span>
                <span className="text-muted">Ya sabes leer una tasa</span>
              </span>
            </div>
          </figure>
        </section>

        <section id="metodo" className="scroll-mt-20 border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-title text-[28px] leading-9 font-medium text-ink">El método: ubicarte, planear y actuar</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {method.map((m) => (
                <li key={m.n}>
                  <span className="font-title text-4xl font-medium text-ink">{m.n}</span>
                  <h3 className="mt-2 text-base font-semibold text-ink">{m.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-2">{m.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className="rounded-lg border border-border bg-bg p-5">
                  <f.icon aria-hidden className="mb-3 size-5 text-ink" />
                  <h3 className="font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1 text-sm text-ink-2">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="areas" className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-title text-[28px] leading-9 font-medium text-ink">
              Ocho áreas para crecer.
              <br />
              Empezamos por el dinero.
            </h2>
            <p className="mt-4 text-ink-2">Finanzas personales está disponible hoy. Las demás áreas llegarán poco a poco.</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {LEARNING_AREAS.map((a) => {
              const available = a.status === "available";
              return (
                <li
                  key={a.slug}
                  className={cn("flex min-h-11 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm", available ? "border-2 border-brand bg-surface font-semibold text-ink" : "bg-surface-2 text-ink-2")}
                >
                  {a.name}
                  {available ? (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-pos-soft px-2 py-0.5 text-xs font-semibold text-pos">
                      <Check aria-hidden className="size-3" /> Hoy
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Próximamente</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
            <h2 className="font-title text-[28px] leading-9 font-medium text-ink">Tu punto de partida, en 3 minutos</h2>
            <Link href="/registro" className={buttonClass("primary", "lg", "mt-6")}>
              Crear cuenta gratis
            </Link>
            <p className="mx-auto mt-6 flex max-w-xl items-start justify-center gap-2 text-xs text-muted">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
              Crece Millo es una herramienta educativa. Los cálculos son estimaciones basadas en los datos que registras y en supuestos explícitos; no constituyen asesoría financiera, tributaria, legal ni de inversión.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
