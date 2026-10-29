import type {
  DeviceCommand,
  DeviceCommandType,
  IrrigationStatus,
  PotIrrigationMode,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatPumpAcknowledgementNotification, formatPumpFailureNotification } from "@/lib/business-notifications";
import { enqueueTelegramDelivery } from "@/lib/telegram-delivery-enqueue";

export function pumpStateToCommand(
  pumpState: IrrigationStatus,
): DeviceCommandType {
  return pumpState === "on" ? "PUMP_ON" : "PUMP_OFF";
}

export function commandToPumpState(
  command: DeviceCommandType,
): IrrigationStatus {
  return command === "PUMP_ON" ? "on" : "off";
}

export async function findGardenDevice(gardenId: string, userId: string) {
  return prisma.device.findFirst({
    where: {
      gardenId,
      userId,
      type: "esp32_node",
    },
    orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      gardenId: true,
      userId: true,
      hardwareId: true,
      status: true,
      lastSeenAt: true,
    },
  });
}

export async function queuePumpCommand(params: {
  userId: string;
  gardenId: string;
  deviceId: string;
  potId: string;
  command: DeviceCommandType;
  mode: PotIrrigationMode;
  decisionMoisture?: number;
  onThreshold?: number;
  offThreshold?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const outstanding = await tx.deviceCommand.findMany({
      where: {
        deviceId: params.deviceId,
        potId: params.potId,
        status: { in: ["PENDING", "SENT"] },
      },
      orderBy: { createdAt: "desc" },
    });

    // Never place an opposite relay command behind one the device has already
    // received. The device must acknowledge (or fail) the sent command first;
    // otherwise one poll can execute conflicting commands for the same pot.
    const sent = outstanding.find((item) => item.status === "SENT");
    if (sent) {
      const pendingCommandIds = outstanding
        .filter((item) => item.status === "PENDING")
        .map((item) => item.id);
      if (pendingCommandIds.length > 0) {
        await tx.deviceCommand.updateMany({
          where: { id: { in: pendingCommandIds } },
          data: {
            status: "FAILED",
            error: "Cancelled because another pump command is already executing",
            processedAt: new Date(),
          },
        });
      }
      if (sent.command === params.command) {
        return { command: sent, created: false, blocked: false };
      }
      return { command: sent, created: false, blocked: true };
    }

    const identical = outstanding.find((item) => item.command === params.command);
    if (identical) return { command: identical, created: false, blocked: false };

    // A command that has not been polled can be safely superseded. Commands
    // already SENT must remain ordered: the device may be executing one now.
    await tx.deviceCommand.updateMany({
      where: {
        deviceId: params.deviceId,
        potId: params.potId,
        status: "PENDING",
      },
      data: {
        status: "FAILED",
        error: "Superseded by a newer pump command",
        processedAt: new Date(),
      },
    });

    const command = await tx.deviceCommand.create({ data: params });
    return { command, created: true, blocked: false };
  });
}

export async function acknowledgePumpCommand(params: {
  commandId: string;
  deviceId: string;
  success: boolean;
  error?: string;
}) {
  const command = await prisma.deviceCommand.findFirst({
    where: { id: params.commandId, deviceId: params.deviceId },
  });

  if (!command) {
    throw new Error("Command not found");
  }

  // A retry from the ESP32 after a lost response is safe and must not create
  // another irrigation event. Commands may only be applied after being sent.
  if (command.status === "ACKNOWLEDGED") return { command, notification: null };
  if (command.status !== "SENT") {
    throw new Error("Command has not been dispatched to this device");
  }

  const now = new Date();
  if (!params.success) {
    const pot = await prisma.pot.findUnique({ where: { id: command.potId }, select: { pumpState: true, label: true, garden: { select: { name: true } } } });
    const failed = await prisma.$transaction(async (tx) => {
      const updated = await tx.deviceCommand.update({ where: { id: command.id }, data: { status: "FAILED", error: params.error ?? "Command failed", processedAt: now } });
      await tx.pumpEvent.create({ data: { userId: command.userId, gardenId: command.gardenId, potId: command.potId, deviceId: command.deviceId, commandId: command.id, previousState: pot?.pumpState ?? "off", newState: commandToPumpState(command.command), source: command.mode, status: "FAILED", failureReason: params.error ?? "Command failed", occurredAt: now } });
      if (pot) {
        await enqueueTelegramDelivery(tx, {
          userId: command.userId,
          eventKey: `pump:${command.id}:failed`,
          eventType: "PUMP_FAILED",
          eventRef: command.id,
          messageText: formatPumpFailureNotification({ gardenName: pot.garden.name, potLabel: pot.label, command: command.command, occurredAt: now, error: updated.error }),
        });
      }
      return updated;
    });
    return { command: failed, notification: { success: false as const, occurredAt: now } };
  }

  const pumpState = commandToPumpState(command.command);
  const pot = await prisma.pot.findUnique({ where: { id: command.potId }, select: { pumpState: true, moistureOnThreshold: true, moistureOffThreshold: true, label: true, garden: { select: { name: true } } } });
  if (!pot) throw new Error("Pot not found");
  const updated = await prisma.$transaction(async (tx) => {
    const updatedCommand = await tx.deviceCommand.update({
      where: { id: command.id },
      data: {
        status: "ACKNOWLEDGED",
        processedAt: now,
        acknowledgedAt: now,
        error: null,
      },
    });
    await tx.pot.update({
      where: { id: command.potId },
      data: { pumpState },
    });
    await tx.irrigationEvent.create({
      data: {
        userId: command.userId,
        gardenId: command.gardenId,
        potId: command.potId,
        mode: command.mode === "MANUAL" ? "manual" : "automatic",
        status: pumpState,
        manualOverride: command.mode === "MANUAL",
        reason: `${command.mode} command ${command.command} acknowledged`,
        soilMoisture: command.decisionMoisture,
        onThreshold: command.onThreshold ?? pot.moistureOnThreshold,
        offThreshold: command.offThreshold ?? pot.moistureOffThreshold,
        decision: command.command,
        outcome: "ACKNOWLEDGED",
      },
    });
    await tx.pumpEvent.create({ data: { userId: command.userId, gardenId: command.gardenId, potId: command.potId, deviceId: command.deviceId, commandId: command.id, previousState: pot.pumpState, newState: pumpState, source: command.mode, status: "ACKNOWLEDGED", occurredAt: now } });
    await enqueueTelegramDelivery(tx, {
      userId: command.userId,
      eventKey: `pump:${command.id}:acknowledged`,
      eventType: "PUMP_ACKNOWLEDGED",
      eventRef: command.id,
      messageText: formatPumpAcknowledgementNotification({ gardenName: pot.garden.name, potLabel: pot.label, command: command.command, mode: command.mode, occurredAt: now, decisionMoisture: command.decisionMoisture }),
    });
    return updatedCommand;
  });
  return { command: updated as DeviceCommand, notification: { success: true as const, occurredAt: now } };
}
