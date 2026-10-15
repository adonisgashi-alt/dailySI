// Slow-moving public data behind the risk meters (the "data anchor").
// Pure functions so they can be tested; scripts/indicators.ts does the fetching.
//
// AI replacing humans (resting point 52):
//   - Job postings in AI-exposed work (Indeed via FRED): software development,
//     customer service and administrative assistance, relative to all postings,
//     each indexed to Feb 2020 = 100. Exposed work falling behind the market
//     pushes the meter up.
//   - Pace of AI model releases (Epoch AI): notable models from companies per
//     day recently vs the year before. Faster pushes up.
// AI extinction risk (resting point 30):
//   - Pace of AI model releases, as above.
//   - Reported AI incidents (AI Incident Database): the last 30 days vs the
//     60 days before, from a log we keep (the feed itself only covers recent
//     weeks). More incidents push up.

import type { Anchor } from "./risk.ts";

export type Part = Anchor["parts"][number];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const DAY = 8.64e7;

/** Latest value of a FRED CSV ("observation_date,SERIES"). */
export function fredLatest(csv: string): { date: string; value: number } | null {
  const rows = csv.trim().split("\n").slice(1).map((l) => l.split(","));
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = Number(rows[i][1]);
    if (rows[i][0] && Number.isFinite(v) && rows[i][1] !== "") return { date: rows[i][0], value: v };
  }
  return null;
}

/** Exposed occupations' postings relative to all postings (1 = in step with the market since Feb 2020). */
export function postingsPart(all: { date: string; value: number }, exposed: { date: string; value: number }[]): Part | null {
  if (!exposed.length || !all.value) return null;
  const ratio = exposed.reduce((a, b) => a + b.value, 0) / exposed.length / all.value;
  // In step with the market reads 52; every 10% shortfall adds 12 points.
  const index = Math.round(clamp(52 + (1 - ratio) * 120, 2, 98));
  return {
    label: "Job postings in AI-exposed work",
    value: Math.round(ratio * 1000) / 1000,
    index,
    source: "Indeed Hiring Lab via FRED; software, customer service and admin postings vs all postings, Feb 2020 = 1",
    asOf: [all.date, ...exposed.map((e) => e.date)].sort()[0],
  };
}

/** Minimal CSV parser (quoted fields, embedded commas and newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  return rows;
}

/**
 * Notable AI model releases by companies per day, in a recent window vs the year
 * before it. Epoch adds models with some lag, so the recent window ends 14 days ago.
 * (Epoch's own "frontier model" flag is filled in months later, so it is not used.)
 */
export function frontierPace(csv: string, now: number): { ratio: number; recent: number; before: number; asOf: string } | null {
  const [head, ...rows] = parseCsv(csv);
  const date = head.indexOf("Publication date");
  const org = head.indexOf("Organization categorization");
  if (date < 0) return null;
  const times = rows
    .filter((r) => org < 0 || /industry/i.test(r[org] ?? ""))
    .map((r) => Date.parse(r[date]))
    .filter(Number.isFinite);
  const end = now - 14 * DAY;
  const mid = end - 180 * DAY;
  const start = mid - 365 * DAY;
  const recent = times.filter((t) => t > mid && t <= end).length;
  const before = times.filter((t) => t > start && t <= mid).length;
  if (before < 20) return null;
  return { ratio: recent / 180 / (before / 365), recent, before, asOf: new Date(end).toISOString().slice(0, 10) };
}

export function pacePart(p: { ratio: number; recent: number; before: number; asOf: string }, rest: number): Part {
  return {
    label: "Pace of AI model releases",
    value: Math.round(p.ratio * 100) / 100,
    // Same pace as the year before reads the meter's resting point; doubling adds 20.
    index: Math.round(clamp(rest + 20 * Math.log2(Math.max(p.ratio, 0.05)), 2, 98)),
    source: `Epoch AI notable models from companies; ${p.recent} in the last 180 days vs ${p.before} in the year before`,
    asOf: p.asOf,
  };
}

/** Reported AI incidents in the last 30 days vs the 60 days before (from the incident log's dates). */
export function incidentsPart(pubDates: number[], now: number, rest: number): Part | null {
  const ts = pubDates.filter((t) => Number.isFinite(t) && t <= now);
  if (!ts.length || Math.min(...ts) > now - 90 * DAY) return null; // the feed doesn't reach back far enough
  const recent = ts.filter((t) => t > now - 30 * DAY).length;
  const before = ts.filter((t) => t <= now - 30 * DAY && t > now - 90 * DAY).length / 2;
  if (before < 2) return null;
  const ratio = recent / before;
  return {
    label: "Reported AI incidents",
    value: Math.round(ratio * 100) / 100,
    index: Math.round(clamp(rest + 15 * Math.log2(Math.max(ratio, 0.05)), 2, 98)),
    source: `AI Incident Database; ${recent} reports in the last 30 days vs ${before} a month before`,
    asOf: new Date(now).toISOString().slice(0, 10),
  };
}

/** Average the parts that are available. */
export function anchorFrom(parts: (Part | null)[]): Anchor | null {
  const ok = parts.filter((p): p is Part => !!p);
  if (!ok.length) return null;
  return { index: Math.round(ok.reduce((a, p) => a + p.index, 0) / ok.length), parts: ok };
}
