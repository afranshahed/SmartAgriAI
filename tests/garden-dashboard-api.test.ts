import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/gardens/[id]/dashboard/route";

test("garden dashboard rejects requests without a logged-in user", async () => {
  const response = await GET(new Request("http://localhost/api/gardens/garden-a/dashboard"), { params: Promise.resolve({ id: "garden-a" }) });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "Unauthorized");
});
