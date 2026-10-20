// Files every confirmed story into data/archive. Run every 30 minutes by
// .github/workflows/archive.yml:
//   node --experimental-strip-types scripts/archive.ts

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fetchAllFeeds } from "./feeds.ts";
import { buildStories, toArchived } from "../lib/edition.ts";
import { fileStories, dayIndex, type ArchiveState } from "../lib/archive-file.ts";
import { shardOf, type ArchiveDay, type DayEntry } from "../lib/archive.ts";
import { utcDate } from "../lib/risk.ts";


const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data", "archive");
const DAYS = path.join(ROOT, "days");
const IDS = path.join(ROOT, "ids");
const json = (v: unknown) => JSON.stringify(v) + "\n";

const items = await fetchAllFeeds();
if (items.length < 20) {
  console.error(`Only ${items.length} items fetched; skipping this run.`);
  process.exit(1);
}
const now = Date.now();
const { stories } = await buildStories(items, now, 120);

await mkdir(DAYS, { recursive: true });
await mkdir(IDS, { recursive: true });

// Load the id index and the last 10 days (for matching stories whose id changed).
const ids: Record<string, string> = {};
for (const f of await readdir(IDS)) Object.assign(ids, JSON.parse(await readFile(path.join(IDS, f), "utf8")));
const loadDay = (date: string): ArchiveDay => {
  const file = path.join(DAYS, `${date}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { date, stories: [] };
};
const state: ArchiveState = { days: new Map(), ids };
for (let i = 0; i < 10; i++) {
  const d = utcDate(now - i * 8.64e7);
  state.days.set(d, loadDay(d));
}

const changed = fileStories(state, stories.map(toArchived), loadDay);

// No AI: stories keep the publishers' text and automatic pictures. Write-ups,
// pictures and risk verdicts made earlier by the AI desk stay in the archive.

for (const d of changed) await writeFile(path.join(DAYS, `${d}.json`), json(state.days.get(d)));
const shards = new Map<string, Record<string, string>>();
for (const [id, d] of Object.entries(state.ids).sort()) {
  const s = shardOf(id);
  shards.set(s, { ...(shards.get(s) ?? {}), [id]: d });
}
for (const [s, m] of shards) await writeFile(path.join(IDS, `${s}.json`), json(m));
const indexFile = path.join(ROOT, "days.json");
const existing: DayEntry[] = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, "utf8")) : [];
await writeFile(indexFile, JSON.stringify(dayIndex(existing, state.days), null, 0) + "\n");

console.log(`${items.length} reports, ${stories.length} confirmed stories; updated ${changed.size} day file(s): ${[...changed].join(", ") || "none"}`);
