import { resetPassword } from "@/lib/auth/password-reset";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!token) return Response.json({ error: "Reset token is required." }, { status: 400 });
  const result = await resetPassword(token, password);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
}
