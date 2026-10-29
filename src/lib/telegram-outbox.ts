import "server-only";

import type { TelegramDelivery } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendTelegramText, type TelegramSendResult } from "@/lib/telegram";
export { enqueueTelegramDelivery, type EnqueueTelegramDelivery } from "@/lib/telegram-delivery-enqueue";

export const MAX_DELIVERY_ATTEMPTS = 6;
export const DELIVERY_LEASE_MS = 60_000;
export const DEFAULT_WORKER_BATCH_SIZE = 10;

export function calculateRetryDelayMs(attemptCount: number, random = Math.random()) {
  const exponential = Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attemptCount - 1));
  // Keep retry bursts from synchronizing while remaining bounded and testable.
  return Math.round(exponential * (0.75 + Math.max(0, Math.min(1, random)) * 0.5));
}

export function errorCodeForTelegramResult(result: Exclude<TelegramSendResult, { ok: true }>) {
  return result.providerCode ?? result.reason.toUpperCase();
}

export function isPermanentTelegramFailure(result: Exclude<TelegramSendResult, { ok: true }>) {
  if (result.reason === "configuration" || result.reason === "invalid-message") return true;
  // Telegram 4xx errors other than rate limits are not helped by retrying.
  return /^(HTTP|API)_(400|401|403|404)$/.test(result.providerCode ?? "");
}

type DeliveryStore = Pick<typeof prisma, "telegramDelivery">;

export async function claimDueTelegramDeliveries(
  store: DeliveryStore = prisma,
  options: { now?: Date; limit?: number; leaseMs?: number } = {},
) {
  const now = options.now ?? new Date();
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_WORKER_BATCH_SIZE, 25));
  const leaseExpiresAt = new Date(now.getTime() + (options.leaseMs ?? DELIVERY_LEASE_MS));
  const candidates = await store.telegramDelivery.findMany({
    where: {
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "PROCESSING", leaseExpiresAt: { lte: now } },
      ],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit * 2,
  });

  const claimed: TelegramDelivery[] = [];
  for (const candidate of candidates) {
    if (claimed.length === limit) break;
    // The conditional update is the atomic claim. A concurrent worker will
    // observe count=0 once another worker has changed the row to PROCESSING.
    const updated = await store.telegramDelivery.updateMany({
      where: {
        id: candidate.id,
        OR: [
          { status: "PENDING", nextAttemptAt: { lte: now } },
          { status: "PROCESSING", leaseExpiresAt: { lte: now } },
        ],
      },
      data: {
        status: "PROCESSING",
        attemptCount: { increment: 1 },
        lastAttemptAt: now,
        leaseExpiresAt,
      },
    });
    if (updated.count !== 1) continue;
    const claimedDelivery = await store.telegramDelivery.findUnique({ where: { id: candidate.id } });
    if (claimedDelivery) claimed.push(claimedDelivery);
  }
  return claimed;
}

export async function processTelegramDelivery(
  delivery: TelegramDelivery,
  store: DeliveryStore = prisma,
  send: (text: string) => Promise<TelegramSendResult> = sendTelegramText,
  now = new Date(),
) {
  const result = await send(delivery.messageText);
  const activeClaim = { id: delivery.id, status: "PROCESSING" as const, leaseExpiresAt: { gt: now } };

  if (result.ok) {
    await store.telegramDelivery.updateMany({
      where: activeClaim,
      data: {
        status: "SENT",
        sentAt: now,
        leaseExpiresAt: null,
        lastErrorCode: null,
        providerMessageId: result.providerMessageId ?? null,
      },
    });
    return { status: "sent" as const };
  }

  const errorCode = errorCodeForTelegramResult(result);
  const terminal = isPermanentTelegramFailure(result) || delivery.attemptCount >= MAX_DELIVERY_ATTEMPTS;
  await store.telegramDelivery.updateMany({
    where: activeClaim,
    data: terminal
      ? { status: "FAILED", leaseExpiresAt: null, lastErrorCode: errorCode, nextAttemptAt: now }
      : {
          status: "PENDING",
          leaseExpiresAt: null,
          lastErrorCode: errorCode,
          nextAttemptAt: new Date(now.getTime() + calculateRetryDelayMs(delivery.attemptCount)),
        },
  });
  return { status: terminal ? "failed" as const : "retry" as const, errorCode };
}

export async function runTelegramDeliveryWorker(
  store: DeliveryStore = prisma,
  send: (text: string) => Promise<TelegramSendResult> = sendTelegramText,
  options: { now?: Date; limit?: number } = {},
) {
  const now = options.now ?? new Date();
  const deliveries = await claimDueTelegramDeliveries(store, { now, limit: options.limit });
  const outcomes = await Promise.all(deliveries.map((delivery) => processTelegramDelivery(delivery, store, send, now)));
  return {
    claimed: deliveries.length,
    sent: outcomes.filter((outcome) => outcome.status === "sent").length,
    retried: outcomes.filter((outcome) => outcome.status === "retry").length,
    failed: outcomes.filter((outcome) => outcome.status === "failed").length,
  };
}
