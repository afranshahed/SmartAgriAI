import crypto from "node:crypto";

// Device API keys authenticate ESP32 ingestion. We store only a SHA-256
// hash; the plaintext key is shown once at device registration.
export function generateDeviceKey() {
  const plain = `sk_dev_${crypto.randomBytes(24).toString("hex")}`;
  const hash = hashDeviceKey(plain);
  return { plain, hash };
}

export function hashDeviceKey(plain: string) {
  return crypto.createHash("sha256").update(plain).digest("hex");
}
