import { getEdition } from "@/lib/news";
import { getArchiveDay, getArchiveDays } from "@/lib/archive";
import { storyPath } from "@/lib/slug";
import { SITE } from "@/lib/site";

// Google News sitemap: only articles first published in the last 48 hours (Google's limit).
// https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
export const dynamic = "force-static";

export const revalidate = 600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET() {
  const ed = await getEdition();
  const cutoff = ed.generatedAt - 48 * 3600e3;
  const days = await getArchiveDays();
  const archived = (await Promise.all(days.slice(0, 3).map((d) => getArchiveDay(d.date)))).flatMap((d) => d?.stories ?? []);
  const byId = new Map<string, { id: string; headline: string; firstSeen: number }>();
  for (const s of [...archived, ...ed.stories]) if (s.firstSeen >= cutoff) byId.set(s.id, s);
  const urls = [...byId.values()]
    .sort((a, b) => b.firstSeen - a.firstSeen)
    .slice(0, 1000)
    .map(
      (s) =>
        `<url><loc>${SITE.url}${storyPath(s)}</loc><news:news><news:publication><news:name>${esc(SITE.name)}</news:name><news:language>en</news:language></news:publication><news:publication_date>${new Date(s.firstSeen).toISOString()}</news:publication_date><news:title>${esc(s.headline)}</news:title></news:news></url>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
