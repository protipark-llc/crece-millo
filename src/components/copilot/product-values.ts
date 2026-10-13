import { toInputString } from "@/lib/money/money";

export interface ProductFormValues {
  id?: string;
  name: string;
  supplier: string;
  status: string;
  productCost: string;
  shippingCost: string;
  otherCosts: string;
  returnShippingCost: string;
  paymentFeePct: string;
  platformFeePct: string;
  returnRatePct: string;
  expectedCpa: string;
  targetMarginPct: string;
  salePrice: string;
  notes: string;
}

export function productFormValues(p: {
  id: string;
  name: string;
  supplier: string | null;
  status: string;
  currency: string;
  productCost: number;
  shippingCost: number;
  otherCosts: number;
  returnShippingCost: number;
  paymentFeeBps: number;
  platformFeeBps: number;
  returnRateBps: number;
  expectedCpa: number;
  targetMarginBps: number;
  salePrice: number | null;
  notes: string | null;
}): ProductFormValues {
  const m = (x: number) => (x ? toInputString(x, p.currency) : "");
  const b = (x: number) => String(x / 100).replace(".", ",");
  return {
    id: p.id,
    name: p.name,
    supplier: p.supplier ?? "",
    status: p.status,
    productCost: m(p.productCost),
    shippingCost: p.shippingCost ? toInputString(p.shippingCost, p.currency) : "0",
    otherCosts: m(p.otherCosts),
    returnShippingCost: p.returnShippingCost === p.shippingCost ? "" : m(p.returnShippingCost),
    paymentFeePct: b(p.paymentFeeBps),
    platformFeePct: b(p.platformFeeBps),
    returnRatePct: b(p.returnRateBps),
    expectedCpa: m(p.expectedCpa),
    targetMarginPct: b(p.targetMarginBps),
    salePrice: p.salePrice ? toInputString(p.salePrice, p.currency) : "",
    notes: p.notes ?? "",
  };
}

export const NEW_PRODUCT: ProductFormValues = {
  name: "",
  supplier: "",
  status: "idea",
  productCost: "",
  shippingCost: "",
  otherCosts: "",
  returnShippingCost: "",
  paymentFeePct: "3",
  platformFeePct: "0",
  returnRatePct: "20",
  expectedCpa: "",
  targetMarginPct: "20",
  salePrice: "",
  notes: "",
};
