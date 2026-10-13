import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LineChart, PiggyBank, ShieldCheck, Sprout, Target, Waves } from "lucide-react";
import { getCurrentUser } from "@/server/session";
import { buttonClass } from "@/components/ui/primitives";
import { LEARNING_AREAS } from "@/lib/education/catalog";

export const dynamic = "force-dynamic";

export default async function Landing() {
  if (await getCurrentUser()) redirect("/universidad");
  const features = [
    { icon: Waves, title: "Flujo de caja real y proyectado", text: "Mira cuánto dinero tendrás cada semana y anticipa meses con déficit antes de que lleguen." },
    { icon: PiggyBank, title: "Presupuesto que se compara con la realidad", text: "Planea por categoría, reasigna cuando haga falta y ve tu ejecución sin hojas de cálculo." },
    { icon: Target, title: "Deudas, ahorro y objetivos", text: "Compara avalancha y bola de nieve, calcula tu fondo de emergencia y el aporte para cada meta." },
    { icon: LineChart, title: "Patrimonio y escenarios", text: "Activos menos pasivos, separando lo líquido de lo que no lo es, y simulaciones que no tocan tus datos." },
  ];
  return (
    <main id="contenido">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="flex items-center gap-2 font-semibold text-ink">
          <span className="inline-flex size-9 items-center justify-center rounded-md bg-brand text-brand-ink">
            <Sprout aria-hidden className="size-5" />
          </span>
          Crece
        </span>
        <nav className="flex items-center gap-2">
          <Link href="/ingresar" className={buttonClass("ghost")}>
            Ingresar
          </Link>
          <Link href="/registro" className={buttonClass("primary")}>
            Crear cuenta
          </Link>
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <p className="mb-3 text-sm font-medium text-brand">Universidad digital · Finanzas personales</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Entiende dónde estás, hacia dónde vas y qué hacer después con tu dinero.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
          Un centro de control financiero personal unido a una ruta de aprendizaje práctica. Sin fórmulas mágicas ni promesas de riqueza rápida: información clara, hábitos sostenibles y decisiones conscientes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/registro" className={buttonClass("primary", "md", "h-11 px-5")}>
            Empezar mi diagnóstico <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link href="/ingresar" className={buttonClass("secondary", "md", "h-11 px-5")}>
            Ya tengo cuenta
          </Link>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-surface p-5">
              <f.icon aria-hidden className="mb-3 size-5 text-brand" />
              <h2 className="font-semibold text-ink">{f.title}</h2>
              <p className="mt-1 text-sm text-ink-2">{f.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-14">
          <h2 className="text-lg font-semibold text-ink">Una plataforma para crecer en todas las áreas</h2>
          <p className="mt-1 text-sm text-ink-2">Empezamos por las finanzas personales. Las demás áreas llegarán progresivamente.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {LEARNING_AREAS.map((a) => (
              <li key={a.slug} className={a.status === "available" ? "rounded-full bg-brand-soft px-3 py-1 text-sm text-brand" : "rounded-full bg-surface-2 px-3 py-1 text-sm text-muted"}>
                {a.name}
                {a.status === "coming_soon" && " · próximamente"}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-14 flex items-start gap-2 text-xs text-muted">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          Herramienta educativa. No es asesoría financiera, tributaria, legal ni de inversión certificada. Los cálculos son estimaciones basadas en los datos que registras.
        </p>
      </section>
    </main>
  );
}
