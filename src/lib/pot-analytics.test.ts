import assert from "node:assert/strict";
import test from "node:test";
import { bangladeshDateTimeToDate, resolveAnalyticsDateRange } from "./pot-analytics";

test("converts Bangladesh datetime-local values to UTC instants", () => {
  assert.equal(bangladeshDateTimeToDate("2026-10-20T08:30")?.toISOString(), "2026-10-20T02:30:00.000Z");
});

test("accepts a custom interval with an inclusive start and exclusive end", () => {
  const result = resolveAnalyticsDateRange("custom", "2026-10-20T08:30", "2026-10-20T20:45");
  assert.ok("start" in result);
  if ("start" in result) {
    assert.equal(result.start.toISOString(), "2026-10-20T02:30:00.000Z");
    assert.equal(result.end?.toISOString(), "2026-10-20T14:45:00.000Z");
  }
});

test("rejects missing, malformed, and non-increasing custom ranges", () => {
  assert.ok("error" in resolveAnalyticsDateRange("custom", null, "2026-10-20T20:45"));
  assert.ok("error" in resolveAnalyticsDateRange("custom", "not-a-date", "2026-10-20T20:45"));
  assert.ok("error" in resolveAnalyticsDateRange("custom", "2026-10-20T20:45", "2026-10-20T20:45"));
});
