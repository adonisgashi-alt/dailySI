import type { MetadataRoute } from "next";
import { getEdition } from "@/lib/news";
import { SECTIONS } from "@/lib/sections";
import { SITE } from "@/lib/site";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ed = await getEdition();
  const now = new Date(ed.generatedAt);
  const page = (path: string, changeFrequency: "hourly" | "daily" | "monthly", priority: number) => ({ url: `${SITE.url}${path}`, lastModified: now, changeFrequency, priority });
  return [
    page("/", "hourly", 1),
    page("/latest", "hourly", 0.9),
    ...SECTIONS.map((s) => page(`/section/${s.slug}`, "hourly", 0.8)),
    page("/risk", "daily", 0.8),
    page("/queue", "hourly", 0.5),
    page("/about", "monthly", 0.4),
    ...ed.stories.map((s) => ({ url: `${SITE.url}/story/${s.id}`, lastModified: new Date(s.lastUpdate), changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
