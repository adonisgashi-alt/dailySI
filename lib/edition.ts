// Builds an edition from fetched feed items. Shared by the site (lib/news.ts)
// and the archive job (scripts/archive.ts), so both file stories the same way.

import type { RawItem } from "./parse.ts";
import { editDesk, type Story } from "./desk.ts";
import { artFor, type Art } from "./images.ts";
import { sectionFor, type Section } from "./sections.ts";
import type { ArchivedStory, Editorial } from "./archive.ts";

export type EditionStory = Story & { art: Art; section: Section; editorial?: Editorial };

export async function buildStories(items: RawItem[], now: number, limit = 60) {
  const desk = editDesk(items, now);
  const top = desk.confirmed.slice(0, limit);
  const art = await artFor(top);
  const stories: EditionStory[] = top.map((s) => ({
    ...s,
    art: art.get(s.id)!,
    section: sectionFor(`${s.headline} ${s.headline} ${s.summary} ${s.reports.map((r) => r.title).join(" ")}`),
  }));
  return { desk, stories };
}

export function toArchived(s: EditionStory): ArchivedStory {
  return {
    id: s.id,
    headline: s.headline,
    summary: s.summary,
    section: s.section.slug,
    status: s.status,
    basis: s.basis,
    confidence: s.confidence,
    outlets: s.outlets,
    firstSeen: s.firstSeen,
    lastUpdate: s.lastUpdate,
    art: s.art,
    reports: s.reports.slice(0, 15).map(({ title, link, outlet, publishedAt, summary, primary }) => ({ title, link, outlet, publishedAt, summary, primary })),
  };
}
