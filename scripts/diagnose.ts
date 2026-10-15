// Diagnostics for the wire: how many reports survive each step, and what is
// held back. Run by .github/workflows/diagnose.yml (manual only).

import { SOURCES, PRIMARY_OUTLETS } from "../lib/sources.ts";
import { parseFeed, type RawItem } from "../lib/parse.ts";
import { editDesk, relevance, tokens, RELEVANCE_THRESHOLD } from "../lib/desk.ts";

const now = Date.now();
const DAY = 24 * 3.6e6;
const perSource: string[] = [];
const items: RawItem[] = [];
for (const s of SOURCES) {
  try {
    const res = await fetch(s.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; DailySuperIntelligence/1.0)" }, signal: AbortSignal.timeout(15000) });
    const got = res.ok ? parseFeed(await res.text(), s.outlet, s.primary, PRIMARY_OUTLETS) : [];
    items.push(...got);
    const fresh = got.filter((i) => now - i.publishedAt < DAY).length;
    perSource.push(`${res.status} ${String(got.length).padStart(4)} items, ${String(fresh).padStart(3)} in 24h  ${s.outlet}  ${s.url.slice(0, 90)}`);
  } catch (e) {
    perSource.push(`ERR ${(e as Error).message}  ${s.outlet}`);
  }
}
console.log("== Sources\n" + perSource.join("\n"));

const recent = items.filter((i) => now - i.publishedAt < DAY);
const relevant24 = recent.filter((i) => relevance(i) >= RELEVANCE_THRESHOLD);
console.log(`\n== Last 24h: ${recent.length} reports, ${relevant24.length} relevant (threshold ${RELEVANCE_THRESHOLD})`);

const ed = editDesk(items, now);
const new24 = ed.confirmed.filter((s) => now - s.firstSeen < DAY);
const q24 = ed.queue.filter((s) => now - s.lastUpdate < DAY);
console.log(`== Desk (7 days): ${ed.scanned} scanned, ${ed.relevant} relevant, ${ed.confirmed.length} confirmed, ${ed.queue.length} held`);
console.log(`== New in 24h: ${new24.length} confirmed, ${q24.length} held single-source\n`);

console.log("== Confirmed in last 24h");
for (const s of new24) console.log(`  [${s.outlets.length}] ${s.headline.slice(0, 110)}`);

// Held stories, with the closest other held story (near-misses in matching).
console.log("\n== Held (single source), last 24h, with nearest other held story");
const sets = q24.map((s) => new Set(tokens(s.headline)));
q24.slice(0, 60).forEach((s, i) => {
  let best = -1, bestShared: string[] = [];
  sets.forEach((b, j) => {
    if (i === j) return;
    const shared = [...sets[i]].filter((t) => b.has(t));
    if (shared.length > bestShared.length) [best, bestShared] = [j, shared];
  });
  const near = best >= 0 && bestShared.length >= 3 ? `\n        ~ ${q24[best].outlets[0]}: ${q24[best].headline.slice(0, 90)}  {${bestShared.join(",")}}` : "";
  console.log(`  ${s.outlets[0]}: ${s.headline.slice(0, 100)}${near}`);
});

console.log("\n== Sample of AI-ish reports judged off-topic (score 1-3), last 24h");
const off = recent.filter((i) => { const r = relevance(i); return r >= 1 && r < RELEVANCE_THRESHOLD; });
for (const i of off.slice(0, 40)) console.log(`  (${relevance(i)}) ${i.outlet}: ${i.title.slice(0, 100)}`);
