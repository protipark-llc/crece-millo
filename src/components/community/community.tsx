import Link from "next/link";
import {
  AlertTriangle,
  Bookmark,
  Check,
  CircleHelp,
  FlaskConical,
  Info,
  MessageSquare,
  Paperclip,
  Pin,
  Play,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import type { PostKind, SamplePost } from "@/lib/community/sample";
import { Badge, Card, buttonClass } from "../ui/primitives";
import { cn } from "../ui/cn";

const PREVIEW_TITLE = "Disponible cuando abramos la Comunidad";

/** Aviso de vista previa: el muro, los en vivo y los retos aún no están abiertos; lo que se ve es de ejemplo. */
export function PreviewNotice({ what = "La Comunidad todavía no está abierta" }: { what?: string }) {
  return (
    <div role="note" className="mb-5 flex gap-3 rounded-lg bg-info-soft px-4 py-3 text-sm text-ink">
      <Info aria-hidden className="mt-0.5 size-[18px] shrink-0 text-info" />
      <p>
        <strong className="font-semibold">Vista previa.</strong> {what}: las personas, publicaciones y cifras que ves aquí son ejemplos ficticios para mostrar cómo funcionará.
      </p>
    </div>
  );
}

export function Avatar({ initials, size = 36, accent = false }: { initials: string; size?: number; accent?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold", accent ? "bg-accent text-accent-ink" : "bg-surface-3 text-ink")}
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

/** Pila de avatares (decorativa) con el conteo escrito al lado. */
export function AvatarStack({ initials, label }: { initials: string[]; label: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex">
        {initials.map((x, i) => (
          <span key={x} className={cn("inline-flex size-[30px] items-center justify-center rounded-full border-2 border-surface text-[11px] font-semibold", i === 2 ? "bg-accent text-accent-ink" : "bg-surface-3 text-ink", i > 0 && "-ml-2")}>
            {x}
          </span>
        ))}
      </span>
      <span className="text-sm text-ink-2">{label}</span>
    </div>
  );
}

const KIND: Record<PostKind, { label: string; icon: typeof TrendingUp; tone: "pos" | "warn" | "info" }> = {
  avance: { label: "Avance", icon: TrendingUp, tone: "pos" },
  duda: { label: "Duda", icon: CircleHelp, tone: "warn" },
  test: { label: "Resultado de test", icon: FlaskConical, tone: "info" },
};

export function PostCard({ post }: { post: SamplePost }) {
  const k = KIND[post.kind];
  const Icon = k.icon;
  const VerdictIcon = post.test?.verdict === "Seguir" ? Check : post.test?.verdict === "Parar" ? AlertTriangle : CircleHelp;
  return (
    <article className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <Avatar initials={post.author.initials} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{post.author.name}</p>
          <p className="text-xs text-muted">{post.author.meta}</p>
        </div>
        <Badge tone={k.tone}>
          <Icon aria-hidden className="size-3" /> {k.label}
        </Badge>
      </header>
      <p className="mt-3 text-[15px] leading-[23px] text-ink">{post.text}</p>
      {post.test && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
          <FlaskConical aria-hidden className="size-5 shrink-0 text-ink-2" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{post.test.title}</p>
            <p className="text-xs text-muted tabular">{post.test.detail}</p>
          </div>
          <Badge tone={post.test.verdict === "Seguir" ? "pos" : post.test.verdict === "Parar" ? "neg" : "warn"}>
            <VerdictIcon aria-hidden className="size-3" /> {post.test.verdict}
          </Badge>
        </div>
      )}
      <footer className="mt-3 flex items-center gap-1 border-t border-border pt-2">
        <button type="button" disabled aria-pressed={false} title={PREVIEW_TITLE} className={buttonClass("ghost", "sm", "disabled:text-ink-2")}>
          <ThumbsUp aria-hidden className="size-4" /> Me sirve · {post.useful}
        </button>
        <button type="button" disabled title={PREVIEW_TITLE} className={buttonClass("ghost", "sm", "disabled:text-ink-2")}>
          <MessageSquare aria-hidden className="size-4" /> {post.comments} comentarios
        </button>
        <button type="button" disabled aria-pressed={false} aria-label="Guardar publicación" title={PREVIEW_TITLE} className={buttonClass("ghost", "sm", "ml-auto w-9 px-0 disabled:text-ink-2")}>
          <Bookmark aria-hidden className="size-4" />
        </button>
      </footer>
      {post.reply && (
        <div className="mt-2 flex gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
          <Avatar initials={post.reply.initials} size={28} />
          <p className="text-ink">
            <strong className="font-semibold">{post.reply.name}</strong> {post.reply.text}
          </p>
        </div>
      )}
    </article>
  );
}

/** Publicación fijada con video. El contenido real lo graba Alejandro (pendiente). */
export function PinnedVideo() {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative flex h-[180px] items-center justify-center bg-nav-bg sm:h-[210px]">
        <Badge className="absolute top-3 left-3 bg-white/10 text-nav-ink-active">
          <Pin aria-hidden className="size-3" /> Fijado
        </Badge>
        <span aria-hidden className="inline-flex size-16 items-center justify-center rounded-full bg-white/90 text-nav-bg">
          <Play className="size-6" />
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Avatar initials="AL" accent />
          <div>
            <p className="font-semibold text-ink">Alejandro · fundador</p>
            <p className="text-xs text-muted">Video de la semana</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">Pendiente: aquí irá el video de bienvenida de Alejandro, con subtítulos y transcripción.</p>
      </div>
    </article>
  );
}

/** Compositor. Mientras el muro esté en vista previa se muestra deshabilitado con un aviso. */
export function Composer({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-info-soft px-4 py-3 text-sm text-ink sm:flex-row sm:items-center">
        <Info aria-hidden className="size-[18px] shrink-0 text-info" />
        <p className="flex-1">
          <strong className="font-semibold">Publicar en el muro llegará pronto.</strong> Mientras tanto, tus herramientas ya funcionan: el Co-Piloto y la ruta guardan tu avance.
        </p>
        <Link href="/comunidad/emprendedores/co-piloto" className={buttonClass("primary", "sm")}>
          Abrir Co-Piloto
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <label htmlFor="composer" className="sr-only">
        Nueva publicación
      </label>
      <input id="composer" disabled placeholder="Comparte un avance, una duda o el resultado de un test" className="h-11 w-full rounded-md bg-surface-2 px-3 text-sm" />
      <div className="mt-3 flex flex-wrap gap-2">
        {["Avance", "Duda"].map((x) => (
          <span key={x} className="inline-flex h-8 items-center rounded-full border border-border-strong px-3 text-xs font-medium text-ink-2">
            {x}
          </span>
        ))}
        <span className="inline-flex h-8 items-center gap-1 rounded-full border border-border-strong px-3 text-xs font-medium text-ink-2">
          <Paperclip aria-hidden className="size-3" /> Adjuntar test
        </span>
        <button type="button" disabled className={buttonClass("primary", "sm", "ml-auto")}>
          Publicar
        </button>
      </div>
    </div>
  );
}

export function LiveEventCard({ event }: { event: { month: string; day: string; weekday: string; title: string; meta: string; status: "Próximo" | "En vivo" | "Grabado" } }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Próximo en vivo</h2>
        <Badge tone={event.status === "En vivo" ? "neg" : "info"}>
          <span aria-hidden className="size-1.5 rounded-full bg-current" /> {event.status}
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="inline-flex w-14 shrink-0 flex-col items-center rounded-md border border-border py-1.5">
          <span className="text-[11px] font-semibold text-accent uppercase">{event.month}</span>
          <span className="t-kpi leading-6 text-ink">{event.day}</span>
          <span className="text-[11px] text-muted">{event.weekday}</span>
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{event.title}</p>
          <p className="text-xs text-muted">{event.meta}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" disabled title={PREVIEW_TITLE} className={buttonClass("secondary", "sm")}>
          Recordarme
        </button>
        <button type="button" disabled title={PREVIEW_TITLE} className={buttonClass("ghost", "sm")}>
          Enviar mi tienda
        </button>
      </div>
    </Card>
  );
}

export function ChallengeCard({ c }: { c: { title: string; until: string; done: number; total: number; participants: number } }) {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Reto de la semana</h2>
        <span className="text-xs text-muted">{c.participants} participando</span>
      </div>
      <p className="mt-2 text-sm text-ink">
        {c.title} {c.until}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(c.done / c.total) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-ink tabular">
          {c.done} de {c.total}
        </span>
      </div>
    </Card>
  );
}

export function RulesCard({ rules }: { rules: string[] }) {
  return (
    <section className="rounded-lg bg-surface-2 p-5" aria-labelledby="normas">
      <h2 id="normas" className="t-overline text-muted">
        Cómo nos cuidamos aquí
      </h2>
      <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
        {rules.map((r) => (
          <li key={r}>· {r}</li>
        ))}
      </ul>
    </section>
  );
}

export function CommunityFooter() {
  return <p className="mt-10 border-t border-border pt-4 text-xs text-muted">Comunidad educativa. Los resultados de otros miembros no son garantía de los tuyos. No es asesoría financiera.</p>;
}

