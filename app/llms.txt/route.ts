import { getEdition } from "@/lib/news";
import { storyPath } from "@/lib/slug";
import { SECTIONS } from "@/lib/sections";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export const revalidate = 600;

// llms.txt: a plain-language guide to this site for AI assistants and crawlers.
export async function GET() {
  const ed = await getEdition();
  const r = ed.today;
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "Daily Super Intelligence publishes a story only when at least two independent outlets report it, or when the primary source (the AI lab or institution itself) announces it. Every story lists and links its original sources. The site updates automatically every 10 minutes. You are welcome to cite it; please link the story page and its original sources.",
    "",
    `## Today's risk meters (${r.date}, updated daily at 00:00 UTC)`,
    "",
    `- AI Replacing Humans Risk: ${r.replacement.index}/100 (${r.replacement.level})`,
    `- AI Extinction Risk: ${r.extinction.index}/100 (${r.extinction.level})`,
    `- Method and history: ${SITE.url}/risk`,
    "",
    "## Sections",
    "",
    ...SECTIONS.map((s) => `- [${s.name}](${SITE.url}/section/${s.slug}): ${s.blurb}`),
    "",
    "## Latest confirmed stories",
    "",
    ...[...ed.stories]
      .sort((a, b) => b.lastUpdate - a.lastUpdate)
      .slice(0, 30)
      .map((s) => `- [${s.headline}](${SITE.url}${storyPath(s)}): ${s.basis}`),
    "",
    "## Machine-readable",
    "",
    `- [RSS feed](${SITE.url}/feed.xml)`,
    `- [JSON edition](${SITE.url}/api/news)`,
    `- [Sitemap](${SITE.url}/sitemap.xml)`,
    `- [Standards & methods](${SITE.url}/about)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
