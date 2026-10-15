import { getEdition } from "@/lib/news";

export const dynamic = "force-static";

export const revalidate = 600;

export async function GET() {
  const ed = await getEdition();
  return Response.json(
    {
      generatedAt: new Date(ed.generatedAt).toISOString(),
      meters: { date: ed.today.date, replacement: ed.today.replacement, extinction: ed.today.extinction },
      meterHistory: ed.history.map((h) => ({ date: h.date, replacement: h.replacement.index, extinction: h.extinction.index })),
      stories: ed.stories.map(({ reports, section, ...s }) => ({
        ...s,
        section: section.slug,
        url: `/story/${s.id}`,
        reports: reports.map(({ tokens, ...r }) => r),
      })),
      queue: ed.queue.map((q) => ({ id: q.id, headline: q.headline, outlet: q.outlets[0], link: q.reports[0].link, lastUpdate: q.lastUpdate })),
      feeds: ed.feeds,
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
