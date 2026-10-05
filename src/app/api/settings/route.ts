import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, settings } from "@/db/infrastructure";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const [organization] = await db.select().from(organizations).where(eq(organizations.id, session.organizationId));
  const rows = await db.select().from(settings).where(eq(settings.organizationId, session.organizationId));
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return NextResponse.json({
    organization: organization ? { id: organization.id, name: organization.name, slug: organization.slug, plan: organization.plan, status: organization.status } : null,
    settings: values,
  });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["owner", "admin"].includes(session.membershipRole)) return NextResponse.json({ error: "Owner or admin access required." }, { status: 403 });

  const body = await request.json();
  const organizationName = String(body.organizationName ?? "").trim();
  const values = body.settings && typeof body.settings === "object" ? body.settings as Record<string, unknown> : {};

  await db.transaction(async (tx) => {
    if (organizationName.length >= 2) {
      await tx.update(organizations).set({ name: organizationName, updatedAt: new Date() }).where(eq(organizations.id, session.organizationId));
    }

    for (const [key, value] of Object.entries(values)) {
      if (!/^[a-z0-9_.-]{1,80}$/i.test(key)) continue;
      await tx
        .insert(settings)
        .values({ organizationId: session.organizationId, key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [settings.organizationId, settings.key],
          set: { value, updatedAt: new Date() },
        });
    }
  });

  return NextResponse.json({ ok: true });
}
