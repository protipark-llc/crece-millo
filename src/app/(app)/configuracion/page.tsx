import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { loadForUser } from "@/server/action-utils";
import { getSettings, listRates } from "@/server/services/settings";
import { settingsDefaults } from "@/server/settings-defaults";
import { getCurrentUser } from "@/server/session";
import { Card, CardHeader, PageHeader, buttonClass } from "@/components/ui/primitives";
import { SettingsForm } from "@/components/finance/forms/settings-form";
import { ChangePasswordForm, DeleteAccountForm, RateForm } from "@/components/finance/forms/account-settings-forms";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { ViewForm } from "@/components/settings/view-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const { settings, rates, today } = await loadForUser(async ({ tx, userId, today }) => ({ settings: await getSettings(tx, userId), rates: await listRates(tx, userId), today }));
  return (
    <>
      <PageHeader eyebrow="Cuenta" title="Configuración" description={`Cuenta de ${user?.email}`} />
      <div className="space-y-6">
        <Card id="vista" className="scroll-mt-6">
          <CardHeader title="Tu vista" description="Elige qué secciones ves en tu cuenta. Puedes cambiarlo cuando quieras." />
          <div className="p-5">
            <ViewForm mode={(settings.viewMode ?? "pro") as "esencial" | "pro" | "personalizada"} sections={settings.sections ?? null} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Preferencias regionales y del hogar" />
          <div className="p-5">
            <SettingsForm defaults={settingsDefaults(settings)} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Tasas de cambio"
            description="Solo convertimos montos entre monedas cuando hay una tasa con fecha y fuente. No consultamos servicios externos: tú registras la tasa (por ejemplo, la TRM del día)."
          />
          {rates.length > 0 && (
            <ul className="divide-y divide-border border-b border-border">
              {rates.map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 px-5 py-2.5 text-sm">
                  <span>
                    1 {r.fromCurrency} = {Number(r.rate).toLocaleString(settings.locale, { maximumFractionDigits: 6 })} {r.toCurrency}
                  </span>
                  <span className="text-muted">
                    {r.asOf} · {r.source}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="p-5">
            <RateForm base={settings.currency} today={today} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Apariencia" description="Elige el tema. «Sistema» sigue la configuración de tu dispositivo. Se guarda en este navegador." />
          <div className="p-5">
            <ThemeSwitcher withLabels />
          </div>
        </Card>
        <Card>
          <CardHeader title="Seguridad" description="Cambiar la contraseña cierra la sesión en tus otros dispositivos." />
          <div className="p-5">
            <ChangePasswordForm />
          </div>
        </Card>
        <Card>
          <CardHeader title="Tus datos" description="Puedes descargar toda tu información en cualquier momento." />
          <div className="flex flex-wrap gap-3 p-5">
            <a href="/configuracion/exportar" className={buttonClass("secondary")}>
              <Download aria-hidden className="size-4" /> Exportar todo (JSON)
            </a>
            <a href="/universidad/finanzas/informes/exportar" className={buttonClass("secondary")}>
              <Download aria-hidden className="size-4" /> Movimientos (CSV)
            </a>
            <Link href="/privacidad" className={buttonClass("ghost")}>
              Política de privacidad
            </Link>
          </div>
        </Card>
        <Card className="border-neg/40">
          <CardHeader title="Eliminar cuenta" description="Borra de forma definitiva tu cuenta y todos tus datos financieros y educativos. Esta acción no se puede deshacer." />
          <div className="p-5">
            <DeleteAccountForm />
          </div>
        </Card>
      </div>
    </>
  );
}
