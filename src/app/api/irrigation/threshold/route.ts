// TASK: Proposal Feature 3 — Automatic Irrigation (moisture threshold).
// WHAT: Sets the soil-moisture % below which auto-irrigation turns the pump on.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const schema = z.object({ threshold: z.number().min(0).max(100) });

export async function POST(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "threshold must be a number between 0 and 100" },
        { status: 400 },
      );
    }

    const updated = await prisma.irrigationConfig.upsert({
      where: { userId },
      update: { thresholdPercent: parsed.data.threshold },
      create: { userId, thresholdPercent: parsed.data.threshold },
    });

    return NextResponse.json({ success: true, threshold: updated.thresholdPercent });
  } catch (error) {
    console.error("Threshold error:", error);
    return NextResponse.json(
      { error: "Failed to update threshold" },
      { status: 500 },
    );
  }
}
