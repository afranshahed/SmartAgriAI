// TASK: Domain CRUD — Device delete by id.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const device = await prisma.device.findFirst({
    where: { id, garden: { userId: gate } },
    select: { id: true },
  });
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  await prisma.device.delete({ where: { id: device.id } });
  return NextResponse.json({ success: true });
}
