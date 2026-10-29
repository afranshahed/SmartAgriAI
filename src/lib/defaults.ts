export const defaultIrrigation = {
  status: "off" as const,
  manualOverride: false,
  threshold: 30,
};

// Default soil-moisture comfort band used by the recommendation engine
// when a plant has no explicit threshold configured.
export const defaultThreshold = {
  soilMoistureMin: 30,
  soilMoistureMax: 70,
  tempDayMin: 18,
  tempDayMax: 32,
  humidityMin: 40,
  humidityMax: 80,
};
