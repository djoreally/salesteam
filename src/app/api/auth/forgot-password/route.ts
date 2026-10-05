import { createPasswordReset } from "@/lib/auth/password-reset";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  await createPasswordReset(email, new URL(request.url).origin);
  return Response.json({
    ok: true,
    message: "If an account exists for that email, a password reset link has been sent.",
  });
}
