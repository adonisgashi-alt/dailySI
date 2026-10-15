// Static mode: with STATIC_EXPORT=1 the whole site is built as plain files
// (for Cloudflare Pages, rebuilt hourly by .github/workflows/cloudflare.yml).
// Without it, the site runs on Vercel with pages regenerated on demand.

import { getEdition } from "./news.ts";
import { getArchiveDay, getArchiveDays } from "./archive.ts";
import { storySlug } from "./slug.ts";

export const STATIC = process.env.STATIC_EXPORT === "1";

/** URL segment of every story page: the live edition plus the whole archive. */
export async function allStorySlugs(): Promise<string[]> {
  const byId = new Map((await getEdition()).stories.map((s) => [s.id, storySlug(s)]));
  for (const d of await getArchiveDays())
    for (const s of (await getArchiveDay(d.date))?.stories ?? []) if (!byId.has(s.id)) byId.set(s.id, storySlug(s));
  return [...byId.values()];
}

export async function allArchiveDates(): Promise<string[]> {
  return (await getArchiveDays()).map((d) => d.date);
}
