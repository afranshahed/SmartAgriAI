/**
 * SmartAgriAI ESP32 IoT Node Simulator
 *
 * Acts as a software ESP32 for Phase 5:
 * - sends garden-level temperature and humidity
 * - sends pot-level soil moisture for the configured database Pot IDs
 *
 * Run with:
 *   node simulator.js
 *
 * Optional env:
 *   API_URL=http://localhost:3000
 *   DEVICE_ID=<registered hardwareId, not the database Device primary key>
 *   DEVICE_KEY=<key returned when the device was registered>
 *   POT_IDS=<comma-separated database Pot IDs in the device's garden>
 */

const { loadEnvConfig } = require("@next/env");
const path = require("node:path");

// `node simulator.js` runs outside Next.js, so load .env using Next's own
// environment loader. Resolve from this file, not process.cwd(), so the
// scripts/simulate.ts wrapper works when launched from scripts/ too.
// Explicit shell variables still take precedence.
loadEnvConfig(path.resolve(__dirname));

const BACKEND_URL = process.env.API_URL || process.env.BASE_URL || "http://localhost:3000";
const DEVICE_ID = process.env.DEVICE_ID;
const DEVICE_KEY = process.env.DEVICE_KEY;
const POT_IDS = (process.env.POT_IDS || "")
  .split(",")
  .map((potId) => potId.trim())
  .filter(Boolean);

if (!DEVICE_ID || !DEVICE_KEY || POT_IDS.length === 0) {
  throw new Error(
    "DEVICE_ID (registered hardwareId), DEVICE_KEY, and POT_IDS (comma-separated database Pot IDs) are required.",
  );
}

const potStates = Object.fromEntries(
  POT_IDS.map((potId, index) => [potId, {
    moisture: [42, 55, 31][index % 3],
    pump: false,
  }]),
);

let temperature = 28.5;
let humidity = 65;

console.log("----------------------------------------------------");
console.log(`SmartAgriAI ESP32 Simulator started [Device hardwareId: ${DEVICE_ID}]`);
console.log(`Mapped Pots: ${POT_IDS.join(", ")}`);
console.log(`Posting to: ${BACKEND_URL}/api/iot/ingest`);
console.log(`Polling:    ${BACKEND_URL}/api/iot/commands`);
console.log("----------------------------------------------------");

async function postIngest(payload) {
  const res = await fetch(`${BACKEND_URL}/api/iot/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-key": DEVICE_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function fetchCommands() {
  const res = await fetch(`${BACKEND_URL}/api/iot/commands?deviceId=${encodeURIComponent(DEVICE_ID)}`, {
    headers: {
      "x-device-key": DEVICE_KEY,
    },
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  return data.commands || [];
}

async function acknowledgeCommand(commandId, success = true, error) {
  const res = await fetch(`${BACKEND_URL}/api/iot/commands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-key": DEVICE_KEY,
    },
    body: JSON.stringify({
      deviceId: DEVICE_ID,
      commandId,
      success,
      error,
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function processCommands() {
  try {
    const commands = await fetchCommands();
    for (const command of commands) {
      const state = potStates[command.potId];
      if (!state) {
        await acknowledgeCommand(command.id, false, `Unknown pot ${command.potId}`);
        console.warn(`[COMMAND FAILED] pot=${command.potId} command=${command.id}: unmapped pot`);
        continue;
      }

      state.pump = command.command === "PUMP_ON";
      const result = await acknowledgeCommand(command.id, true);
      console.log(
        `[COMMAND ACK] device=${DEVICE_ID} pot=${command.potId} relay=${state.pump ? "ON" : "OFF"} mode=${command.mode} result=${result.success}`,
      );
    }
  } catch (err) {
    console.warn(`Command polling failed (${BACKEND_URL})... ${err.message}`);
  }
}

function tickEnvironment() {
  temperature = Math.round((temperature + (Math.random() - 0.45) * 0.4) * 10) / 10;

  for (const state of Object.values(potStates)) {
    if (state.pump) {
      state.moisture = Math.min(85, state.moisture + 4);
    } else if (Math.random() > 0.35) {
      state.moisture = Math.max(15, state.moisture - 1);
    }
  }
}

async function sendTelemetry() {
  tickEnvironment();
  humidity = Math.round(Math.min(95, Math.max(20, humidity + (Math.random() - 0.5) * 1.5)) * 10) / 10;

  try {
    const response = await postIngest({
      // The API accepts deviceId for legacy clients, but hardwareId is the
      // device's registered wire identifier and is used by the ESP32 too.
      hardwareId: DEVICE_ID,
      temperature,
      humidity,
      readings: Object.entries(potStates).map(([potId, state]) => ({
        potId,
        soil_moisture: state.moisture,
        pump: state.pump,
      })),
    });

    const summary = Object.entries(potStates)
      .map(([potId, state]) => `${potId}: ${state.moisture}%`)
      .join(" | ");
    console.log(
      `[TELEMETRY SENT] device=${DEVICE_ID} temp=${temperature}C humidity=${humidity}% | ${summary} | saved=${response.saved}`,
    );
  } catch (err) {
    console.warn(`[TELEMETRY ERROR] device=${DEVICE_ID} backend=${BACKEND_URL}: ${err.message}`);
  }
}

setInterval(sendTelemetry, 5000);
setInterval(processCommands, 2000);
sendTelemetry();
processCommands();
