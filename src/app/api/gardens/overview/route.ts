import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const gardens = await prisma.garden.findMany({
    where: { userId: gate }, orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { pots: true, plants: true, devices: true } },
      devices: { select: { status: true } },
      pots: { select: { pumpState: true } },
    },
  });
  return NextResponse.json(gardens.map(({ devices, pots, ...garden }) => ({
    ...garden,
    deviceSummary: { online: devices.filter((device) => device.status === "ONLINE").length, offline: devices.filter((device) => device.status === "OFFLINE").length },
    pumpsOn: pots.filter((pot) => pot.pumpState === "on").length,
  })));
}
