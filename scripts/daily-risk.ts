// Records today's meter readings in data/risk-history.json.
// Run once a day (see .github/workflows/daily-risk.yml):
//   node --experimental-strip-types scripts/daily-risk.ts

import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { fetchAllFeeds } from "./feeds.ts";
import { dailyReading, type DailyReading } from "../lib/daily.ts";
import { getIndicators, getRecentDesk } from "../lib/archive.ts";

const DATA = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data");
// Read the archive and indicators from this checkout, not from GitHub.
process.env.DAILYSI_DATA_DIR ??= DATA;
const FILE = path.join(DATA, "risk-history.json");

const items = await fetchAllFeeds();
if (items.length < 20) {
  console.error(`Only ${items.length} items fetched; not recording a reading.`);
  process.exit(1);
}

const history: DailyReading[] = JSON.parse(await readFile(FILE, "utf8"));
const [{ scores }, indicators] = await Promise.all([getRecentDesk(), getIndicators()]);
const date = new Date().toISOString().slice(0, 10);
const previous = history.filter((h) => h.date < date).sort((a, b) => a.date.localeCompare(b.date)).pop();
const today = dailyReading(items, Date.now(), { scores, anchors: indicators?.anchors, previous });
const next = [...history.filter((h) => h.date !== today.date), today].sort((a, b) => a.date.localeCompare(b.date)).slice(-400);
await writeFile(FILE, JSON.stringify(next, null, 1) + "\n");
for (const id of ["replacement", "extinction"] as const) {
  const r = today[id];
  console.log(
    `${today.date} ${id}: ${r.index} (${r.level}); raw ${r.raw}, news ${r.news}, anchor ${r.anchor?.index ?? "none"}; ` +
      `${r.basedOn} stories, ${r.scoredByAI} judged by the AI desk`,
  );
}
