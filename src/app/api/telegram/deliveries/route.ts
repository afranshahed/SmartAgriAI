import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

// Delivery history is intentionally separate from the in-app notification feed.
// Do not return destinationRef or messageText: both are server-side delivery data.
export async function GET() {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;

  const deliveries = await prisma.telegramDelivery.findMany({
    where: { userId: gate },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      eventType: true,
      status: true,
      attemptCount: true,
      lastErrorCode: true,
      createdAt: true,
      sentAt: true,
      lastAttemptAt: true,
    },
  });
  return NextResponse.json(deliveries);
}
