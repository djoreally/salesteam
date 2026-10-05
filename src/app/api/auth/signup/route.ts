import { NextResponse } from "next/server";
import { db } from "@/db";
import { onboardingState, organizations, users, workspaceMemberships } from "@/db/infrastructure";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const organizationName = String(body.organizationName ?? "").trim() || `${name}'s Store`;

    if (name.length < 2 || !email.includes("@") || password.length < 10) {
      return NextResponse.json({ error: "Name, valid email, and a password of at least 10 characters are required." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const slugBase = slugify(organizationName) || "store";
    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

    const result = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email, hashedPassword: passwordHash, name, role: "admin" }).returning();
      const [organization] = await tx.insert(organizations).values({ name: organizationName, slug }).returning();
      await tx.insert(workspaceMemberships).values({ userId: user.id, organizationId: organization.id, role: "owner", acceptedAt: new Date() });
      await tx.insert(onboardingState).values({ organizationId: organization.id, step: "account_setup", completedSteps: ["account_created"] });
      return { user, organization };
    });

    await createSession(result.user.id);
    return NextResponse.json({ ok: true, organization: { id: result.organization.id, name: result.organization.name } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    const duplicate = message.includes("users_email_unique") || message.includes("duplicate key");
    return NextResponse.json({ error: duplicate ? "An account with that email already exists." : "Unable to create account." }, { status: duplicate ? 409 : 500 });
  }
}
