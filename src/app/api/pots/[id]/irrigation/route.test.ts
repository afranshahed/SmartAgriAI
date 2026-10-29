import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("pot irrigation config rejects unauthorized access", async () => {
  const response = await GET(new Request("http://localhost/api/pots/POT-01/irrigation"), {
    params: Promise.resolve({ id: "POT-01" }),
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Unauthorized");
});
