// Crop health score (0–100). Ported from smartagriai-main farmController.getHealthScore.
// Combines latest environmental readings with the most recent disease-report
// contribution into a single weighted average.

export interface HealthInputs {
  moisture?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  diseaseScore?: number | null; // 0–100, 100 == healthy
}

export interface HealthScoreResult {
  healthScore: number;
  factors: {
    moisture: number;
    temperature: number;
    humidity: number;
    diseaseScore: number;
  };
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

export function computeHealthScore(inputs: HealthInputs): HealthScoreResult {
  const moistureScore = clamp(Number(inputs.moisture ?? 0));
  const humidityScore = clamp(Number(inputs.humidity ?? 65));

  const temp = Number(inputs.temperature ?? 25);
  let tempScore = 100;
  if (temp < 15 || temp > 40) tempScore = 50;
  else if (temp < 20 || temp > 30) tempScore = 80;

  const diseaseScore = clamp(Number(inputs.diseaseScore ?? 100));

  const finalScore =
    (moistureScore + tempScore + humidityScore + diseaseScore) / 4;

  return {
    healthScore: Number(finalScore.toFixed(2)),
    factors: {
      moisture: moistureScore,
      temperature: temp,
      humidity: humidityScore,
      diseaseScore,
    },
  };
}
