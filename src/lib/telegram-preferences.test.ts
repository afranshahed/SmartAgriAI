import assert from "node:assert/strict";
import test from "node:test";
import { isTelegramEventEnabled } from "./telegram-preferences";

test("global Telegram categories default enabled and require explicit false to disable", () => {
  const key = "TELEGRAM_NOTIFY_DEVICE_OFFLINE";
  const previous = process.env[key];
  delete process.env[key];
  assert.equal(isTelegramEventEnabled("DEVICE_OFFLINE"), true);
  process.env[key] = "false";
  assert.equal(isTelegramEventEnabled("DEVICE_OFFLINE"), false);
  if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
});
