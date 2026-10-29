// Compatibility endpoint. Weather must always be requested for one garden.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getGardenWeather, WeatherUnavailableError } from "@/lib/weather";
import { persistGardenWeatherSnapshot } from "@/lib/weather-history";

export async function GET(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;

  const gardenId = new URL(req.url).searchParams.get("gardenId");
  if (!gardenId) return NextResponse.json({ error: "gardenId is required" }, { status: 400 });

  const garden = await prisma.garden.findFirst({
    where: { id: gardenId, userId: gate },
    select: { id: true, lat: true, lng: true },
  });
  if (!garden) return NextResponse.json({ error: "Garden not found" }, { status: 404 });
  if (garden.lat == null || garden.lng == null) {
    return NextResponse.json({ error: "Garden coordinates are required" }, { status: 422 });
  }
  const weatherGarden = { id: garden.id, lat: garden.lat, lng: garden.lng };

  try {
    const weather = await getGardenWeather(weatherGarden);
    await persistGardenWeatherSnapshot(garden.id, weather);
    return NextResponse.json(weather);
  } catch (error) {
    if (error instanceof WeatherUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Garden weather error:", error);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
