import "server-only";

type Env = Record<string, string | undefined>;

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDeviceCommandSettings(env: Env = process.env) {
  return {
    ackTimeoutMs: positiveInt(env.DEVICE_COMMAND_ACK_TIMEOUT_SECONDS, 15) * 1_000,
    retryIntervalMs: positiveInt(env.DEVICE_COMMAND_RETRY_INTERVAL_SECONDS, 5) * 1_000,
    maxAttempts: positiveInt(env.DEVICE_COMMAND_MAX_ATTEMPTS, 3),
    maxLifetimeMs: positiveInt(env.DEVICE_COMMAND_MAX_LIFETIME_SECONDS, 30) * 1_000,
    communicationLossFailSafeMs: positiveInt(env.DEVICE_COMMUNICATION_LOSS_FAILSAFE_SECONDS, 60) * 1_000,
  };
}
