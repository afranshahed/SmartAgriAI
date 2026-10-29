import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  formatDiseaseAnalysisNotification,
  formatDeviceOfflineNotification,
  formatDeviceRecoveredNotification,
  formatPumpAcknowledgementNotification,
  formatPumpFailureNotification,
} from "./business-notifications";

const eventTime = new Date("2026-10-28T06:00:00.000Z");
test("confirmed pump ON and OFF messages state only the acknowledged action", () => {
  const on = formatPumpAcknowledgementNotification({ gardenName: "Roof garden", potLabel: "Tomato bed", command: "PUMP_ON", mode: "AUTO", occurredAt: eventTime, decisionMoisture: 24 });
  const off = formatPumpAcknowledgementNotification({ gardenName: "Roof garden", potLabel: "Tomato bed", command: "PUMP_OFF", mode: "MANUAL", occurredAt: eventTime });
  assert.match(on, /Pump started/);
  assert.match(on, /Roof garden \/ Tomato bed/);
  assert.match(on, /Automatic mode/);
  assert.match(on, /24%/);
  assert.match(off, /Pump stopped/);
  assert.match(off, /Manual mode/);
});

test("failure and disease messages use neutral, verified wording", () => {
  const failure = formatPumpFailureNotification({ gardenName: "Roof garden", potLabel: "Tomato bed", command: "PUMP_ON", occurredAt: eventTime, error: "relay rejected command" });
  assert.match(failure, /Pump command failed/);
  assert.match(failure, /device reported failure/);
  const text = formatDiseaseAnalysisNotification({
    gardenName: "Roof garden", potLabel: "Tomato bed", predictedDisease: "Early blight", confidence: 0.91, occurredAt: eventTime,
  });
  assert.match(text, /^Plant disease analysis completed/);
  assert.match(text, /Early blight \(91% confidence\)/);
  assert.doesNotMatch(text, /critical/i);

});

test("device status wording describes backend telemetry receipt, not physical health", () => {
  const offline = formatDeviceOfflineNotification({ gardenName: "Roof garden", deviceName: "ESP32", lastSeenAt: eventTime, thresholdSeconds: 900 });
  const recovered = formatDeviceRecoveredNotification({ gardenName: "Roof garden", deviceName: "ESP32", receivedAt: eventTime });
  assert.match(offline, /telemetry appears offline/);
  assert.match(offline, /Last successful backend receipt/);
  assert.match(recovered, /telemetry recovered/);
  assert.doesNotMatch(offline, /relay failure|sensor failure/i);
});

test("command creation and repeated sensor ingestion cannot send Telegram", () => {
  const deviceCommands = readFileSync(resolve(process.cwd(), "src/lib/device-commands.ts"), "utf8");
  const ingest = readFileSync(resolve(process.cwd(), "src/app/api/iot/ingest/route.ts"), "utf8");
  assert.match(deviceCommands, /enqueueTelegramDelivery/);
  assert.doesNotMatch(deviceCommands, /sendTelegramText/);
  assert.doesNotMatch(ingest, /telegram-outbox|sendTelegramText/);
});

test("pump and disease producers enqueue durable event keys inside their transactions", () => {
  const commands = readFileSync(resolve(process.cwd(), "src/lib/device-commands.ts"), "utf8");
  const disease = readFileSync(resolve(process.cwd(), "src/app/api/disease-detection/analyze/route.ts"), "utf8");
  assert.match(commands, /eventKey: `pump:\$\{command\.id\}:acknowledged`/);
  assert.match(commands, /eventKey: `pump:\$\{command\.id\}:failed`/);
  assert.match(disease, /eventKey: `disease-analysis:\$\{history\.id\}`/);
});
