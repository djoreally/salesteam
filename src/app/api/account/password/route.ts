import { eq } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, users } from "@/db/infrastructure";
import { getCurrentSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { currentPassword?: string; newPassword?: string };
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 10) return Response.json({ error: "New password must be at least 10 characters." }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user || !(await verifyPassword(currentPassword, user.hashedPassword))) {
    return Response.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const hashedPassword = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ hashedPassword, updatedAt: new Date() }).where(eq(users.id, session.userId));
    await tx.delete(authSessions).where(eq(authSessions.userId, session.userId));
  });

  return Response.json({ ok: true, signedOut: true });
}
