// Records today's meter readings in data/risk-history.json.
// Run once a day (see .github/workflows/daily-risk.yml):
//   node --experimental-strip-types scripts/daily-risk.ts

import { readFile, writeFile } from "node:fs/promises";
import { SOURCES, PRIMARY_OUTLETS } from "../lib/sources.ts";
import { parseFeed, type RawItem } from "../lib/parse.ts";
import { dailyReading, type DailyReading } from "../lib/daily.ts";

const FILE = new URL("../data/risk-history.json", import.meta.url);

async function read(url: string, outlet: string, primary?: boolean): Promise<RawItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DailySuperIntelligence/1.0; +https://daily-si.com)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    return parseFeed(await res.text(), outlet, primary, PRIMARY_OUTLETS);
  } catch {
    return [];
  }
}

const items = (await Promise.all(SOURCES.map((s) => read(s.url, s.outlet, s.primary)))).flat();
if (items.length < 20) {
  console.error(`Only ${items.length} items fetched; not recording a reading.`);
  process.exit(1);
}

const today = dailyReading(items);
const history: DailyReading[] = JSON.parse(await readFile(FILE, "utf8"));
const next = [...history.filter((h) => h.date !== today.date), today].sort((a, b) => a.date.localeCompare(b.date)).slice(-400);
await writeFile(FILE, JSON.stringify(next, null, 1) + "\n");
console.log(`${today.date}: replacement ${today.replacement.index} (${today.replacement.level}), extinction ${today.extinction.index} (${today.extinction.level}) from ${items.length} reports`);
