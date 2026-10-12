/**
 * Validación de entradas en el servidor (Zod). Los formularios del cliente pueden
 * validar también, pero la fuente de verdad es esta capa.
 * Los importes llegan como texto y se convierten con parseAmount() una vez que se
 * conoce la moneda (la de la cuenta, deuda u objetivo correspondiente).
 */
import { z } from "zod";
import { isISODate } from "@/lib/finance/dates";
import { CURRENCY_CODES } from "@/lib/money/currency";

export const isoDate = z.string().trim().refine(isISODate, "Fecha inválida (usa AAAA-MM-DD)");
export const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isISODate(v), "Fecha inválida");
export const uuidStr = z.string().uuid("Identificador inválido");
export const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().uuid().safeParse(v).success, "Identificador inválido");
export const amountText = z.string().trim().min(1, "Ingresa un importe").max(30, "Importe demasiado largo");
export const optionalAmountText = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v) => (v ? v : null));
export const name = z.string().trim().min(1, "Este campo es obligatorio").max(120, "Máximo 120 caracteres");
export const optionalText = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : null));
export const currency = z.enum(CURRENCY_CODES, { message: "Moneda no soportada" });
export const checkbox = z
  .string()
  .nullish()
  .transform((v) => v === "on" || v === "true" || v === "1");
export const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), `Debe ser un entero entre ${min} y ${max}`);
export const optionalDecimal = (min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v.replace(",", ".")) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), `Debe ser un número entre ${min} y ${max}`);

export const accountTypeEnum = z.enum(["cash", "checking", "savings", "digital_wallet", "investment", "other"]);
export const natureEnum = z.enum(["essential", "discretionary"]);
export const frequencyEnum = z.enum(["once", "daily", "weekly", "biweekly", "semimonthly", "monthly", "quarterly", "yearly"]);
export const incomeSourceEnum = z.enum(["salary", "fees", "sales", "business", "investment", "rental", "pension", "other"]);
export const txStatusEnum = z.enum(["planned", "posted", "cancelled"]);

export const accountInput = z.object({
  name,
  type: accountTypeEnum,
  currency,
  openingBalance: z.string().trim().max(30).default("0"),
  openingNegative: checkbox,
  openedOn: isoDate,
  notes: optionalText(),
});
export type AccountInput = z.infer<typeof accountInput>;

export const transactionInput = z
  .object({
    kind: z.enum(["income", "expense", "transfer"]),
    status: txStatusEnum,
    amount: amountText,
    accountId: uuidStr,
    toAccountId: optionalUuid,
    toAmount: optionalAmountText,
    date: isoDate,
    postedOn: optionalIsoDate,
    categoryId: optionalUuid,
    nature: z
      .union([natureEnum, z.literal("")])
      .optional()
      .transform((v) => (v ? v : null)),
    incomeSource: z
      .union([incomeSourceEnum, z.literal("")])
      .optional()
      .transform((v) => (v ? v : null)),
    description: name,
    counterparty: optionalText(120),
    notes: optionalText(),
    idempotencyKey: z.string().max(80).optional().transform((v) => (v ? v : null)),
    // Recurrencia opcional al crear
    frequency: z
      .union([frequencyEnum, z.literal("")])
      .optional()
      .transform((v) => (v ? v : "once")),
    endDate: optionalIsoDate,
  })
  .superRefine((v, ctx) => {
    if (v.kind === "transfer" && !v.toAccountId) {
      ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Elige la cuenta destino" });
    }
    if (v.kind === "transfer" && v.toAccountId === v.accountId) {
      ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "La cuenta destino debe ser distinta" });
    }
    if (v.endDate && v.endDate < v.date) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "La fecha final debe ser posterior al inicio" });
    }
    if (v.status === "posted" && v.frequency !== "once") {
      // Se permite: la primera ocurrencia se registra como realizada.
    }
  });
export type TransactionInput = z.infer<typeof transactionInput>;

export const categoryInput = z.object({
  name,
  kind: z.enum(["income", "expense"]),
  parentId: optionalUuid,
  nature: z
    .union([natureEnum, z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  behavior: z
    .union([z.enum(["fixed", "variable"]), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
});

export const debtInput = z.object({
  name,
  creditor: optionalText(120),
  type: z.enum(["credit_card", "mortgage", "vehicle", "personal_loan", "student_loan", "family", "employer", "informal", "other"]),
  currency,
  openingBalance: amountText,
  balanceDate: isoDate,
  ratePercent: optionalDecimal(0, 1000),
  rateBasis: z
    .union([z.enum(["EA", "NAMV", "EM"]), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  minimumPayment: optionalAmountText,
  paymentDay: optionalInt(1, 31),
  remainingTermMonths: optionalInt(1, 600),
  monthlyFees: optionalAmountText,
  daysPastDue: optionalInt(0, 10000),
  arrearsAmount: optionalAmountText,
  securedAssetId: optionalUuid,
  customPriority: optionalInt(1, 99),
  status: z.enum(["active", "paid_off", "paused"]).default("active"),
  notes: optionalText(),
});

export const debtPaymentInput = z.object({
  debtId: uuidStr,
  accountId: uuidStr,
  amount: amountText,
  paidOn: isoDate,
  interest: optionalAmountText,
  fees: optionalAmountText,
  isExtra: checkbox,
  idempotencyKey: z.string().max(80).optional().transform((v) => (v ? v : null)),
});

export const assetInput = z.object({
  name,
  type: z.enum(["real_estate", "vehicle", "investment", "business", "retirement", "receivable", "valuables", "other"]),
  currency,
  liquidity: z.enum(["liquid", "semi_liquid", "illiquid"]),
  value: amountText,
  valuedOn: isoDate,
  source: optionalText(200),
  notes: optionalText(),
});

export const valuationInput = z.object({
  assetId: uuidStr,
  value: amountText,
  valuedOn: isoDate,
  source: optionalText(200),
});

export const goalInput = z.object({
  name,
  type: z.enum(["emergency_fund", "education", "housing", "travel", "asset_purchase", "financial_independence", "investment", "other"]),
  currency,
  targetAmount: optionalAmountText,
  targetDate: optionalIsoDate,
  priority: optionalInt(1, 5),
  plannedMonthly: optionalAmountText,
  accountId: optionalUuid,
  emergencyMonthsTarget: optionalInt(1, 24),
  initialAmount: optionalAmountText,
  notes: optionalText(),
});

export const contributionInput = z.object({
  goalId: uuidStr,
  amount: amountText,
  direction: z.enum(["in", "out"]),
  contributedOn: isoDate,
  note: optionalText(200),
});

export const settingsInput = z.object({
  country: z.string().length(2),
  currency,
  locale: z.string().min(2).max(10),
  timezone: z.string().min(3).max(60),
  incomeStability: z
    .union([z.enum(["stable", "variable", "mixed"]), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  dependentsCount: optionalInt(0, 30),
  dependentsNotes: optionalText(500),
  singleIncomeHousehold: checkbox,
  emergencyMonthsTarget: optionalInt(1, 24),
  businessExpensesEnabled: checkbox,
});

/** Regla de contraseñas para registro y cambio de contraseña. */
export const passwordRule = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .max(200)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Incluye letras y números");

export const registerInput = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  email: z.string().trim().toLowerCase().email("Correo inválido").max(200),
  password: passwordRule,
  acceptPrivacy: z.literal("on", { message: "Debes aceptar el tratamiento de datos para continuar" }),
});

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido").max(200),
  password: z.string().min(1, "Escribe tu contraseña").max(200),
});

/** Convierte FormData en objeto plano (último valor gana). */
export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
