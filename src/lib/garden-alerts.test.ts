import assert from "node:assert/strict";
import test from "node:test";
import { buildGardenAlerts } from "./garden-alerts";

test("builds garden-scoped alerts from real dashboard records", () => {
  const alerts = buildGardenAlerts({
    gardenId: "garden-a",
    pots: [{ id: "pot-a", label: "POT-01", plant: { id: "plant-a", commonName: "Tomato" }, moisture: 20, moistureOnThreshold: 30 }],
    devices: [{ id: "device-a", name: "ESP32", status: "OFFLINE" }],
    weather: { current: { rain: 0, rainProb: 80 } },
    latestPredictions: [{ potId: "pot-a", plantId: "plant-a", predictedDisease: "Leaf Mold", className: "Tomato___Leaf_Mold" }],
    failedCommands: [{ id: "command-a", potId: "pot-a", error: "Valve timeout" }],
  });
  assert.equal(alerts.length, 5);
  assert.ok(alerts.every((alert) => alert.gardenId === "garden-a"));
  assert.deepEqual(alerts.filter((alert) => alert.potId).map((alert) => alert.potId), ["pot-a", "pot-a", "pot-a"]);
});

test("does not create moisture or disease alerts for an empty pot", () => {
  const alerts = buildGardenAlerts({
    gardenId: "garden-a", pots: [{ id: "pot-empty", label: "POT-02", plant: null, moisture: null, moistureOnThreshold: 30 }],
    devices: [], weather: null, latestPredictions: [], failedCommands: [],
  });
  assert.deepEqual(alerts, []);
});
