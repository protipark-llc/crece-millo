export interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  /** Muestra la insignia PREMIUM junto al nombre. */
  premium?: boolean;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Universidad",
    items: [
      { href: "/universidad", label: "Inicio", icon: "Home", exact: true },
      { href: "/universidad/progreso", label: "Mi progreso", icon: "Trophy" },
      { href: "/universidad/rutas", label: "Rutas de aprendizaje", icon: "Route" },
      { href: "/universidad/biblioteca", label: "Biblioteca de módulos", icon: "Library" },
    ],
  },
  {
    label: "Finanzas personales",
    items: [
      { href: "/universidad/finanzas", label: "Panel", icon: "LayoutDashboard", exact: true },
      { href: "/universidad/finanzas/diagnostico", label: "Diagnóstico", icon: "Stethoscope" },
      { href: "/universidad/finanzas/movimientos", label: "Movimientos", icon: "ArrowLeftRight" },
      { href: "/universidad/finanzas/ingresos", label: "Ingresos", icon: "TrendingUp" },
      { href: "/universidad/finanzas/gastos", label: "Gastos", icon: "TrendingDown" },
      { href: "/universidad/finanzas/cuentas", label: "Cuentas", icon: "Landmark" },
      { href: "/universidad/finanzas/presupuesto", label: "Presupuesto", icon: "PieChart" },
      { href: "/universidad/finanzas/flujo-de-caja", label: "Flujo de caja", icon: "Waves" },
      { href: "/universidad/finanzas/deudas", label: "Deudas", icon: "CreditCard" },
      { href: "/universidad/finanzas/objetivos", label: "Ahorro y objetivos", icon: "Target" },
      { href: "/universidad/finanzas/patrimonio", label: "Patrimonio neto", icon: "Building2" },
      { href: "/universidad/finanzas/simulador", label: "Simulador", icon: "FlaskConical" },
      { href: "/universidad/finanzas/informes", label: "Informes", icon: "FileBarChart" },
    ],
  },
  {
    label: "Comunidad",
    items: [
      { href: "/comunidad", label: "Muro", icon: "MessagesSquare", exact: true },
      { href: "/comunidad/en-vivo", label: "En vivo", icon: "Radio" },
      { href: "/comunidad/emprendedores", label: "Emprendedores", icon: "Rocket", exact: true, premium: true },
      { href: "/comunidad/emprendedores/co-piloto", label: "Co-Piloto de Negocio", icon: "Gauge", premium: true },
    ],
  },
  {
    label: "Cuenta",
    items: [{ href: "/configuracion", label: "Configuración", icon: "Settings" }],
  },
];

/** Destinos de la barra inferior en móvil (el botón central «+» registra un movimiento). */
export const MOBILE_PRIMARY: NavItem[] = [
  { href: "/universidad/finanzas", label: "Panel", icon: "LayoutDashboard", exact: true },
  { href: "/universidad/finanzas/movimientos", label: "Movimientos", icon: "ArrowLeftRight" },
  { href: "/universidad/finanzas/presupuesto", label: "Presupuesto", icon: "PieChart" },
];

export function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}
