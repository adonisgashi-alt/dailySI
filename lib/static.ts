// Static mode: with STATIC_EXPORT=1 the whole site is built as plain files
// (for Cloudflare Pages, rebuilt hourly by .github/workflows/cloudflare.yml).
// Without it, the site runs on Vercel with pages regenerated on demand.

import { getEdition } from "./news.ts";
import { getArchiveDay, getArchiveDays } from "./archive.ts";

export const STATIC = process.env.STATIC_EXPORT === "1";

/** Every story id with a page: the live edition plus the whole archive. */
export async function allStoryIds(): Promise<string[]> {
  const ids = new Set((await getEdition()).stories.map((s) => s.id));
  for (const d of await getArchiveDays()) for (const s of (await getArchiveDay(d.date))?.stories ?? []) ids.add(s.id);
  return [...ids];
}

export async function allArchiveDates(): Promise<string[]> {
  return (await getArchiveDays()).map((d) => d.date);
}
