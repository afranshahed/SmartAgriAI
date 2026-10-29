import type { TelegramDeliveryEventType } from "@prisma/client";

type PreferenceName =
  | "PUMP_ACKNOWLEDGED"
  | "PUMP_FAILED"
  | "DISEASE_ANALYSIS_COMPLETED"
  | "DEVICE_OFFLINE"
  | "DEVICE_RECOVERED";

const ENVIRONMENT_KEYS: Record<PreferenceName, string> = {
  PUMP_ACKNOWLEDGED: "TELEGRAM_NOTIFY_PUMP_ACKNOWLEDGED",
  PUMP_FAILED: "TELEGRAM_NOTIFY_PUMP_FAILED",
  DISEASE_ANALYSIS_COMPLETED: "TELEGRAM_NOTIFY_DISEASE_ANALYSIS",
  DEVICE_OFFLINE: "TELEGRAM_NOTIFY_DEVICE_OFFLINE",
  DEVICE_RECOVERED: "TELEGRAM_NOTIFY_DEVICE_RECOVERED",
};

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() !== "false";
}

/**
 * The configured Telegram chat is global, so preferences are global too.
 * Every category defaults on; only an explicit `false` disables a category.
 */
export function isTelegramEventEnabled(eventType: TelegramDeliveryEventType) {
  return enabled(process.env[ENVIRONMENT_KEYS[eventType as PreferenceName]]);
}
