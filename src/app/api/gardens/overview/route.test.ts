import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("global gardens overview rejects requests without a logged-in user", async () => {
  const response = await GET();
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "Unauthorized");
});
