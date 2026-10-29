import assert from "node:assert/strict";
import test from "node:test";
import { getTelegramConfig, sendTelegramText, type TelegramConfig } from "./telegram";

const token = "123456:abcdefghijklmnopqrstuvwxyz_ABC";
const chatId = "-1001234567890";
const config: TelegramConfig = { botToken: token, chatId };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("Telegram configuration rejects missing or malformed values without returning secrets", () => {
  assert.equal(getTelegramConfig({}), null);
  assert.equal(getTelegramConfig({ TELEGRAM_BOT_TOKEN: "not-a-token", TELEGRAM_CHAT_ID: "bad id" }), null);
  const result = getTelegramConfig({ TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId });
  assert.deepEqual(result, config);
});

test("Telegram transport reports successful API delivery", async () => {
  let request: RequestInit | undefined;
  const result = await sendTelegramText("Test message", {
    config,
    fetchImpl: async (_url, init) => {
      request = init;
      return response({ ok: true, result: { message_id: 77 } });
    },
  });
  assert.deepEqual(result, { ok: true, providerMessageId: "77" });
  assert.equal(request?.method, "POST");
});

test("Telegram transport handles provider, HTTP, network, and timeout failures without secrets", async () => {
  const apiFailure = await sendTelegramText("Test message", {
    config,
    fetchImpl: async () => response({ ok: false, error_code: 403 }),
  });
  assert.deepEqual(apiFailure, { ok: false, reason: "api", providerCode: "API_403" });

  const httpFailure = await sendTelegramText("Test message", {
    config,
    fetchImpl: async () => response({ ok: true }, 401),
  });
  assert.deepEqual(httpFailure, { ok: false, reason: "http", providerCode: "HTTP_401" });

  const networkFailure = await sendTelegramText("Test message", {
    config,
    fetchImpl: async () => {
      throw new Error(`network failed for ${token} ${chatId}`);
    },
  });
  assert.deepEqual(networkFailure, { ok: false, reason: "network" });

  const timeoutFailure = await sendTelegramText("Test message", {
    config,
    timeoutMs: 1,
    fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }),
  });
  assert.deepEqual(timeoutFailure, { ok: false, reason: "timeout" });
  assert.doesNotMatch(JSON.stringify(networkFailure), new RegExp(`${token}|${chatId}`));
});
