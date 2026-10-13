import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
  experimental: {
    // Volver a una página vista hace poco es instantáneo (30 s). Las Server Actions que
    // guardan datos llaman a revalidatePath, que limpia esta caché: nunca se ve un dato viejo
    // después de guardar.
    staleTimes: { dynamic: 30 },
  },
  async redirects() {
    // El Co-Piloto anterior se reemplazó por el del paquete docs/copiloto.
    return [
      { source: "/comunidad/emprendedores/co-piloto", destination: "/comunidad/emprendedores/copiloto", permanent: false },
      { source: "/comunidad/emprendedores/co-piloto/:path*", destination: "/comunidad/emprendedores/copiloto/productos", permanent: false },
      { source: "/comunidad/emprendedores/ruta", destination: "/comunidad/emprendedores/copiloto/ruta", permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
