import { Compass, GraduationCap, HeartPulse, Rocket, Sparkles, Timer, Users, Wallet, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { Compass, GraduationCap, HeartPulse, Rocket, Sparkles, Timer, Users, Wallet };

export function AreaIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon aria-hidden className={className} />;
}
