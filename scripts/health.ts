// Checks the live site and the scheduled jobs. Prints problems and exits 1 if
// any are found (the workflow then opens a GitHub issue).
//   node --experimental-strip-types scripts/health.ts

import { execSync } from "node:child_process";

const SITE = (process.env.SITE_URL ?? "https://www.daily-si.com").replace(/\/$/, "");
const problems: string[] = [];
const hoursSince = (ts: number) => (Date.now() - ts) / 3.6e6;

async function get(path: string) {
  try {
    const res = await fetch(SITE + path, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": "DailySI-HealthCheck/1.0" } });
    if (!res.ok) problems.push(`${path} returned HTTP ${res.status}`);
    return res;
  } catch (e) {
    problems.push(`${path} could not be fetched (${(e as Error).message})`);
    return null;
  }
}

for (const p of ["/", "/latest", "/risk", "/archive", "/robots.txt", "/sitemap.xml", "/feed.xml", "/llms.txt"]) await get(p);

const res = await get("/api/news");
if (res?.ok) {
  const ed = (await res.json()) as { generatedAt: string; stories: unknown[]; feeds: { outlet: string; ok: boolean }[]; meters: { date: string } };
  const up = ed.feeds.filter((f) => f.ok).length;
  if (ed.stories.length < 3) problems.push(`Only ${ed.stories.length} confirmed stories on the site (expected 3+).`);
  if (up < ed.feeds.length / 2) problems.push(`Only ${up} of ${ed.feeds.length} feeds are online: offline are ${ed.feeds.filter((f) => !f.ok).map((f) => f.outlet).join(", ")}.`);
  if (hoursSince(Date.parse(ed.generatedAt)) > 2) problems.push(`The edition has not refreshed since ${ed.generatedAt}.`);
  if (hoursSince(Date.parse(ed.meters.date + "T00:00:00Z")) > 30) problems.push(`Risk meters are stuck on ${ed.meters.date}.`);
}

// The scheduled jobs commit to the repo; check they are still running.
const lastCommit = (path: string) => Number(execSync(`git log -1 --format=%ct -- ${path}`).toString().trim() || 0) * 1000;
const archived = lastCommit("data/archive");
if (archived && hoursSince(archived) > 6) problems.push(`The archive job has not committed in ${Math.round(hoursSince(archived))} hours.`);
const risk = lastCommit("data/risk-history.json");
if (risk && hoursSince(risk) > 30) problems.push(`The daily risk job has not committed in ${Math.round(hoursSince(risk))} hours.`);

if (problems.length) {
  console.log(problems.map((p) => `- ${p}`).join("\n"));
  process.exit(1);
}
console.log("All checks passed.");
