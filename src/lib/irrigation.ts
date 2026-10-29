// Auto-irrigation decision logic. Ported from smartagriai-main
// farmController.storeSensorData. Pure function: given the current moisture,
// the user's threshold/override config, active schedules, and (optionally) the
// rain probability, decide whether the pump should be on or off and why.

import type { IrrigationStatus, PotIrrigationMode } from "@prisma/client";

export interface IrrigationConfigInput {
  thresholdPercent: number;
  manualOverride: boolean;
  currentStatus: IrrigationStatus;
}

export interface ScheduleInput {
  startTime: string; // "HH:MM"
  durationMinutes: number;
  days: string[];
  enabled: boolean;
}

export interface IrrigationDecision {
  status: IrrigationStatus;
  manualOverride: boolean;
  changed: boolean;
  reason: string;
  mode: "manual" | "scheduled" | "automatic";
}

export interface PotIrrigationConfigInput {
  irrigationMode: PotIrrigationMode;
  moistureOnThreshold: number;
  moistureOffThreshold: number;
  pumpState: IrrigationStatus;
}

export interface PotIrrigationDecision {
  pumpState: IrrigationStatus;
  changed: boolean;
  reason: PotIrrigationReason;
  message: string;
  mode: PotIrrigationMode;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Retained for the legacy user-level scheduled irrigation helper below. Per-pot
// AUTO control intentionally follows only its configured hysteresis thresholds.
const RAIN_SKIP_THRESHOLD = 70;

export type PotIrrigationReason =
  | "MANUAL_MODE"
  | "SOIL_MOISTURE_UNAVAILABLE"
  | "SOIL_DRY"
  | "SOIL_MOISTURE_NORMAL";

export function decideIrrigation(params: {
  moisture: number | undefined;
  config: IrrigationConfigInput;
  schedules: ScheduleInput[];
  rainProb?: number;
  now?: Date;
}): IrrigationDecision {
  const { moisture, config, schedules, rainProb } = params;
  const now = params.now ?? new Date();

  // Manual override wins — respect the user's explicit on/off.
  if (config.manualOverride) {
    return {
      status: config.currentStatus,
      manualOverride: true,
      changed: false,
      reason: "Manual override active",
      mode: "manual",
    };
  }

  const currentDay = DAY_NAMES[now.getDay()];
  const currentMins = now.getHours() * 60 + now.getMinutes();

  let isScheduled = false;
  let scheduleReason = "";
  for (const schedule of schedules) {
    if (!schedule.enabled || !schedule.days.includes(currentDay)) continue;
    const [hours, minutes] = schedule.startTime.split(":").map(Number);
    const startMins = hours * 60 + minutes;
    const endMins = startMins + Number(schedule.durationMinutes);
    if (currentMins >= startMins && currentMins < endMins) {
      isScheduled = true;
      const hh = Math.floor(endMins / 60).toString().padStart(2, "0");
      const mm = (endMins % 60).toString().padStart(2, "0");
      scheduleReason = `Scheduled watering active until ${hh}:${mm}`;
      break;
    }
  }

  const rainImminent = typeof rainProb === "number" && rainProb >= RAIN_SKIP_THRESHOLD;
  const moistureLow = moisture !== undefined && Number(moisture) < config.thresholdPercent;

  let newStatus: IrrigationStatus = "off";
  let reason = "Moisture levels adequate & no schedule active";
  let mode: "scheduled" | "automatic" = "automatic";

  if (isScheduled) {
    newStatus = "on";
    reason = scheduleReason;
    mode = "scheduled";
  } else if (moistureLow && rainImminent) {
    newStatus = "off";
    reason = `Low moisture (${moisture}%) but rain likely (${rainProb}%) — skipping irrigation`;
  } else if (moistureLow) {
    newStatus = "on";
    reason = `Low moisture threshold reached (${moisture}% < ${config.thresholdPercent}%)`;
  }

  return {
    status: newStatus,
    manualOverride: false,
    changed: config.currentStatus !== newStatus,
    reason,
    mode,
  };
}

export function validatePotIrrigationThresholds(
  moistureOnThreshold: number,
  moistureOffThreshold: number,
) {
  return (
    Number.isFinite(moistureOnThreshold) &&
    Number.isFinite(moistureOffThreshold) &&
    moistureOnThreshold >= 0 &&
    moistureOffThreshold <= 100 &&
    moistureOnThreshold < moistureOffThreshold
  );
}

export function decidePotIrrigation(params: {
  moisture: number | undefined;
  config: PotIrrigationConfigInput;
}): PotIrrigationDecision {
  const { moisture, config } = params;

  if (
    !validatePotIrrigationThresholds(
      config.moistureOnThreshold,
      config.moistureOffThreshold,
    )
  ) {
    throw new Error("moistureOnThreshold must be less than moistureOffThreshold");
  }

  if (config.irrigationMode === "MANUAL") {
    return {
      pumpState: config.pumpState,
      changed: false,
      reason: "MANUAL_MODE",
      message: "Manual mode uses the configured pump state.",
      mode: "MANUAL",
    };
  }

  if (moisture === undefined) {
    return {
      pumpState: config.pumpState,
      changed: false,
      reason: "SOIL_MOISTURE_UNAVAILABLE",
      message: "No soil moisture reading is available, so the pump state is unchanged.",
      mode: "AUTO",
    };
  }

  let nextPumpState = config.pumpState;
  let reason: PotIrrigationReason = "SOIL_MOISTURE_NORMAL";
  let message = `Soil moisture is within the configured hysteresis band (${config.moistureOnThreshold}%-${config.moistureOffThreshold}%); the pump state is unchanged.`;
  if (moisture <= config.moistureOnThreshold) {
    nextPumpState = "on";
    reason = "SOIL_DRY";
    message = `Soil moisture ${moisture}% is at or below the ON threshold ${config.moistureOnThreshold}%.`;
  } else if (moisture >= config.moistureOffThreshold) {
    nextPumpState = "off";
    reason = "SOIL_MOISTURE_NORMAL";
    message = `Soil moisture ${moisture}% is at or above the OFF threshold ${config.moistureOffThreshold}%.`;
  }

  return {
    pumpState: nextPumpState,
    changed: config.pumpState !== nextPumpState,
    reason,
    message,
    mode: "AUTO",
  };
}
