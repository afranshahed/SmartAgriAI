import "server-only";

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_TELEGRAM_TEXT_LENGTH = 4_096;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type TelegramConfig = {
  botToken: string;
  chatId: string;
};

export type TelegramSendResult =
  | { ok: true; providerMessageId?: string }
  | {
      ok: false;
      reason: "configuration" | "http" | "api" | "network" | "timeout" | "invalid-message";
      providerCode?: string;
    };

type TelegramApiResponse = {
  ok?: unknown;
  result?: { message_id?: unknown };
  error_code?: unknown;
};

export type SendTelegramTextOptions = {
  /** Intended for tests; production callers should use environment configuration. */
  config?: TelegramConfig | null;
  /** Intended for tests; production callers use the platform fetch implementation. */
  fetchImpl?: FetchLike;
  /** Intended for tests; production callers use the bounded default timeout. */
  timeoutMs?: number;
};

function isValidBotToken(value: string) {
  return /^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(value);
}

function isValidChatId(value: string) {
  return /^-?\d+$/.test(value) || /^@[A-Za-z][A-Za-z0-9_]{4,}$/.test(value);
}

/**
 * Loads only syntactically valid server-side Telegram configuration. Values are
 * deliberately never included in errors or return values.
 */
export function getTelegramConfig(
  env: { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string } = process.env as {
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
  },
): TelegramConfig | null {
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId || !isValidBotToken(botToken) || !isValidChatId(chatId)) {
    return null;
  }

  return { botToken, chatId };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Sends a plain-text message to the configured Telegram chat without exposing provider details. */
export async function sendTelegramText(
  text: string,
  options: SendTelegramTextOptions = {},
): Promise<TelegramSendResult> {
  if (!text.trim() || text.length > MAX_TELEGRAM_TEXT_LENGTH) {
    return { ok: false, reason: "invalid-message" };
  }

  const config = options.config ?? getTelegramConfig();
  if (!config || !isValidBotToken(config.botToken) || !isValidChatId(config.chatId)) {
    return { ok: false, reason: "configuration" };
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await (options.fetchImpl ?? fetch)(
      `${TELEGRAM_API_BASE_URL}/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: config.chatId, text }),
        signal: controller.signal,
      },
    );

    let payload: TelegramApiResponse | null = null;
    try {
      payload = (await response.json()) as TelegramApiResponse;
    } catch {
      payload = null;
    }

    if (!response.ok) return { ok: false, reason: "http", providerCode: `HTTP_${response.status}` };
    if (payload?.ok !== true) {
      const errorCode = typeof payload?.error_code === "number" ? payload.error_code : undefined;
      return { ok: false, reason: "api", providerCode: errorCode ? `API_${errorCode}` : "API" };
    }
    const messageId = payload.result?.message_id;
    return { ok: true, providerMessageId: typeof messageId === "number" || typeof messageId === "string" ? String(messageId) : undefined };
  } catch (error) {
    return { ok: false, reason: isAbortError(error) ? "timeout" : "network" };
  } finally {
    clearTimeout(timeout);
  }
}
