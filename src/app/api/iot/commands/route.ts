// PHASE 7: Device command queue for ESP32/simulator polling and acknowledgements.
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice } from "@/lib/device-auth";
import { acknowledgePumpCommand, claimDeviceCommands } from "@/lib/device-commands";

export const runtime = "nodejs";

const ackSchema = z.object({
  deviceId: z.string().min(1).optional(),
  hardwareId: z.string().min(1).optional(),
  commandId: z.string().min(1),
  kind: z.enum(["delivery", "execution"]).default("execution"),
  success: z.boolean().default(true),
  error: z.string().optional(),
});

export async function GET(req: Request) {
  const device = await authenticateDevice(req);
  if (!device) {
    return NextResponse.json({ error: "Invalid device or key" }, { status: 401 });
  }

  const commands = await claimDeviceCommands(device.id);

  return NextResponse.json({
    success: true,
    commands: commands.map((command) => ({ id: command.id, deviceId: command.deviceId, potId: command.potId, command: command.command, mode: command.mode, sequence: command.sequence, expiresAt: command.expiresAt, status: "SENT" })),
  });
}

export async function POST(req: Request) {
  const device = await authenticateDevice(req);
  if (!device) {
    return NextResponse.json({ error: "Invalid device or key" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid command acknowledgement" }, { status: 400 });
  }

  try {
    const result = await acknowledgePumpCommand({
      commandId: parsed.data.commandId,
      deviceId: device.id,
      kind: parsed.data.kind,
      success: parsed.data.success,
      error: parsed.data.error,
    });
    return NextResponse.json({ success: true, command: result.command });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command not found";
    return NextResponse.json(
      { error: message },
      { status: message === "Command not found" ? 404 : 409 },
    );
  }
}
