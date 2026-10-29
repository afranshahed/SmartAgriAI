// TASK: Domain CRUD — Gardens (top-level growing areas owning pots/plants/devices).
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;

  const gardens = await prisma.garden.findMany({
    where: { userId: gate },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { pots: true, plants: true, devices: true } } },
  });
  return NextResponse.json(gardens);
}

const coordinateSchema = {
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
};

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["outdoor", "greenhouse", "indoor", "hydroponic"]).default("outdoor"),
  location: z.string().optional(),
  ...coordinateSchema,
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid garden data" }, { status: 400 });
    }
    const garden = await prisma.garden.create({
      data: { ...parsed.data, userId },
    });
    return NextResponse.json(garden, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A garden with this name already exists" },
        { status: 409 },
      );
    }
    console.error("Garden create error:", error);
    return NextResponse.json({ error: "Failed to create garden" }, { status: 500 });
  }
}
