// Bridge from Next.js API routes to the Python FastAPI disease-detection service.

// Default to 127.0.0.1 (IPv4) rather than "localhost": Node's fetch may resolve
// localhost to IPv6 (::1) while the FastAPI service binds IPv4, which surfaces
// as "Disease detection service is unavailable".
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";

export interface AiTreatment {
  immediate: string[];
  organic: string[];
  chemical: string[];
  prevention: string[];
}

export interface AiPrediction {
  disease: string;
  crop: string;
  className: string;
  confidence: number;
  severity: "low" | "medium" | "high";
  symptoms: string[];
  treatment: AiTreatment;
  recommendation: string;
  modelVersion: string;
}

export async function analyzeLeafImage(
  file: Blob,
  filename = "leaf.jpg",
): Promise<AiPrediction> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch(`${AI_SERVICE_URL}/predict`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI service error (${res.status}): ${detail}`);
  }

  return (await res.json()) as AiPrediction;
}

export async function aiServiceHealth(): Promise<{
  status: string;
  labels: number;
} | null> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { status: string; labels: number };
  } catch {
    return null;
  }
}

// Map the AI severity + confidence to a 0–100 health-score contribution
// (healthy => 100; worse disease/severity => lower).
export function healthContributionFromPrediction(p: AiPrediction): number {
  const isHealthy =
    p.className.toLowerCase().includes("healthy") ||
    p.disease.toLowerCase().includes("healthy");
  if (isHealthy) return 100;

  const severityFloor = { low: 70, medium: 45, high: 20 }[p.severity] ?? 50;
  // Higher confidence in a disease => stronger penalty toward the floor.
  return Math.round(100 - (100 - severityFloor) * Math.min(p.confidence, 1));
}
