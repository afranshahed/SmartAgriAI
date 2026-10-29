// TASK: Proposal Feature 4 — Soil & Environmental Recommendations.
// WHAT: Compares latest readings (+ rain probability) against per-plant
//       thresholds via buildRecommendations() (rules engine in lib/recommendations.ts).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { buildRecommendations } from "@/lib/recommendations";
import { getLatestEnvironment } from "@/server/readings";
import { getGardenWeather } from "@/lib/weather";

export async function GET(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  try {
    const { searchParams } = new URL(req.url);
    const gardenId = searchParams.get("gardenId") || undefined;
    const plantId = searchParams.get("plantId") || undefined;

    const [env, threshold] = await Promise.all([
      getLatestEnvironment(userId, gardenId),
      plantId
        ? prisma.plantThreshold.findFirst({
            where: {
              plantId,
              plant: { userId, ...(gardenId ? { gardenId } : {}) },
            },
          })
        : Promise.resolve(null),
    ]);

    // Recommendations may use weather, but only after resolving this user's
    // selected garden. Weather is not used to control pumps in this phase.
    let rainProb: number | null = null;
    if (gardenId) {
      const garden = await prisma.garden.findFirst({
        where: { id: gardenId, userId },
        select: { id: true, lat: true, lng: true },
      });
      if (garden?.lat != null && garden.lng != null) {
        try {
          rainProb = (await getGardenWeather({
            id: garden.id,
            lat: garden.lat,
            lng: garden.lng,
          })).current.rainProb;
        } catch {
          rainProb = null;
        }
      }
    }

    const recommendations = buildRecommendations({
      moisture: env.moisture,
      temperature: env.temperature,
      humidity: env.humidity,
      rainProb,
      thresholds: threshold,
    });

    return NextResponse.json({ recommendations, environment: env });
  } catch (error) {
    console.error("Recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to build recommendations" },
      { status: 500 },
    );
  }
}
