/**
 * Catálogo de monedas soportadas.
 *
 * `exponent` es el exponente ISO 4217: cuántas unidades menores tiene la unidad
 * principal (COP y USD = 2 → centavos). Todos los importes se guardan como
 * enteros en unidades menores. `displayDecimals` controla solo la presentación
 * (en Colombia los centavos no se usan en la práctica, por eso COP muestra 0).
 */
export interface CurrencyInfo {
  code: string;
  name: string;
  exponent: number;
  displayDecimals: number;
  defaultLocale: string;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  COP: { code: "COP", name: "Peso colombiano", exponent: 2, displayDecimals: 0, defaultLocale: "es-CO" },
  USD: { code: "USD", name: "Dólar estadounidense", exponent: 2, displayDecimals: 2, defaultLocale: "en-US" },
  EUR: { code: "EUR", name: "Euro", exponent: 2, displayDecimals: 2, defaultLocale: "es-ES" },
  MXN: { code: "MXN", name: "Peso mexicano", exponent: 2, displayDecimals: 2, defaultLocale: "es-MX" },
  PEN: { code: "PEN", name: "Sol peruano", exponent: 2, displayDecimals: 2, defaultLocale: "es-PE" },
  CLP: { code: "CLP", name: "Peso chileno", exponent: 0, displayDecimals: 0, defaultLocale: "es-CL" },
  ARS: { code: "ARS", name: "Peso argentino", exponent: 2, displayDecimals: 2, defaultLocale: "es-AR" },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as [string, ...string[]];

export function currencyInfo(code: string): CurrencyInfo {
  const info = CURRENCIES[code];
  if (!info) throw new Error(`Moneda no soportada: ${code}`);
  return info;
}

export const COUNTRIES: { code: string; name: string; currency: string; locale: string; timezone: string }[] = [
  { code: "CO", name: "Colombia", currency: "COP", locale: "es-CO", timezone: "America/Bogota" },
  { code: "MX", name: "México", currency: "MXN", locale: "es-MX", timezone: "America/Mexico_City" },
  { code: "PE", name: "Perú", currency: "PEN", locale: "es-PE", timezone: "America/Lima" },
  { code: "CL", name: "Chile", currency: "CLP", locale: "es-CL", timezone: "America/Santiago" },
  { code: "AR", name: "Argentina", currency: "ARS", locale: "es-AR", timezone: "America/Argentina/Buenos_Aires" },
  { code: "ES", name: "España", currency: "EUR", locale: "es-ES", timezone: "Europe/Madrid" },
  { code: "US", name: "Estados Unidos", currency: "USD", locale: "es-US", timezone: "America/New_York" },
];
