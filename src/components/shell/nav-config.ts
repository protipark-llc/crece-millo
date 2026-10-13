export interface NavItem {
  /** Clave de sección (src/lib/sections.ts): permite ocultarla desde Configuración. */
  key: string;
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Universidad",
    items: [
      { key: "uni_inicio", href: "/universidad", label: "Inicio", icon: "Home", exact: true },
      { key: "uni_progreso", href: "/universidad/progreso", label: "Mi progreso", icon: "Trophy" },
      { key: "uni_rutas", href: "/universidad/rutas", label: "Rutas de aprendizaje", icon: "Route" },
      { key: "uni_biblioteca", href: "/universidad/biblioteca", label: "Biblioteca de módulos", icon: "Library" },
    ],
  },
  {
    label: "Finanzas personales",
    items: [
      { key: "panel", href: "/universidad/finanzas", label: "Panel", icon: "LayoutDashboard", exact: true },
      { key: "diagnostico", href: "/universidad/finanzas/diagnostico", label: "Diagnóstico", icon: "Stethoscope" },
      { key: "movimientos", href: "/universidad/finanzas/movimientos", label: "Movimientos", icon: "ArrowLeftRight" },
      { key: "ingresos", href: "/universidad/finanzas/ingresos", label: "Ingresos", icon: "TrendingUp" },
      { key: "gastos", href: "/universidad/finanzas/gastos", label: "Gastos", icon: "TrendingDown" },
      { key: "cuentas", href: "/universidad/finanzas/cuentas", label: "Cuentas", icon: "Landmark" },
      { key: "presupuesto", href: "/universidad/finanzas/presupuesto", label: "Presupuesto", icon: "PieChart" },
      { key: "flujo", href: "/universidad/finanzas/flujo-de-caja", label: "Flujo de caja", icon: "Waves" },
      { key: "deudas", href: "/universidad/finanzas/deudas", label: "Deudas", icon: "CreditCard" },
      { key: "objetivos", href: "/universidad/finanzas/objetivos", label: "Ahorro y objetivos", icon: "Target" },
      { key: "patrimonio", href: "/universidad/finanzas/patrimonio", label: "Patrimonio neto", icon: "Building2" },
      { key: "simulador", href: "/universidad/finanzas/simulador", label: "Simulador", icon: "FlaskConical" },
      { key: "informes", href: "/universidad/finanzas/informes", label: "Informes", icon: "FileBarChart" },
    ],
  },
  {
    label: "Comunidad",
    items: [
      { key: "muro", href: "/comunidad", label: "Muro", icon: "MessagesSquare", exact: true },
      { key: "en_vivo", href: "/comunidad/en-vivo", label: "En vivo", icon: "Radio" },
      { key: "emprendedores", href: "/comunidad/emprendedores", label: "Emprendedores", icon: "Rocket", exact: true },
      { key: "copiloto", href: "/comunidad/emprendedores/copiloto", label: "Co-Piloto de Negocio", icon: "Gauge" },
    ],
  },
  {
    label: "Cuenta",
    items: [{ key: "configuracion", href: "/configuracion", label: "Configuración", icon: "Settings" }],
  },
];

/** Candidatos para la barra inferior en móvil (el botón central «+» registra un movimiento). */
export const MOBILE_CANDIDATES: NavItem[] = [
  { key: "panel", href: "/universidad/finanzas", label: "Panel", icon: "LayoutDashboard", exact: true },
  { key: "movimientos", href: "/universidad/finanzas/movimientos", label: "Movimientos", icon: "ArrowLeftRight" },
  { key: "presupuesto", href: "/universidad/finanzas/presupuesto", label: "Presupuesto", icon: "PieChart" },
  { key: "flujo", href: "/universidad/finanzas/flujo-de-caja", label: "Flujo", icon: "Waves" },
  { key: "copiloto", href: "/comunidad/emprendedores/copiloto", label: "Co-Piloto", icon: "Gauge" },
  { key: "uni_inicio", href: "/universidad", label: "Inicio", icon: "Home", exact: true },
  { key: "cuentas", href: "/universidad/finanzas/cuentas", label: "Cuentas", icon: "Landmark" },
];

/** Navegación filtrada por las secciones visibles. */
export function visibleNav(enabled: readonly string[]): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => enabled.includes(i.key)) })).filter((g) => g.items.length > 0);
}

/** Hasta 3 destinos para la barra inferior móvil, en orden de preferencia. */
export function mobilePrimary(enabled: readonly string[]): NavItem[] {
  return MOBILE_CANDIDATES.filter((i) => enabled.includes(i.key)).slice(0, 3);
}

export function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}
