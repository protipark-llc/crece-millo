import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crece Millo",
    short_name: "Crece Millo",
    description: "Universidad digital de crecimiento integral. Primera área: finanzas personales.",
    lang: "es-CO",
    start_url: "/universidad",
    display: "standalone",
    background_color: "#F5F2EC",
    theme_color: "#1C1C21",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
