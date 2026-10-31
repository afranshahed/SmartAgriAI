import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getDeviceConnectionStatus } from "@/lib/device-status";

export async function GET() {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const gardens = await prisma.garden.findMany({
    where: { userId: gate }, orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { pots: true, plants: true, devices: true } },
      devices: { select: { lastSeenAt: true } },
      pots: { select: { pumpState: true } },
    },
  });
  const now = new Date();
  return NextResponse.json(gardens.map(({ devices, pots, ...garden }) => {
    const statuses = devices.map((device) => getDeviceConnectionStatus(device.lastSeenAt, now));
    return {
      ...garden,
      deviceSummary: {
        online: statuses.filter((status) => status === "ONLINE").length,
        stale: statuses.filter((status) => status === "STALE").length,
        offline: statuses.filter((status) => status === "OFFLINE").length,
      },
      pumpsOn: pots.filter((pot) => pot.pumpState === "on").length,
    };
  }));
}
