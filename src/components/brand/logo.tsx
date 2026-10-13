import { cn } from "../ui/cn";

/**
 * Marca «Umbral»: puerta torii con la llama entre los pilares.
 *
 * - variant "horizontal": símbolo + «CRECE MILLO» (SVG con el texto en trazos, en /public/brand).
 * - variant "simbolo": solo el símbolo, dibujado en línea para que sea nítido a cualquier tamaño.
 * - tone "claro" para fondos claros, "oscuro" para fondos oscuros (p. ej. la barra lateral) y
 *   "auto" para fondos que cambian con el tema.
 *
 * Reglas de uso (docs/diseno/crece-millo-v1): mínimo 24 px; no cambiar el color de la llama,
 * no rotar, no estirar, sin degradados.
 */
type Tone = "claro" | "oscuro" | "auto";

const HORIZONTAL = { claro: "/brand/logo-horizontal.svg", oscuro: "/brand/logo-horizontal-oscuro.svg" } as const;

export function Logo({
  variant = "horizontal",
  tone = "auto",
  height = 28,
  className,
  decorative = false,
}: {
  variant?: "horizontal" | "simbolo";
  tone?: Tone;
  height?: number;
  className?: string;
  /** true cuando hay texto visible al lado con el nombre (evita repetirlo al lector de pantalla). */
  decorative?: boolean;
}) {
  if (variant === "simbolo") return <Simbolo tone={tone} size={height} className={className} decorative={decorative} />;
  const width = Math.round((height * 663) / 120);
  const alt = decorative ? "" : "Crece Millo";
  if (tone === "auto") {
    return (
      <span className={cn("inline-flex", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HORIZONTAL.claro} alt={alt} width={width} height={height} className="logo-on-light" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HORIZONTAL.oscuro} alt={alt} width={width} height={height} className="logo-on-dark" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={HORIZONTAL[tone]} alt={alt} width={width} height={height} className={className} />;
}

/** Símbolo en SVG en línea. En "claro" el cuadro es sumi; en "oscuro", washi. La llama siempre es bermellón. */
function Simbolo({ tone, size, className, decorative }: { tone: Tone; size: number; className?: string; decorative: boolean }) {
  const box = tone === "oscuro" ? "#F2EFEA" : tone === "claro" ? "#1C1C21" : "var(--brand)";
  const gate = tone === "oscuro" ? "#1C1C21" : tone === "claro" ? "#FFFFFF" : "var(--brand-ink)";
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Crece Millo"}
      aria-hidden={decorative || undefined}
    >
      <rect width="48" height="48" rx="11" fill={box} />
      <path d="M6 12.5Q24 17.5 42 12.5" fill="none" stroke={gate} strokeWidth="4" strokeLinecap="round" />
      <path d="M11 20H37M15 14.5V41M33 14.5V41" fill="none" stroke={gate} strokeWidth="3.6" strokeLinecap="round" />
      <path
        transform="translate(24 31) scale(0.4) translate(-24 -23)"
        d="M24 6C31 13 36 20 36 28A12 12 0 0 1 12 28C12 21.5 15.5 17 19 13C20 18 22 20.5 25 21.5C26.5 16 26 11 24 6Z"
        fill="#E0482D"
      />
    </svg>
  );
}
