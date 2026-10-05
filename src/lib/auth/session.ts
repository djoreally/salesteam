import { db } from "@/db";
import { users, workspaceMemberships } from "@/db/infrastructure";
import { eq } from "drizzle-orm";

/**
 * Basic session/auth framework.
 * No external OAuth provider — the commerce agent manages its own identity model.
 */
export interface Session {
  userId: number;
  userEmail: string;
  userName: string;
  userRole: string;
  organizationId: number;
  organizationName: string;
}

export async function authenticate(email: string, password: string): Promise<Session | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return null;
  if (user.hashedPassword !== `hash:${password}`) return null;
  const [membership] = await db.select().from(workspaceMemberships).where(eq(workspaceMemberships.userId, user.id));
  if (!membership) return null;
  return { userId: user.id, userEmail: user.email, userName: user.name, userRole: user.role, organizationId: membership.organizationId, organizationName: `org-${membership.organizationId}` };
}

export async function getSessionForUser(userId: number): Promise<Session | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [membership] = await db.select().from(workspaceMemberships).where(eq(workspaceMemberships.userId, user.id));
  if (!membership) return null;
  return { userId: user.id, userEmail: user.email, userName: user.name, userRole: user.role, organizationId: membership.organizationId, organizationName: `org-${membership.organizationId}` };
}
