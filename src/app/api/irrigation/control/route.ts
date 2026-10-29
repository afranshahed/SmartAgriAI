// TASK: Proposal Feature 3 — Automatic Irrigation (manual override).
// WHAT: GET returns current pump state; POST is the user's manual on/off override,
//       which the auto-irrigation decision in /api/iot/ingest then respects.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

async function getConfig(userId: string) {
  return prisma.irrigationConfig.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

// Current irrigation state (pump on/off, manual override, threshold).
export async function GET() {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const config = await getConfig(gate);
  return NextResponse.json({
    success: true,
    status: config.currentStatus,
    manualOverride: config.manualOverride,
    threshold: config.thresholdPercent,
  });
}

const schema = z.object({
  status: z.enum(["on", "off"]).optional(),
  manualOverride: z.boolean().optional(),
});

// Manual override — user explicitly turns the pump on/off.
export async function POST(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const config = await getConfig(userId);
    const nextStatus = parsed.data.status ?? config.currentStatus;
    const nextOverride = parsed.data.manualOverride ?? config.manualOverride;

    const updated = await prisma.irrigationConfig.update({
      where: { userId },
      data: { currentStatus: nextStatus, manualOverride: nextOverride },
    });

    await prisma.irrigationEvent.create({
      data: {
        userId,
        mode: "manual",
        status: nextStatus,
        manualOverride: nextOverride,
        reason: "User manual override",
      },
    });

    return NextResponse.json({
      success: true,
      status: updated.currentStatus,
      manualOverride: updated.manualOverride,
      threshold: updated.thresholdPercent,
    });
  } catch (error) {
    console.error("Irrigation control error:", error);
    return NextResponse.json(
      { error: "Failed to update irrigation" },
      { status: 500 },
    );
  }
}
