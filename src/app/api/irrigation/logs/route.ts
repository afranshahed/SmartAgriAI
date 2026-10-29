// TASK: Proposal Feature 3 — Automatic Irrigation (history).
// WHAT: Returns recent IrrigationEvent rows (auto/manual/scheduled) for the UI log.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;

  const { searchParams } = new URL(req.url);
  const gardenId = searchParams.get("gardenId") || undefined;
  const potId = searchParams.get("potId") || undefined;

  const logs = await prisma.irrigationEvent.findMany({
    where: {
      userId: gate,
      ...(gardenId ? { gardenId } : {}),
      ...(potId ? { potId } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  return NextResponse.json(logs);
}
