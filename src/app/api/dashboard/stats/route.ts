// TASK: Dashboard support — aggregate counts + priority (at-risk/diseased) plants.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  const [gardens, pots, plants, devices, activeDisease, unread] =
    await Promise.all([
      prisma.garden.count({ where: { userId } }),
      prisma.pot.count({ where: { userId } }),
      prisma.plant.count({ where: { userId } }),
      prisma.device.count({ where: { garden: { userId } } }),
      prisma.diseaseReport.count({ where: { userId, status: "active" } }),
      prisma.notification.count({ where: { userId, status: "unread" } }),
    ]);

  const priorityPlants = await prisma.plant.findMany({
    where: { userId, healthStatus: { in: ["at_risk", "diseased"] } },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { garden: { select: { name: true } } },
  });

  return NextResponse.json({
    counts: { gardens, pots, plants, devices, activeDisease, unread },
    priorityPlants,
  });
}
