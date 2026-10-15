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
import Anthropic from "@anthropic-ai/sdk";
import { writeEditorial } from "./editor.ts";

// How many stories the AI desk writes per run, and how many top stories go to the bigger model.
const EDITOR_PER_RUN = Number(process.env.EDITOR_PER_RUN ?? 25);
const TOP_STORIES = 8;

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

// AI desk: original write-ups for stories that don't have one yet, best stories first.
if (process.env.ANTHROPIC_API_KEY) {
  const client = new Anthropic();
  const find = (id: string) => {
    const d = state.ids[id];
    const file = d ? state.days.get(d) ?? loadDay(d) : undefined;
    if (file && !state.days.has(d)) state.days.set(d, file);
    return { date: d, story: file?.stories.find((x) => x.id === id || x.aliases?.includes(id)) };
  };
  let written = 0;
  for (const [rank, s] of stories.entries()) {
    if (written >= EDITOR_PER_RUN) break;
    const { date, story } = find(s.id);
    if (!story || story.editorial) continue;
    try {
      const { editorial, usage } = await writeEditorial(client, story, rank < TOP_STORIES);
      console.log(`AI desk: ${usage} ${editorial ? "ok" : "declined"} | ${story.headline.slice(0, 70)}`);
      if (editorial) {
        story.editorial = editorial;
        changed.add(date);
        written++;
      }
    } catch (e) {
      console.error(`AI desk error (${(e as Error).message}); stopping for this run.`);
      break;
    }
  }
} else {
  console.log("ANTHROPIC_API_KEY not set; skipping the AI desk.");
}

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
