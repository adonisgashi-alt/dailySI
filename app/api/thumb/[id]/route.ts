import { thumbSvg } from "@/lib/thumb";
import { STATIC } from "@/lib/static";

// In static mode the illustrations are embedded in pages instead (see ArtFigure).
export const dynamic = "force-static";

export async function generateStaticParams() {
  return STATIC ? [{ id: "sample" }] : [];
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return new Response(thumbSvg(id), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
