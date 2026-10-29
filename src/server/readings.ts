import { prisma } from "@/lib/db";
import type { Metric } from "@prisma/client";

export interface LatestEnvironment {
  moisture: number | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  rain: number | null;
  recordedAt: Date | null;
}

const ENV_METRICS: Metric[] = [
  "soil_moisture",
  "temperature",
  "humidity",
  "light",
  "rain",
];

/**
 * Latest value for each environmental metric for a user (optionally scoped to
 * one garden). One indexed query per metric — cheap given low write volume.
 */
export async function getLatestEnvironment(
  userId: string,
  gardenId?: string,
): Promise<LatestEnvironment> {
  const rows = await Promise.all(
    ENV_METRICS.map((metric) =>
      prisma.reading.findFirst({
        where: { userId, metric, ...(gardenId ? { gardenId } : {}) },
        orderBy: { recordedAt: "desc" },
        select: { value: true, recordedAt: true },
      }),
    ),
  );

  const [moisture, temperature, humidity, light, rain] = rows;
  const recordedAt = rows
    .map((r) => r?.recordedAt)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    moisture: moisture?.value ?? null,
    temperature: temperature?.value ?? null,
    humidity: humidity?.value ?? null,
    light: light?.value ?? null,
    rain: rain?.value ?? null,
    recordedAt: recordedAt ?? null,
  };
}

/**
 * Time-series rows for charting, newest first.
 */
export async function getReadingSeries(
  userId: string,
  metric: Metric,
  limit = 50,
  gardenId?: string,
) {
  return prisma.reading.findMany({
    where: { userId, metric, ...(gardenId ? { gardenId } : {}) },
    orderBy: { recordedAt: "desc" },
    take: limit,
    select: { value: true, recordedAt: true },
  });
}
