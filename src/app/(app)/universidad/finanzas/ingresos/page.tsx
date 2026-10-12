import type { Metadata } from "next";
import { KindPage } from "@/components/finance/kind-page";

export const metadata: Metadata = { title: "Ingresos" };

export default async function IncomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <KindPage kind="income" params={await searchParams} />;
}
