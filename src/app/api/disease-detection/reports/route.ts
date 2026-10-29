// Prediction history is always scoped to the authenticated user's plant.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const plantId = new URL(req.url).searchParams.get("plantId");
  if (!plantId) return NextResponse.json({ error: "plantId is required" }, { status: 400 });

  const plant = await prisma.plant.findFirst({ where: { id: plantId, userId: gate }, select: { id: true } });
  if (!plant) return NextResponse.json({ error: "Plant not found" }, { status: 404 });

  const reports = await prisma.diseasePrediction.findMany({
    where: { userId: gate, plantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      gardenId: true,
      potId: true,
      plantId: true,
      predictedDisease: true,
      confidence: true,
      createdAt: true,
    },
  });
  return NextResponse.json(reports.map((report) => ({
    ...report,
    imageUrl: `/api/disease-detection/images/${report.id}`,
  })));
}
