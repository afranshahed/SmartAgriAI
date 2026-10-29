import { prisma } from "@/lib/db";
import { hashDeviceKey } from "@/lib/device-key";

export async function authenticateDevice(req: Request) {
  const key = req.headers.get("x-device-key");
  if (!key) return null;

  const { searchParams } = new URL(req.url);
  const hardwareIdFromQuery = searchParams.get("deviceId") ?? searchParams.get("hardwareId");

  let bodyHardwareId: string | undefined;
  if (!hardwareIdFromQuery && req.method !== "GET") {
    try {
      const clone = req.clone();
      const body = (await clone.json()) as { deviceId?: string; hardwareId?: string };
      bodyHardwareId = body.deviceId ?? body.hardwareId;
    } catch {
      bodyHardwareId = undefined;
    }
  }

  const hardwareId = hardwareIdFromQuery ?? bodyHardwareId;
  if (!hardwareId) return null;

  const device = await prisma.device.findUnique({
    where: { hardwareId },
    select: {
      id: true,
      userId: true,
      gardenId: true,
      hardwareId: true,
      apiKeyHash: true,
    },
  });

  if (!device || device.apiKeyHash !== hashDeviceKey(key)) return null;
  return device;
}
