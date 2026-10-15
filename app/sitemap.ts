import type { MetadataRoute } from "next";
import { getEdition } from "@/lib/news";
import { SECTIONS } from "@/lib/sections";
import { SITE } from "@/lib/site";
import { getArchiveDay, getArchiveDays } from "@/lib/archive";

export const dynamic = "force-static";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ed = await getEdition();
  const now = new Date(ed.generatedAt);
  const days = await getArchiveDays();
  // Archived stories from the last two weeks; older ones are reachable through the day pages.
  const recent = (await Promise.all(days.slice(0, 14).map((d) => getArchiveDay(d.date)))).flatMap((d) => d?.stories ?? []);
  const live = new Set(ed.stories.map((s) => s.id));
  const page = (path: string, changeFrequency: "hourly" | "daily" | "monthly", priority: number) => ({ url: `${SITE.url}${path}`, lastModified: now, changeFrequency, priority });
  return [
    page("/", "hourly", 1),
    page("/latest", "hourly", 0.9),
    ...SECTIONS.map((s) => page(`/section/${s.slug}`, "hourly", 0.8)),
    page("/risk", "daily", 0.8),
    page("/queue", "hourly", 0.5),
    page("/about", "monthly", 0.4),
    page("/privacy", "monthly", 0.2),
    page("/archive", "daily", 0.6),
    ...days.map((d) => ({ url: `${SITE.url}/archive/${d.date}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.5 })),
    ...ed.stories.map((s) => ({ url: `${SITE.url}/story/${s.id}`, lastModified: new Date(s.lastUpdate), changeFrequency: "daily" as const, priority: 0.7 })),
    ...recent.filter((s) => !live.has(s.id)).map((s) => ({ url: `${SITE.url}/story/${s.id}`, lastModified: new Date(s.lastUpdate), changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
