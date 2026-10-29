import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

test("prediction creation rejects unauthenticated uploads before calling AI", async () => {
  const form = new FormData();
  form.append("gardenId", "garden-1");
  form.append("potId", "pot-1");
  form.append("file", new Blob(["image"], { type: "image/png" }), "leaf.png");
  const response = await POST(new Request("http://localhost/api/disease-detection/analyze", { method: "POST", body: form }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "Unauthorized");
});
