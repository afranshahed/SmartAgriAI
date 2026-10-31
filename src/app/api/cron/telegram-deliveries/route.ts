import { NextResponse } from "next/server";
import { runTelegramDeliveryWorkerUntilIdle } from "@/lib/telegram-outbox";
import { runDeviceOfflineMonitor } from "@/lib/device-monitoring";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const offline = await runDeviceOfflineMonitor();
  const deliveries = await runTelegramDeliveryWorkerUntilIdle();
  return NextResponse.json({ success: true, offline, deliveries });
}
