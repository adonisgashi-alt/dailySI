// One-off repair: re-groups archived stories with the current clustering, so
// stories that an earlier desk wrongly merged are split, and copies of the same
// story filed under several ids are joined. Old story ids are kept as aliases,
// so every published URL still works.
//   node --experimental-strip-types scripts/repair-archive.ts [--write]

import path from "node:path";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { cluster, relevance, tokens, verify, type Report } from "../lib/desk.ts";
import { sectionFor } from "../lib/sections.ts";
import { generatedArt } from "../lib/images.ts";
import { dayIndex } from "../lib/archive-file.ts";
import { shardOf, type ArchiveDay, type ArchivedStory, type DayEntry } from "../lib/archive.ts";

const WRITE = process.argv.includes("--write");
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data", "archive");
const DAYS = path.join(ROOT, "days");

const days = new Map<string, ArchiveDay>();
for (const f of readdirSync(DAYS).filter((f) => f.endsWith(".json"))) days.set(f.slice(0, 10), JSON.parse(readFileSync(path.join(DAYS, f), "utf8")));

const old: { date: string; story: ArchivedStory }[] = [...days].flatMap(([date, d]) => d.stories.map((story) => ({ date, story })));
const owner = new Map<string, string[]>(); // report link -> old story ids
const pool = new Map<string, Report>();
for (const { story } of old)
  for (const r of story.reports) {
    owner.set(r.link, [...(owner.get(r.link) ?? []), story.id]);
    if (!pool.has(r.link) && relevance(r) > 0) pool.set(r.link, { ...r, tokens: tokens(r.title), relevance: relevance(r) }); // 0 = noise (e.g. a stock ticker)
  }

const groups = cluster([...pool.values()])
  .map(verify)
  .filter((s) => s.status === "confirmed")
  .sort((a, b) => b.reports.length - a.reports.length);

const byId = new Map(old.map((o) => [o.story.id, o]));
const claimed = new Set<string>();
const result: { date: string; story: ArchivedStory }[] = [];

for (const g of groups) {
  const votes = new Map<string, number>();
  for (const r of g.reports) for (const id of owner.get(r.link) ?? []) votes.set(id, (votes.get(id) ?? 0) + 1);
  const ranked = [...votes].sort((a, b) => b[1] - a[1]);
  const pick = ranked.find(([id]) => !claimed.has(id));
  if (!pick) continue; // no archived story to anchor it; the archive job will file it if it's still on the wire
  const base = byId.get(pick[0])!;
  claimed.add(pick[0]);

  const links = new Set(g.reports.map((r) => r.link));
  const before = new Set(base.story.reports.map((r) => r.link));
  const same = [...links].filter((l) => before.has(l)).length / new Set([...links, ...before]).size;
  if (same === 1) {
    result.push(base);
    continue;
  }
  const s = base.story;
  const reports = g.reports.slice(0, 15).map(({ title, link, outlet, publishedAt, summary, primary }) => ({ title, link, outlet, publishedAt, summary, primary }));
  const next: ArchivedStory = {
    ...s,
    headline: g.headline,
    summary: g.summary,
    section: sectionFor(`${g.headline} ${g.headline} ${g.summary} ${g.reports.map((r) => r.title).join(" ")}`).slug,
    status: g.status,
    basis: g.basis,
    confidence: g.confidence,
    outlets: g.outlets,
    firstSeen: g.firstSeen,
    lastUpdate: g.lastUpdate,
    reports,
  };
  if (same < 0.8) {
    // A different set of reports: the write-up, risk verdict and picture were about something else.
    delete next.editorial;
    delete next.risk;
    next.art = generatedArt(next);
  }
  console.log(`${same < 0.8 ? "REBUILT" : "updated"} ${s.id} (${Math.round(same * 100)}% same): ${s.headline.slice(0, 60)} -> ${g.headline.slice(0, 60)} [${g.reports.length}]`);
  result.push({ date: base.date, story: next });
}

// Old stories that no group anchored to become aliases of the story closest to their
// headline among those that took their reports, so old URLs land on the right event.
const kept = new Map(result.map((r) => [r.story.id, r.story]));
const overlap = (a: string, b: string) => {
  const x = new Set(tokens(a));
  return tokens(b).filter((t) => x.has(t)).length;
};
for (const { story } of old) {
  if (kept.has(story.id)) continue;
  const links = new Set(story.reports.map((r) => r.link));
  const candidates = result.map((r) => r.story).filter((s) => s.reports.some((r) => links.has(r.link)));
  const to = candidates.sort((a, b) => overlap(story.headline, b.headline) - overlap(story.headline, a.headline))[0];
  if (to) {
    to.aliases = [...new Set([...(to.aliases ?? []), story.id, ...(story.aliases ?? [])])];
    console.log(`merged  ${story.id} into ${to.id}: ${story.headline.slice(0, 50)} -> ${to.headline.slice(0, 50)}`);
  } else console.log(`dropped ${story.id} (no confirmed group): ${story.headline.slice(0, 70)}`);
}

console.log(`${old.length} archived stories -> ${result.length}`);
if (WRITE) {
  const out = new Map<string, ArchiveDay>([...days.keys()].map((d) => [d, { date: d, stories: [] }]));
  for (const { date, story } of result) out.get(date)!.stories.push(story);
  for (const [d, f] of out) {
    f.stories.sort((a, b) => b.lastUpdate - a.lastUpdate);
    writeFileSync(path.join(DAYS, `${d}.json`), JSON.stringify(f) + "\n");
  }
  const shards = new Map<string, Record<string, string>>();
  for (const { date, story } of result)
    for (const id of [story.id, ...(story.aliases ?? [])]) shards.set(shardOf(id), { ...(shards.get(shardOf(id)) ?? {}), [id]: date });
  const IDS = path.join(ROOT, "ids");
  for (const f of readdirSync(IDS)) if (!shards.has(f.slice(0, -5))) writeFileSync(path.join(IDS, f), "{}\n");
  for (const [s, m] of shards) writeFileSync(path.join(IDS, `${s}.json`), JSON.stringify(Object.fromEntries(Object.entries(m).sort())) + "\n");
  const existing: DayEntry[] = JSON.parse(readFileSync(path.join(ROOT, "days.json"), "utf8"));
  writeFileSync(path.join(ROOT, "days.json"), JSON.stringify(dayIndex(existing, out)) + "\n");
  console.log("Written.");
}
