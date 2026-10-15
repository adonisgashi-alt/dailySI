import { getEdition } from "@/lib/news";

export const revalidate = 600;

export async function GET() {
  const ed = await getEdition();
  return Response.json({
    generatedAt: new Date(ed.generatedAt).toISOString(),
    risk: ed.risk,
    stories: ed.stories.map(({ reports, ...s }) => ({
      ...s,
      url: `/story/${s.id}`,
      reports: reports.map(({ tokens, ...r }) => r),
    })),
    queue: ed.queue.map((q) => ({ id: q.id, headline: q.headline, outlet: q.outlets[0], link: q.reports[0].link, lastUpdate: q.lastUpdate })),
    feeds: ed.feeds,
  });
}
