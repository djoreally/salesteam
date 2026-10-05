import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, organizations, users, workspaceMemberships } from "@/db/infrastructure";
import { verifyPassword } from "@/lib/auth/password";

const COOKIE_NAME = "salesteam_session";
const SESSION_DAYS = 30;

export interface Session {
  userId: number;
  userEmail: string;
  userName: string;
  userRole: string;
  organizationId: number;
  organizationName: string;
  membershipRole: string;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function hydrateSession(userId: number): Promise<Session | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [membership] = await db.select().from(workspaceMemberships).where(eq(workspaceMemberships.userId, user.id));
  if (!membership) return null;
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, membership.organizationId));
  if (!organization) return null;
  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    organizationId: organization.id,
    organizationName: organization.name,
    membershipRole: membership.role,
  };
}

export async function authenticate(email: string, password: string): Promise<Session | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
  if (!user || !(await verifyPassword(password, user.hashedPassword))) return null;
  return hydrateSession(user.id);
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [record] = await db
    .select()
    .from(authSessions)
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, new Date())));
  if (!record) return null;
  return hydrateSession(record.userId);
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSessionForUser(userId: number): Promise<Session | null> {
  return hydrateSession(userId);
}
