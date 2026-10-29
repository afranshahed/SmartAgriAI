import type { Prisma, TelegramDeliveryEventType } from "@prisma/client";
import { isTelegramEventEnabled } from "@/lib/telegram-preferences";

export type EnqueueTelegramDelivery = {
  userId: string;
  eventKey: string;
  eventType: TelegramDeliveryEventType;
  eventRef: string;
  messageText: string;
};

/** Adds an idempotent delivery record to an existing business transaction. */
export function enqueueTelegramDelivery(
  tx: Prisma.TransactionClient,
  delivery: EnqueueTelegramDelivery,
) {
  if (!isTelegramEventEnabled(delivery.eventType)) return Promise.resolve({ count: 0 });
  return tx.telegramDelivery.createMany({ data: delivery, skipDuplicates: true });
}
