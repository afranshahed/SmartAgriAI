import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireUser } from "@/lib/api-auth";
import { getPotAnalytics, resolveAnalyticsDateRange } from "@/lib/pot-analytics";

export async function GET(req: Request) {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  const query = new URL(req.url).searchParams;
  const gardenId = query.get("gardenId"); const potId = query.get("potId"); const range = query.get("range");
  if (!gardenId || !potId) return NextResponse.json({ error: "gardenId and potId are required" }, { status: 400 });
  const dateRange = resolveAnalyticsDateRange(range, query.get("from"), query.get("to"));
  if ("error" in dateRange) return NextResponse.json({ error: dateRange.error }, { status: 400 });
  const data = await getPotAnalytics(userId, gardenId, potId, dateRange.start, dateRange.end);
  if (!data) return NextResponse.json({ error: "Pot not found" }, { status: 404 });
  const workbook = XLSX.utils.book_new();
  const add = (name: string, rows: Record<string, unknown>[]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  add("Summary", [{ Garden: data.pot.garden.name, "Garden ID": gardenId, Pot: data.pot.label, "Pot ID": potId, Period: range, "Reading count": data.soilMoisture.length, "Irrigation event count": data.irrigation.length, "Pump event count": data.pumpEvents.length }]);
  add("Soil Moisture", data.soilMoisture.map((r) => ({ Timestamp: r.recordedAt.toISOString(), "Garden ID": gardenId, "Pot ID": potId, "Device ID": r.deviceId, "Moisture (%)": r.value, Unit: r.unit, Quality: r.quality })));
  add("Weather History", data.weather.map((w) => ({ Timestamp: w.observedAt.toISOString(), Temperature: w.temperature, Humidity: w.humidity, Precipitation: w.precipitation, "Rain probability": w.rainProbability, "Wind speed": w.windSpeed, Condition: w.condition, "UV index": w.uvIndex, Provider: w.provider })));
  add("Irrigation History", data.irrigation.map((e) => ({ Timestamp: e.startedAt.toISOString(), Mode: e.mode, Moisture: e.soilMoisture, "ON threshold": e.onThreshold, "OFF threshold": e.offThreshold, Decision: e.decision, Reason: e.reason, Outcome: e.outcome ?? e.status })));
  add("Pump History", data.pumpEvents.map((e) => ({ Timestamp: e.occurredAt.toISOString(), "Pot ID": e.potId, "Previous state": e.previousState, "New state": e.newState, Source: e.source, Result: e.status, "Failure reason": e.failureReason })));
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${data.pot.label.replace(/[^a-z0-9_-]/gi, "_")}-analytics.xlsx"` } });
}
