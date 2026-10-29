export interface GardenAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  gardenId: string;
  potId?: string;
  plantId?: string;
}

type AlertInput = {
  gardenId: string;
  pots: { id: string; label: string; plant: { id: string; commonName: string } | null; moisture: number | null; moistureOnThreshold: number }[];
  devices: { id: string; name: string; status: string }[];
  weather: { current: { rain: number; rainProb: number } } | null;
  latestPredictions: { potId: string; plantId: string; predictedDisease: string; className: string | null }[];
  failedCommands: { id: string; potId: string; error: string | null }[];
};

export function buildGardenAlerts(input: AlertInput): GardenAlert[] {
  const alerts: GardenAlert[] = [];
  for (const pot of input.pots) {
    if (pot.moisture != null && pot.moisture <= pot.moistureOnThreshold) {
      alerts.push({
        id: `dry-${pot.id}`, severity: "critical", title: "Critically dry soil",
        message: `${pot.label} is at ${pot.moisture}% (pump-on threshold ${pot.moistureOnThreshold}%).`,
        gardenId: input.gardenId, potId: pot.id, plantId: pot.plant?.id,
      });
    }
  }
  for (const device of input.devices) {
    if (device.status === "OFFLINE") {
      alerts.push({ id: `offline-${device.id}`, severity: "warning", title: "Device offline", message: `${device.name} has not checked in recently.`, gardenId: input.gardenId });
    }
  }
  if (input.weather && (input.weather.current.rain > 0 || input.weather.current.rainProb >= 70)) {
    alerts.push({ id: "rain", severity: "info", title: "Rain expected", message: `Current precipitation ${input.weather.current.rain} mm; rain probability ${input.weather.current.rainProb}%.`, gardenId: input.gardenId });
  }
  for (const prediction of input.latestPredictions) {
    const healthy = (prediction.className ?? prediction.predictedDisease).toLowerCase().includes("healthy");
    if (!healthy) alerts.push({ id: `disease-${prediction.potId}`, severity: "warning", title: "Disease detected", message: prediction.predictedDisease, gardenId: input.gardenId, potId: prediction.potId, plantId: prediction.plantId });
  }
  for (const command of input.failedCommands) {
    alerts.push({ id: `pump-failed-${command.id}`, severity: "critical", title: "Pump command failed", message: command.error ?? "The device reported a failed pump command.", gardenId: input.gardenId, potId: command.potId });
  }
  return alerts;
}
