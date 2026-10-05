import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  const session = await authenticate(email, password);
  if (!session) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  await createSession(session.userId);
  return NextResponse.json({ ok: true, session });
}
