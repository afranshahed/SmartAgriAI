import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("Telegram delivery worker rejects requests without the worker secret", async () => {
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const response = await GET(new Request("https://example.test/api/cron/telegram-deliveries"));
    assert.equal(response.status, 401);
  } finally {
    if (previous) process.env.CRON_SECRET = previous;
  }
});
