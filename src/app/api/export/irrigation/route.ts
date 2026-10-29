// TASK: Analytics support — export irrigation events as CSV.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;

  const rows = await prisma.irrigationEvent.findMany({
    where: { userId: gate },
    orderBy: { startedAt: "desc" },
    take: 1000,
  });

  let csv = "Timestamp,Mode,Status,ManualOverride,Reason\n";
  for (const r of rows) {
    csv += `${r.startedAt.toISOString()},${r.mode},${r.status},${r.manualOverride},"${(r.reason ?? "").replace(/"/g, "'")}"\n`;
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=irrigation-logs.csv",
    },
  });
}
