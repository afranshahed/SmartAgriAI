import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("delivery history is user-scoped and excludes server-only delivery payloads", () => {
  const route = readFileSync(resolve(process.cwd(), "src/app/api/telegram/deliveries/route.ts"), "utf8");
  assert.match(route, /where: \{ userId: gate \}/);
  assert.doesNotMatch(route, /messageText: true|destinationRef: true/);
});
