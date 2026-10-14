import { NextResponse } from "next/server";
import { withUser } from "@/lib/db/client";
import { todayIn } from "@/lib/finance/dates";
import { productsCsv, testsCsv } from "@/lib/copiloto/logic";
import { getCurrentUser } from "@/server/session";
import { getSettings } from "@/server/services/settings";
import { loadState } from "@/server/services/copiloto";

export const dynamic = "force-dynamic";

/**
 * Descargas del Co-Piloto, como en el original (L772, L1140, L1142):
 * - respaldo: JSON con la forma S (se puede importar aquí o en la app anterior);
 * - productos: «Productos para Notion» (CSV con «;»);
 * - tests: «Tests a CSV».
 * Los CSV llevan BOM para que Excel lea bien las tildes.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ archivo: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { archivo } = await params;
  if (!["respaldo", "productos", "tests"].includes(archivo))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const { S, today } = await withUser(user.id, async (tx) => {
    const today = todayIn((await getSettings(tx, user.id)).timezone);
    return { S: await loadState(tx, user.id, today), today };
  });
  const send = (body: string, name: string, type: string) =>
    new NextResponse(body, {
      headers: {
        "Content-Type": `${type}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  if (archivo === "respaldo")
    return send(
      JSON.stringify(S, null, 1),
      `copiloto_respaldo_${today}.json`,
      "application/json",
    );
  if (archivo === "productos")
    return send("﻿" + productsCsv(S), "productos_para_notion.csv", "text/csv");
  return send("﻿" + testsCsv(S), "tests_para_notion.csv", "text/csv");
}
