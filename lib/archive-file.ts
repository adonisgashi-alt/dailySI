// Filing confirmed stories into the archive (used by scripts/archive.ts).
// Pure in-memory logic so it can be tested; the script does the disk I/O.

import type { ArchiveDay, ArchivedStory, DayEntry } from "./archive.ts";
import { utcDate } from "./risk.ts";

export type ArchiveState = {
  days: Map<string, ArchiveDay>; // loaded day files
  ids: Record<string, string>; // story id (and aliases) -> date
};

const MAX_REPORTS = 15;

function merge(old: ArchivedStory, s: ArchivedStory): ArchivedStory {
  const byLink = new Map(old.reports.map((r) => [r.link, r]));
  for (const r of s.reports) byLink.set(r.link, r);
  const aliases = new Set(old.aliases ?? []);
  if (s.id !== old.id) aliases.add(s.id);
  for (const a of s.aliases ?? []) if (a !== old.id) aliases.add(a);
  return {
    ...old,
    aliases: aliases.size ? [...aliases] : undefined,
    // The newest edit wins for text and verification; the picture stays put.
    headline: s.headline || old.headline,
    summary: s.summary || old.summary,
    section: s.section,
    status: old.status === "confirmed" || s.status === "confirmed" ? "confirmed" : s.status,
    basis: s.outlets.length >= old.outlets.length ? s.basis : old.basis,
    confidence: Math.max(old.confidence, s.confidence),
    outlets: [...new Set([...old.outlets, ...s.outlets])],
    firstSeen: Math.min(old.firstSeen, s.firstSeen),
    lastUpdate: Math.max(old.lastUpdate, s.lastUpdate),
    reports: [...byLink.values()].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, MAX_REPORTS),
  };
}

/**
 * File stories into the archive. `loadDay` is called for days not yet in
 * `state.days`. Returns the dates whose files changed.
 */
export function fileStories(state: ArchiveState, stories: ArchivedStory[], loadDay: (date: string) => ArchiveDay): Set<string> {
  const changed = new Set<string>();
  const day = (date: string) => {
    if (!state.days.has(date)) state.days.set(date, loadDay(date));
    return state.days.get(date)!;
  };

  // Which live story each report belongs to right now. Used to heal stories that
  // earlier versions of the desk wrongly merged: a report belongs to one story only.
  const owner = new Map<string, string>();
  for (const s of stories) for (const r of s.reports) owner.set(r.link, s.id);
  const live = new Set(stories.map((s) => s.id));
  const isOtherLive = (x: ArchivedStory, id: string) => [x.id, ...(x.aliases ?? [])].some((k) => k !== id && live.has(k));

  for (const s of stories) {
    const links = new Set(s.reports.map((r) => r.link));
    let date = state.ids[s.id];
    let found: ArchivedStory | undefined;
    if (date) found = day(date).stories.find((x) => x.id === s.id || x.aliases?.includes(s.id));
    if (!found) {
      // Same event filed under another id (its earliest report changed)?
      for (const [d, file] of state.days) {
        // Never fold a story into a different story that is itself still on the wire.
        found = file.stories.find((x) => !isOtherLive(x, s.id) && x.reports.some((r) => links.has(r.link)));
        if (found) {
          date = d;
          break;
        }
      }
    }
    if (!found) {
      date = utcDate(s.firstSeen);
      day(date).stories.push({ ...s, reports: [...s.reports].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, MAX_REPORTS) });
    } else {
      const file = day(date!);
      const mine = new Set([found.id, ...(found.aliases ?? []), s.id]);
      const kept = found.reports.filter((r) => !owner.has(r.link) || mine.has(owner.get(r.link)!));
      const healed: ArchivedStory =
        kept.length === found.reports.length
          ? found
          : // Reports now belong to another story: drop them, and the write-up based on them.
            { ...found, reports: kept, outlets: [...new Set(kept.map((r) => r.outlet))], confidence: s.confidence, basis: s.basis, editorial: undefined };
      const next = merge(healed, s);
      if (JSON.stringify(next) === JSON.stringify(found)) {
        state.ids[s.id] = date!;
        continue;
      }
      file.stories[file.stories.indexOf(found)] = next;
      for (const a of next.aliases ?? []) state.ids[a] = date!;
    }
    state.ids[s.id] = date!;
    changed.add(date!);
  }

  for (const d of changed) state.days.get(d)!.stories.sort((a, b) => b.lastUpdate - a.lastUpdate);
  return changed;
}

export function dayIndex(existing: DayEntry[], days: Map<string, ArchiveDay>): DayEntry[] {
  const m = new Map(existing.map((e) => [e.date, e.count]));
  for (const [d, f] of days) m.set(d, f.stories.length);
  return [...m.entries()].map(([date, count]) => ({ date, count })).filter((e) => e.count > 0).sort((a, b) => b.date.localeCompare(a.date));
}
