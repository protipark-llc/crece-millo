import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { Tone } from "@/lib/copiloto/engine";
import { Badge } from "@/components/ui/primitives";

/** Tonos del original → roles de Crece Millo (especificación §4.4), siempre con ícono y palabra. */
export const TONE_ROLE = { g: "pos", a: "warn", r: "neg", b: "info" } as const;
export const TONE_ICON = {
  g: CheckCircle2,
  a: AlertTriangle,
  r: XCircle,
  b: Info,
} as const;

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = TONE_ICON[tone];
  return (
    <Badge tone={TONE_ROLE[tone]} className={className}>
      <Icon aria-hidden className="size-3" /> {children}
    </Badge>
  );
}
