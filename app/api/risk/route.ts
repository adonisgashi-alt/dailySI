import { getEdition } from "@/lib/news";

export const revalidate = 300;

export async function GET() {
  const ed = await getEdition();
  return Response.json(ed.risk, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } });
}
