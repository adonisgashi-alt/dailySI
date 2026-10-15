// Records today's meter readings in data/risk-history.json.
// Run once a day (see .github/workflows/daily-risk.yml):
//   node --experimental-strip-types scripts/daily-risk.ts

import { readFile, writeFile } from "node:fs/promises";
import { fetchAllFeeds } from "./feeds.ts";
import { dailyReading, type DailyReading } from "../lib/daily.ts";

const FILE = new URL("../data/risk-history.json", import.meta.url);

const items = await fetchAllFeeds();
if (items.length < 20) {
  console.error(`Only ${items.length} items fetched; not recording a reading.`);
  process.exit(1);
}

const today = dailyReading(items);
const history: DailyReading[] = JSON.parse(await readFile(FILE, "utf8"));
const next = [...history.filter((h) => h.date !== today.date), today].sort((a, b) => a.date.localeCompare(b.date)).slice(-400);
await writeFile(FILE, JSON.stringify(next, null, 1) + "\n");
console.log(`${today.date}: replacement ${today.replacement.index} (${today.replacement.level}), extinction ${today.extinction.index} (${today.extinction.level}) from ${items.length} reports`);
