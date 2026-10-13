import { CheckCircle2, CircleHelp, OctagonAlert, Wrench } from "lucide-react";
import { VERDICT_LABEL, type Verdict } from "@/lib/copilot/engine";
import { Badge } from "../ui/primitives";

const TONE = { seguir: "pos", optimizar: "warn", parar: "neg", falta_info: "info" } as const;
const ICON = { seguir: CheckCircle2, optimizar: Wrench, parar: OctagonAlert, falta_info: CircleHelp } as const;

/** Veredicto del test con ícono y palabra (nunca solo color). */
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const Icon = ICON[verdict];
  return (
    <Badge tone={TONE[verdict]}>
      <Icon aria-hidden className="size-3" /> {VERDICT_LABEL[verdict]}
    </Badge>
  );
}
