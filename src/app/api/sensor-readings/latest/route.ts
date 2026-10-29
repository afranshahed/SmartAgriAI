// TASK: Proposal Feature 2 — Soil Moisture Monitoring (read side).
// WHAT: Powers the dashboard tiles + charts: latest value per metric plus
//       moisture/temperature/humidity time-series (polled by the UI).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getLatestEnvironment, getReadingSeries } from "@/server/readings";

export async function GET(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  const { searchParams } = new URL(req.url);
  const gardenId = searchParams.get("gardenId") || undefined;

  const [latest, moisture, temperature, humidity] = await Promise.all([
    getLatestEnvironment(userId, gardenId),
    getReadingSeries(userId, "soil_moisture", 30, gardenId),
    getReadingSeries(userId, "temperature", 30, gardenId),
    getReadingSeries(userId, "humidity", 30, gardenId),
  ]);

  // Series are returned newest-first; reverse for left-to-right charts.
  const series = {
    moisture: moisture.reverse(),
    temperature: temperature.reverse(),
    humidity: humidity.reverse(),
  };

  return NextResponse.json({ latest, series });
}
