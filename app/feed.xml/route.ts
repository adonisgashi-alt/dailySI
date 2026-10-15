import { getEdition } from "@/lib/news";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export const revalidate = 600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const ed = await getEdition();
  const items = [...ed.stories]
    .sort((a, b) => b.lastUpdate - a.lastUpdate)
    .map((s) => {
      const url = `${SITE.url}/story/${s.id}`;
      const text = s.editorial?.summary.split(/\n\s*\n/)[0] || s.summary;
      const body = `${text ? text + " " : ""}${s.basis} Sources: ${s.reports.map((r) => r.outlet).join(", ")}.`;
      return `<item><title>${esc(s.headline)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(s.firstSeen).toUTCString()}</pubDate><category>${esc(s.section.name)}</category><description>${esc(body)}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(SITE.name)}</title><link>${SITE.url}</link><atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/><description>${esc(SITE.description)}</description><language>en-us</language><lastBuildDate>${new Date(ed.generatedAt).toUTCString()}</lastBuildDate><ttl>10</ttl>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
