import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { authSessions } from "@/db/infrastructure";
import { getCurrentSession } from "@/lib/auth/session";

export async function DELETE() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });
  await db.delete(authSessions).where(eq(authSessions.userId, session.userId));
  const store = await cookies();
  store.set("salesteam_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return Response.json({ ok: true });
}
