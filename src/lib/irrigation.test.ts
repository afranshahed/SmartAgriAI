import assert from "node:assert/strict";
import test from "node:test";
import {
  decidePotIrrigation,
  validatePotIrrigationThresholds,
} from "./irrigation";

test("AUTO mode turns pump on at 29% and at the 30% ON threshold", () => {
  const decision = decidePotIrrigation({
    moisture: 29,
    config: {
      irrigationMode: "AUTO",
      moistureOnThreshold: 30,
      moistureOffThreshold: 50,
      pumpState: "off",
    },
  });

  assert.equal(decision.pumpState, "on");
  assert.equal(decision.changed, true);
  assert.equal(decision.reason, "SOIL_DRY");

  const atThreshold = decidePotIrrigation({
    moisture: 30,
    config: { irrigationMode: "AUTO", moistureOnThreshold: 30, moistureOffThreshold: 50, pumpState: "off" },
  });
  assert.equal(atThreshold.pumpState, "on");
});

test("AUTO mode turns a dry pot on", () => {
  const decision = decidePotIrrigation({
    moisture: 25,
    config: { irrigationMode: "AUTO", moistureOnThreshold: 30, moistureOffThreshold: 50, pumpState: "off" },
  });

  assert.equal(decision.pumpState, "on");
  assert.equal(decision.reason, "SOIL_DRY");
});

test("AUTO mode turns pump off at the 50% OFF threshold", () => {
  const decision = decidePotIrrigation({
    moisture: 50,
    config: {
      irrigationMode: "AUTO",
      moistureOnThreshold: 30,
      moistureOffThreshold: 50,
      pumpState: "on",
    },
  });

  assert.equal(decision.pumpState, "off");
  assert.equal(decision.changed, true);
});

test("AUTO mode keeps an ON pump on at 49% and an OFF pump off at 60%", () => {
  const stillOn = decidePotIrrigation({
    moisture: 49,
    config: { irrigationMode: "AUTO", moistureOnThreshold: 30, moistureOffThreshold: 50, pumpState: "on" },
  });
  const stillOff = decidePotIrrigation({
    moisture: 60,
    config: { irrigationMode: "AUTO", moistureOnThreshold: 30, moistureOffThreshold: 50, pumpState: "off" },
  });
  assert.equal(stillOn.pumpState, "on");
  assert.equal(stillOn.changed, false);
  assert.equal(stillOff.pumpState, "off");
  assert.equal(stillOff.changed, false);
});

test("AUTO mode uses hysteresis inside the threshold band", () => {
  const decision = decidePotIrrigation({
    moisture: 40,
    config: {
      irrigationMode: "AUTO",
      moistureOnThreshold: 30,
      moistureOffThreshold: 50,
      pumpState: "on",
    },
  });

  assert.equal(decision.pumpState, "on");
  assert.equal(decision.changed, false);
});

test("MANUAL mode preserves the explicit pump state", () => {
  const decision = decidePotIrrigation({
    moisture: 25,
    config: {
      irrigationMode: "MANUAL",
      moistureOnThreshold: 30,
      moistureOffThreshold: 50,
      pumpState: "off",
    },
  });

  assert.equal(decision.pumpState, "off");
  assert.equal(decision.mode, "MANUAL");
  assert.equal(decision.reason, "MANUAL_MODE");

  const manualOnAtHighMoisture = decidePotIrrigation({
    moisture: 60,
    config: { irrigationMode: "MANUAL", moistureOnThreshold: 30, moistureOffThreshold: 50, pumpState: "on" },
  });
  assert.equal(manualOnAtHighMoisture.pumpState, "on");
  assert.equal(manualOnAtHighMoisture.changed, false);

  const manualOff = decidePotIrrigation({
    moisture: 20,
    config: { irrigationMode: "MANUAL", moistureOnThreshold: 30, moistureOffThreshold: 50, pumpState: "off" },
  });
  assert.equal(manualOff.pumpState, "off");
});

test("switching to AUTO evaluates the latest confirmed state while MANUAL does not", () => {
  const manual = decidePotIrrigation({
    moisture: 60,
    config: { irrigationMode: "MANUAL", moistureOnThreshold: 30, moistureOffThreshold: 50, pumpState: "on" },
  });
  assert.equal(manual.pumpState, "on");

  const auto = decidePotIrrigation({
    moisture: 60,
    config: { ...manual, irrigationMode: "AUTO", moistureOnThreshold: 30, moistureOffThreshold: 50 },
  });
  assert.equal(auto.pumpState, "off");
  assert.equal(auto.changed, true);
});

test("different pots retain independent thresholds and pump states", () => {
  const dryPot = decidePotIrrigation({
    moisture: 35,
    config: { irrigationMode: "AUTO", moistureOnThreshold: 40, moistureOffThreshold: 70, pumpState: "off" },
  });
  const wetPot = decidePotIrrigation({
    moisture: 35,
    config: { irrigationMode: "AUTO", moistureOnThreshold: 20, moistureOffThreshold: 45, pumpState: "on" },
  });
  assert.equal(dryPot.pumpState, "on");
  assert.equal(wetPot.pumpState, "on");
  assert.equal(wetPot.changed, false);
});

test("threshold validation requires ON threshold below OFF threshold", () => {
  assert.equal(validatePotIrrigationThresholds(30, 50), true);
  assert.equal(validatePotIrrigationThresholds(50, 50), false);
  assert.equal(validatePotIrrigationThresholds(-1, 50), false);
  assert.equal(validatePotIrrigationThresholds(30, 101), false);
  assert.throws(
    () =>
      decidePotIrrigation({
        moisture: 25,
        config: {
          irrigationMode: "AUTO",
          moistureOnThreshold: 50,
          moistureOffThreshold: 30,
          pumpState: "off",
        },
      }),
    /moistureOnThreshold must be less than moistureOffThreshold/,
  );
});
