import { NextResponse } from "next/server";
import { healthReport } from "@/server/health";

export const dynamic = "force-dynamic";

/** Estado del despliegue: conexión, migraciones y cuenta inicial (sin datos sensibles). */
export async function GET() {
  const report = await healthReport();
  return NextResponse.json(report, { status: report.database === "ok" && !report.problem ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
