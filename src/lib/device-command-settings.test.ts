import test from "node:test";
import assert from "node:assert/strict";
import { getDeviceCommandSettings } from "./device-command-settings";

test("command lifecycle defaults match the reviewed safety limits", () => {
  assert.deepEqual(getDeviceCommandSettings({}), {
    ackTimeoutMs: 15_000,
    retryIntervalMs: 5_000,
    maxAttempts: 3,
    maxLifetimeMs: 30_000,
    communicationLossFailSafeMs: 60_000,
  });
});

test("invalid lifecycle configuration cannot disable the safety defaults", () => {
  const settings = getDeviceCommandSettings({
    DEVICE_COMMAND_ACK_TIMEOUT_SECONDS: "0",
    DEVICE_COMMAND_MAX_ATTEMPTS: "nope",
    DEVICE_COMMUNICATION_LOSS_FAILSAFE_SECONDS: "-1",
  });
  assert.equal(settings.ackTimeoutMs, 15_000);
  assert.equal(settings.maxAttempts, 3);
  assert.equal(settings.communicationLossFailSafeMs, 60_000);
});
