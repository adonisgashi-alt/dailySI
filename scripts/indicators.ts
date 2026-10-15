// Refreshes data/indicators.json, the meters' data anchor (see lib/indicators.ts).
// Runs before the daily reading. A source that fails keeps its previous value.
//   node --experimental-strip-types scripts/indicators.ts

import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { anchorFrom, fredLatest, frontierPace, incidentsPart, pacePart, postingsPart, type Part } from "../lib/indicators.ts";
import { METERS } from "../lib/risk.ts";
import type { Indicators } from "../lib/archive.ts";

const FILE = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data", "indicators.json");
const now = Date.now();

async function get(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DailySuperIntelligence/1.0; +https://www.daily-si.com)" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    console.error(`Failed: ${url} (${(e as Error).message})`);
    return null;
  }
}

const fred = async (id: string) => {
  const csv = await get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
  return csv ? fredLatest(csv) : null;
};

const old: Indicators | null = existsSync(FILE) ? JSON.parse(await readFile(FILE, "utf8")) : null;
const previous = (meter: "replacement" | "extinction", label: string) => old?.anchors[meter]?.parts.find((p) => p.label === label) ?? null;

// Job postings.
const [all, ...exposed] = await Promise.all(["IHLIDXUS", "IHLIDXUSTPSOFTDEVE", "IHLIDXUSTPCUSTSERV", "IHLIDXUSTPADMIASSI"].map(fred));
const postings = all && exposed.every(Boolean) ? postingsPart(all, exposed as { date: string; value: number }[]) : previous("replacement", "Job postings in AI-exposed work");

// Frontier release pace.
const epoch = await get("https://epoch.ai/data/notable_ai_models.csv");
const pace = epoch ? frontierPace(epoch, now) : null;
const paceFor = (meter: "replacement" | "extinction"): Part | null =>
  pace ? pacePart(pace, METERS[meter].baseline) : previous(meter, "Pace of AI model releases");

// AI incidents: keep our own log, since the feed only covers recent weeks.
const rss = await get("https://incidentdatabase.ai/rss.xml");
const log: Record<string, number> = { ...(old?.incidents ?? {}) };
for (const m of rss?.matchAll(/<item>[\s\S]*?<\/item>/g) ?? []) {
  const id = m[0].match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1] ?? m[0].match(/<link>([^<]+)<\/link>/)?.[1];
  const t = Date.parse(m[0].match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? "");
  if (id && Number.isFinite(t)) log[id] = t;
}
for (const [id, t] of Object.entries(log)) if (t < now - 120 * 8.64e7) delete log[id];
const incidents = incidentsPart(Object.values(log), now, METERS.extinction.baseline);
if (!incidents) console.log(`Incident log has ${Object.keys(log).length} reports; a rate needs 90 days of history.`);

const replacement = anchorFrom([postings, paceFor("replacement")]);
const extinction = anchorFrom([paceFor("extinction"), incidents]);
const out: Indicators = { updatedAt: now, anchors: { ...(replacement && { replacement }), ...(extinction && { extinction }) }, incidents: log };
await writeFile(FILE, JSON.stringify(out, null, 1) + "\n");
for (const [m, a] of Object.entries(out.anchors)) {
  if (!a) continue;
  console.log(`${m}: anchor ${a.index}`);
  for (const p of a.parts) console.log(`  ${p.index}  ${p.label}: ${p.value} (${p.asOf}) — ${p.source}`);
}
