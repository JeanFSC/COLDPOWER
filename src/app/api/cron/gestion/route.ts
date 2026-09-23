import { NextResponse } from "next/server";
import { processDueNotificationSchedules } from "@/lib/notification-rules-service";
import { processDueReportSchedules } from "@/lib/reporting-service";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = request.headers.get("x-cron-secret")?.trim();
  return bearer === expected || header === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: { code: "CRON_UNAUTHORIZED", message: "Cron no autorizado." } },
      { status: 401 },
    );
  }
  const [reports, notifications] = await Promise.allSettled([
    processDueReportSchedules(),
    processDueNotificationSchedules(),
  ]);
  if (reports.status === "rejected" || notifications.status === "rejected") {
    return NextResponse.json(
      { error: { code: "CRON_GESTION_FAILED", message: "No se pudo completar el procesamiento programado." } },
      { status: 503 },
    );
  }
  return NextResponse.json({ reports: reports.value, notifications: notifications.value });
}

export async function GET(request: Request) {
  return POST(request);
}
