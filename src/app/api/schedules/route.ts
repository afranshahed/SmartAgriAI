// TASK: Proposal Feature 3 support — scheduled watering windows.
// WHAT: CRUD for irrigation schedules; the ingest decision turns the pump on
//       during an active, enabled schedule window.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const schedules = await prisma.schedule.findMany({
    where: { userId: gate },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(schedules);
}

const schema = z.object({
  id: z.string().optional(),
  gardenId: z.string().optional(),
  potId: z.string().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("06:00"),
  durationMinutes: z.number().int().min(1).default(15),
  days: z.array(z.enum(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])).default(["Mon", "Wed", "Fri"]),
  enabled: z.boolean().default(true),
}).strict();

async function validateScheduleScope(params: {
  userId: string;
  gardenId?: string;
  potId?: string;
}) {
  const [garden, pot] = await Promise.all([
    params.gardenId
      ? prisma.garden.findFirst({
          where: { id: params.gardenId, userId: params.userId },
          select: { id: true },
        })
      : Promise.resolve(null),
    params.potId
      ? prisma.pot.findFirst({
          where: { id: params.potId, userId: params.userId },
          select: { id: true, gardenId: true },
        })
      : Promise.resolve(null),
  ]);

  if (params.gardenId && !garden) return "Garden not found";
  if (params.potId && !pot) return "Pot not found";
  if (params.gardenId && pot && pot.gardenId !== params.gardenId) {
    return "Pot does not belong to the selected garden";
  }
  return null;
}

export async function POST(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
    }
    const { id, ...rest } = parsed.data;

    if (id) {
      const existing = await prisma.schedule.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!existing) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    const scopeError = await validateScheduleScope({ userId, ...rest });
    if (scopeError) return NextResponse.json({ error: scopeError }, { status: 404 });

    const schedule = id
      ? await prisma.schedule.update({ where: { id }, data: rest })
      : await prisma.schedule.create({ data: { ...rest, userId } });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error("Schedule save error:", error);
    return NextResponse.json({ error: "Failed to save schedule" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.schedule.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
