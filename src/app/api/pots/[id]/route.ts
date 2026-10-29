// TASK: Domain CRUD — Pot delete by id.
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
  const result = await prisma.pot.deleteMany({ where: { id, userId: gate } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Pot not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
