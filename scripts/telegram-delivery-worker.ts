import { prisma } from "../src/lib/db";
import { runTelegramDeliveryWorkerUntilIdle } from "../src/lib/telegram-outbox";

/**
 * One-shot process for Render Cron (and safe manual backlog processing).
 * It talks directly to PostgreSQL; no public cron URL or shared HTTP secret is
 * required. It always disconnects so the cron process can exit cleanly.
 */
async function main() {
  const result = await runTelegramDeliveryWorkerUntilIdle();
  console.info("Telegram delivery worker completed", result);
}

main()
  .catch((error: unknown) => {
    console.error("Telegram delivery worker failed", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
