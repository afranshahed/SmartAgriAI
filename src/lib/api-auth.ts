import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Replaces the Express `requireAuth` middleware. Call at the top of a
 * protected route handler. Returns the userId, or a 401 NextResponse to
 * short-circuit. Usage:
 *
 *   const gate = await requireUser();
 *   if (gate instanceof NextResponse) return gate;
 *   const userId = gate;
 */
export async function requireUser(): Promise<string | NextResponse> {
  let session;
  try {
    session = await auth();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("outside a request scope")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session.user.id;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal Server Error") {
  return NextResponse.json({ error: message }, { status: 500 });
}
