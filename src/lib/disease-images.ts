import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function uploadDir() {
  return path.resolve(process.env.DISEASE_IMAGE_UPLOAD_DIR ?? ".data/disease-predictions");
}

export function validateDiseaseImage(file: Blob) {
  if (!(file.type in extensions)) {
    throw new Error("Upload a JPEG, PNG, or WebP image");
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be between 1 byte and 10 MB");
  }
}

export async function saveDiseaseImage(file: Blob) {
  validateDiseaseImage(file);
  await mkdir(uploadDir(), { recursive: true });
  const imageRef = `${randomUUID()}.${extensions[file.type]}`;
  await writeFile(path.join(uploadDir(), imageRef), Buffer.from(await file.arrayBuffer()));
  return { imageRef, imageMimeType: file.type };
}

export async function deleteDiseaseImage(imageRef: string) {
  await rm(diseaseImagePath(imageRef), { force: true });
}

export function diseaseImagePath(imageRef: string) {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(imageRef)) {
    throw new Error("Invalid disease image reference");
  }
  return path.join(uploadDir(), imageRef);
}
