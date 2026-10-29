// Soil & environmental recommendation engine (proposal feature 4).
// Rules-based: compares the latest readings against ideal ranges
// (per-plant PlantThreshold, falling back to sensible defaults).

import { defaultThreshold } from "@/lib/defaults";

export interface Thresholds {
  soilMoistureMin?: number | null;
  soilMoistureMax?: number | null;
  tempDayMin?: number | null;
  tempDayMax?: number | null;
  humidityMin?: number | null;
  humidityMax?: number | null;
}

export interface Recommendation {
  metric: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export function buildRecommendations(params: {
  moisture?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  rainProb?: number | null;
  thresholds?: Thresholds | null;
}): Recommendation[] {
  const t = { ...defaultThreshold, ...(params.thresholds ?? {}) };
  const recs: Recommendation[] = [];

  const moisture = params.moisture;
  if (typeof moisture === "number") {
    if (moisture < (t.soilMoistureMin ?? 30)) {
      recs.push({
        metric: "soil_moisture",
        severity: "critical",
        message: `Soil is dry (${moisture}%). Irrigate now or enable auto-irrigation to restore moisture above ${t.soilMoistureMin}%.`,
      });
    } else if (moisture > (t.soilMoistureMax ?? 70)) {
      recs.push({
        metric: "soil_moisture",
        severity: "warning",
        message: `Soil is waterlogged (${moisture}%). Pause irrigation and improve drainage to avoid root rot.`,
      });
    }
  }

  const temp = params.temperature;
  if (typeof temp === "number") {
    if (temp > (t.tempDayMax ?? 32)) {
      recs.push({
        metric: "temperature",
        severity: "warning",
        message: `High temperature (${temp}°C). Provide shade and water early morning/evening to reduce heat stress.`,
      });
    } else if (temp < (t.tempDayMin ?? 18)) {
      recs.push({
        metric: "temperature",
        severity: "warning",
        message: `Low temperature (${temp}°C). Consider covering crops to protect from cold stress.`,
      });
    }
  }

  const humidity = params.humidity;
  if (typeof humidity === "number") {
    if (humidity > (t.humidityMax ?? 80)) {
      recs.push({
        metric: "humidity",
        severity: "warning",
        message: `High humidity (${humidity}%) raises fungal disease risk. Improve airflow and scout leaves for blight.`,
      });
    } else if (humidity < (t.humidityMin ?? 40)) {
      recs.push({
        metric: "humidity",
        severity: "info",
        message: `Low humidity (${humidity}%). Mulch the soil to retain moisture.`,
      });
    }
  }

  if (typeof params.rainProb === "number" && params.rainProb >= 70) {
    recs.push({
      metric: "weather",
      severity: "info",
      message: `Rain likely (${params.rainProb}%). Hold off on irrigation and fertilizer application today.`,
    });
  }

  if (recs.length === 0) {
    recs.push({
      metric: "general",
      severity: "info",
      message: "All environmental factors are within healthy ranges. Maintain current care routine.",
    });
  }

  return recs;
}
