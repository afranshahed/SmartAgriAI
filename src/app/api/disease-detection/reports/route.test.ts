import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("prediction history rejects unauthenticated access", async () => {
  const response = await GET(new Request("http://localhost/api/disease-detection/reports?plantId=plant-1"));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "Unauthorized");
});
