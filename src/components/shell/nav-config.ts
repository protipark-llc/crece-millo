export interface NavItem {
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
    label: "Cuenta",
    items: [{ href: "/configuracion", label: "Configuración", icon: "Settings" }],
  },
];
