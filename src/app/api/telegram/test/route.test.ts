import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

test("Telegram test endpoint rejects unauthenticated requests", async () => {
  const response = await POST();
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});
