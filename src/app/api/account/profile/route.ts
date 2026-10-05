import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/infrastructure";
import { getCurrentSession } from "@/lib/auth/session";

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = String(body.name ?? "").trim();
  if (name.length < 2 || name.length > 120) return Response.json({ error: "Name must be between 2 and 120 characters." }, { status: 400 });
  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, session.userId));
  return Response.json({ ok: true, name });
}
