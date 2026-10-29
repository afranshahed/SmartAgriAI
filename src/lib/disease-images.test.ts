import assert from "node:assert/strict";
import test from "node:test";
import { rm } from "node:fs/promises";
import { diseaseImagePath, saveDiseaseImage, validateDiseaseImage } from "./disease-images";

test("stores one validated private image reference", async () => {
  process.env.DISEASE_IMAGE_UPLOAD_DIR = ".data/disease-predictions-test";
  const image = new Blob(["leaf image"], { type: "image/png" });
  const saved = await saveDiseaseImage(image);
  assert.match(saved.imageRef, /^[a-f0-9-]+\.png$/);
  assert.equal(saved.imageMimeType, "image/png");
  assert.match(diseaseImagePath(saved.imageRef), /disease-predictions-test/);
  await rm(".data/disease-predictions-test", { recursive: true, force: true });
});

test("rejects unsupported and oversized upload types", () => {
  assert.throws(() => validateDiseaseImage(new Blob(["x"], { type: "text/plain" })));
  assert.throws(() => validateDiseaseImage(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/jpeg" })));
});
