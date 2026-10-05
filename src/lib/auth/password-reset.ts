import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, passwordResetTokens, users } from "@/db/infrastructure";
import { hashPassword } from "@/lib/auth/password";

const RESET_MINUTES = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordReset(email: string, origin: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
  if (!user) return { accepted: true };

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_MINUTES * 60 * 1000);
  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: hashToken(token), expiresAt });

  const resetUrl = `${origin.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_FROM_EMAIL ?? "SalesTeam <onboarding@resend.dev>";

  if (apiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: "Reset your SalesTeam password",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Reset your SalesTeam password</h2><p>Use the button below within ${RESET_MINUTES} minutes.</p><p><a href="${resetUrl}" style="display:inline-block;background:#34d399;color:#000;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
      }),
    });
    if (!response.ok) console.error("Password reset email delivery failed", response.status);
  } else {
    console.warn("Password reset requested but RESEND_API_KEY is not configured");
  }

  return { accepted: true };
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashToken(token);
  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())));

  if (!record) return { ok: false as const, error: "This reset link is invalid or has expired." };
  if (password.length < 10) return { ok: false as const, error: "Password must be at least 10 characters." };

  const hashedPassword = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ hashedPassword, updatedAt: new Date() }).where(eq(users.id, record.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, record.id));
    await tx.delete(authSessions).where(eq(authSessions.userId, record.userId));
  });

  return { ok: true as const };
}
