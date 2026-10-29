// TASK: Proposal Feature 2 support — Sensor/Device registration.
// WHAT: Registers an ESP32/sensor and returns a one-time plaintext device key
//       (only its hash is stored) used to authenticate /api/iot/ingest posts.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { generateDeviceKey } from "@/lib/device-key";

export async function GET(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const { searchParams } = new URL(req.url);
  const gardenId = searchParams.get("gardenId") || undefined;
  const devices = await prisma.device.findMany({
    where: {
      ...(gardenId ? { gardenId } : {}),
      garden: { userId: gate },
    },
    orderBy: { createdAt: "desc" },
    include: { garden: { select: { name: true } } },
    // Never expose apiKeyHash.
    omit: { apiKeyHash: true },
  });
  return NextResponse.json(devices);
}

const schema = z.object({
  gardenId: z.string().min(1),
  hardwareId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z
    .enum([
      "esp32_node",
      "dht22",
      "dht11",
      "soil_moisture",
      "rain",
      "ldr",
      "water_flow",
      "solenoid_valve",
      "camera",
    ])
    .default("esp32_node"),
});

export async function POST(req: Request) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid device data" }, { status: 400 });
    }
    const garden = await prisma.garden.findFirst({
      where: { id: parsed.data.gardenId, userId },
    });
    if (!garden) {
      return NextResponse.json({ error: "Garden not found" }, { status: 404 });
    }

    const { plain, hash } = generateDeviceKey();
    const device = await prisma.device.create({
      data: { ...parsed.data, userId, apiKeyHash: hash },
      omit: { apiKeyHash: true },
    });

    // Plaintext key is returned exactly once — store it on the ESP32.
    return NextResponse.json({ device, deviceKey: plain }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A device with this hardware ID already exists" },
        { status: 409 },
      );
    }
    console.error("Device create error:", error);
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
}
