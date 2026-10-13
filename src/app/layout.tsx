import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Outfit } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-outfit", display: "swap" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap" });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";
const description = "Universidad digital de crecimiento integral. Empieza por tus finanzas: diagnóstico, presupuesto, flujo de caja, deudas, objetivos y patrimonio.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Crece Millo", template: "%s · Crece Millo" },
  description,
  applicationName: "Crece Millo",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Crece Millo",
    title: "Crece Millo · Cruza la puerta. Enciende lo tuyo.",
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Crece Millo · Cruza la puerta. Enciende lo tuyo." }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#111114" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${outfit.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
