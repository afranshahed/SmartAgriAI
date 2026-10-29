// TASK: Analytics support — export sensor readings as CSV.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;

  const rows = await prisma.reading.findMany({
    where: { userId: gate },
    orderBy: { recordedAt: "desc" },
    take: 1000,
    select: { recordedAt: true, metric: true, value: true, unit: true },
  });

  let csv = "Timestamp,Metric,Value,Unit\n";
  for (const r of rows) {
    csv += `${r.recordedAt.toISOString()},${r.metric},${r.value},${r.unit ?? ""}\n`;
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=sensor-readings.csv",
    },
  });
}
