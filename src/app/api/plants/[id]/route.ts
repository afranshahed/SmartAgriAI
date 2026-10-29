// TASK: Domain CRUD — Plant update (PATCH: growth stage/health) / delete by id.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  gardenId: z.string().min(1).optional(),
  potId: z.string().min(1).optional(),
  commonName: z.string().min(1).optional(),
  variety: z.string().optional(),
  growthStage: z
    .enum(["seedling", "vegetative", "flowering", "fruiting", "mature", "harvested"])
    .optional(),
  healthStatus: z
    .enum(["healthy", "at_risk", "diseased", "recovering", "unknown"])
    .optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }
  const plant = await prisma.plant.findFirst({
    where: { id, userId: gate },
    select: { gardenId: true, potId: true },
  });
  if (!plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  const gardenId = parsed.data.gardenId ?? plant.gardenId;
  const potId = parsed.data.potId ?? plant.potId;
  if (!potId) {
    return NextResponse.json({ error: "Pot is required" }, { status: 400 });
  }
  const pot = await prisma.pot.findFirst({
    where: { id: potId, gardenId, userId: gate },
    include: { plant: { select: { id: true } } },
  });
  if (!pot) {
    return NextResponse.json(
      { error: "Pot not found for selected garden" },
      { status: 400 },
    );
  }
  if (pot.plant && pot.plant.id !== id) {
    return NextResponse.json(
      { error: "Pot already has a plant" },
      { status: 409 },
    );
  }

  try {
    const result = await prisma.plant.updateMany({
      where: { id, userId: gate },
      data: parsed.data,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Pot already has a plant" },
        { status: 409 },
      );
    }
    console.error("Plant update error:", error);
    return NextResponse.json({ error: "Failed to update plant" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const result = await prisma.plant.deleteMany({ where: { id, userId: gate } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
