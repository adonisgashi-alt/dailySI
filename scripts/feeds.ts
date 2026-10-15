// Fetch every feed in lib/sources.ts (for the scheduled jobs).

import { SOURCES, PRIMARY_OUTLETS } from "../lib/sources.ts";
import { parseFeed, type RawItem } from "../lib/parse.ts";

export async function fetchAllFeeds(): Promise<RawItem[]> {
  const fixtures = process.env.DAILYSI_FIXTURES; // offline testing: <dir>/<index>.xml
  if (fixtures) {
    const { readFile } = await import("node:fs/promises");
    const all = await Promise.all(
      SOURCES.map((s, i) => readFile(`${fixtures}/${i}.xml`, "utf8").then((x) => parseFeed(x, s.outlet, s.primary, PRIMARY_OUTLETS), () => [])),
    );
    return all.flat();
  }
  const read = async (url: string, outlet: string, primary?: boolean) => {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DailySuperIntelligence/1.0; +https://www.daily-si.com)" },
        signal: AbortSignal.timeout(15000),
      });
      return res.ok ? parseFeed(await res.text(), outlet, primary, PRIMARY_OUTLETS) : [];
    } catch {
      return [];
    }
  };
  return (await Promise.all(SOURCES.map((s) => read(s.url, s.outlet, s.primary)))).flat();
}
