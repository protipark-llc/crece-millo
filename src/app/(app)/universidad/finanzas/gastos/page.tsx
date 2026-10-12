import type { Metadata } from "next";
import { KindPage } from "@/components/finance/kind-page";

export const metadata: Metadata = { title: "Gastos" };

export default async function ExpensePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <KindPage kind="expense" params={await searchParams} />;
}
