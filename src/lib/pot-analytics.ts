import { prisma } from "@/lib/db";

export type AnalyticsRange = "24h" | "7d" | "30d";

type AnalyticsDateRange =
  | { start: Date; end?: Date }
  | { error: string };

export function rangeStart(range: AnalyticsRange) {
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// datetime-local values do not have an offset. The application treats them as
// Bangladesh local time so a browser or deployment in another timezone cannot
// silently change the requested reporting interval.
export function bangladeshDateTimeToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0"] = match;
  const utcMillis = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const parsed = new Date(utcMillis);
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day) ||
    parsed.getUTCHours() !== Number(hour) ||
    parsed.getUTCMinutes() !== Number(minute) ||
    parsed.getUTCSeconds() !== Number(second)
  ) return null;

  return new Date(utcMillis - 6 * 60 * 60 * 1000);
}

export function resolveAnalyticsDateRange(range: string | null, from: string | null, to: string | null): AnalyticsDateRange {
  if (["24h", "7d", "30d"].includes(range ?? "")) return { start: rangeStart(range as AnalyticsRange) };
  if (range !== "custom") return { error: "A valid range is required" };
  if (!from || !to) return { error: "Both From and To date-times are required for a custom range" };

  const start = bangladeshDateTimeToDate(from);
  const end = bangladeshDateTimeToDate(to);
  if (!start || !end) return { error: "Use valid Bangladesh date and time values" };
  if (start >= end) return { error: "To date and time must be later than From date and time" };
  return { start, end };
}

export async function getPotAnalytics(userId: string, gardenId: string, potId: string, start: Date, end?: Date) {
  const pot = await prisma.pot.findFirst({ where: { id: potId, gardenId, userId }, select: { id: true, label: true, irrigationMode: true, moistureOnThreshold: true, moistureOffThreshold: true, pumpState: true, garden: { select: { id: true, name: true } } } });
  if (!pot) return null;
  const dateFilter = end ? { gte: start, lt: end } : { gte: start };
  const [soilMoisture, weather, irrigation, pumpEvents] = await Promise.all([
    prisma.reading.findMany({ where: { userId, gardenId, potId, metric: "soil_moisture", recordedAt: dateFilter }, orderBy: { recordedAt: "asc" }, select: { recordedAt: true, value: true, deviceId: true, unit: true, quality: true } }),
    prisma.weatherSnapshot.findMany({ where: { gardenId, observedAt: dateFilter }, orderBy: { observedAt: "asc" } }),
    prisma.irrigationEvent.findMany({ where: { userId, gardenId, potId, startedAt: dateFilter }, orderBy: { startedAt: "desc" } }),
    prisma.pumpEvent.findMany({ where: { userId, gardenId, potId, occurredAt: dateFilter }, orderBy: { occurredAt: "desc" } }),
  ]);
  return { pot, soilMoisture, weather, irrigation, pumpEvents };
}
