import { renderSvg } from "@/lib/design/svg";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const sp = req.nextUrl.searchParams;
  const kindParam = sp.get("kind");
  const kind = kindParam === "design" || kindParam === "lifestyle" ? kindParam : "mockup";

  const svg = renderSvg({
    title: sp.get("title") ?? name.replace(/\.svg$/, "").replace(/-/g, " "),
    subtitle: sp.get("sub") ?? "original design",
    seed: Number(sp.get("seed") ?? 1234) || 1234,
    kind,
    style: sp.get("style") ?? "agent original",
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
