import type { Settings } from "./services/settings";
import type { SettingsDefaults } from "@/components/finance/forms/settings-form";

export function settingsDefaults(s: Settings): SettingsDefaults {
  return {
    country: s.country,
    currency: s.currency,
    locale: s.locale,
    timezone: s.timezone,
    incomeStability: s.incomeStability ?? "",
    dependentsCount: s.dependentsCount === null ? "" : String(s.dependentsCount),
    dependentsNotes: s.dependentsNotes ?? "",
    singleIncomeHousehold: !!s.singleIncomeHousehold,
    emergencyMonthsTarget: s.emergencyMonthsTarget === null ? "" : String(s.emergencyMonthsTarget),
    businessExpensesEnabled: s.businessExpensesEnabled,
  };
}
