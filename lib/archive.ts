// The permanent archive. A scheduled job (scripts/archive.ts) files every
// confirmed story into data/archive in the GitHub repo; the site reads it back
// at request time, so archive updates need no redeploy.
//
// Layout:
//   data/archive/days.json            [{ date, count }] newest first
//   data/archive/days/YYYY-MM-DD.json  { date, stories: ArchivedStory[] }
//   data/archive/ids/<xx>.json         { [storyId]: date } sharded by id prefix
//   data/risk-history.json             daily meter readings

import type { Art } from "./images.ts";
import type { DailyReading } from "./daily.ts";
import type { Status } from "./desk.ts";
import type { Anchor, MeterId, RiskScores } from "./risk.ts";

export type ArchivedReport = { title: string; link: string; outlet: string; publishedAt: number; summary: string; primary: boolean };

/** Original write-up by the AI desk (scripts/editor.ts), based only on the reports. */
export type Editorial = {
  summary: string; // paragraphs separated by blank lines
  whyItMatters: string;
  keyFacts: string[];
  sourcesAgree: boolean;
  note: string; // what the sources disagree on, if anything
  model: string;
  writtenAt: number;
  version?: number; // prompt version (scripts/editor.ts EDITOR_VERSION)
};

export type ArchivedStory = {
  id: string;
  aliases?: string[]; // earlier ids of the same story
  headline: string;
  summary: string;
  section: string; // section slug
  status: Status;
  basis: string;
  confidence: number;
  outlets: string[];
  firstSeen: number;
  lastUpdate: number;
  art: Art;
  reports: ArchivedReport[];
  editorial?: Editorial;
  risk?: RiskScores; // the AI risk desk's verdict for the meters
};

export type ArchiveDay = { date: string; stories: ArchivedStory[] };
export type DayEntry = { date: string; count: number };

export const shardOf = (id: string) => id.slice(0, 2);

const REPO_DATA = "https://raw.githubusercontent.com/adonisgashi-alt/dailySI/main/data";

async function readData<T>(rel: string, revalidate: number): Promise<T | null> {
  // Local data (development, tests, or DAILYSI_DATA_DIR) or the repo on GitHub.
  const dir = process.env.DAILYSI_DATA_DIR ?? (process.env.DAILYSI_FIXTURES ? "data" : "");
  try {
    if (dir) {
      const { readFile } = await import("node:fs/promises");
      const path = await import("node:path");
      return JSON.parse(await readFile(path.join(dir, rel), "utf8")) as T;
    }
    const base = (process.env.DATA_BASE_URL ?? REPO_DATA).replace(/\/$/, "");
    const res = await fetch(`${base}/${rel}`, { next: { revalidate }, signal: AbortSignal.timeout(6000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export const getArchiveDays = async () => (await readData<DayEntry[]>("archive/days.json", 600)) ?? [];

export const getArchiveDay = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) ? readData<ArchiveDay>(`archive/days/${date}.json`, 600) : Promise.resolve(null);

export const getRiskHistory = async () => readData<DailyReading[]>("risk-history.json", 900);

export type Indicators = { updatedAt: number; anchors: Partial<Record<MeterId, Anchor>> };

export const getIndicators = () => readData<Indicators>("indicators.json", 3600);

/** What the AI desks added to recent stories: write-ups, checked pictures and risk verdicts, by story id and alias. */
export async function getRecentDesk(days = 8) {
  const editorials = new Map<string, Editorial>();
  const pictures = new Map<string, Art>();
  const scores = new Map<string, RiskScores>();
  const files = await Promise.all((await getArchiveDays()).slice(0, days).map((d) => getArchiveDay(d.date)));
  for (const f of files)
    for (const s of f?.stories ?? [])
      for (const id of [s.id, ...(s.aliases ?? [])]) {
        if (s.editorial) editorials.set(id, s.editorial);
        if (s.art?.picked) pictures.set(id, s.art);
        if (s.risk) scores.set(id, s.risk);
      }
  return { editorials, pictures, scores };
}

export async function findArchived(id: string): Promise<ArchivedStory | null> {
  if (!/^[a-z0-9]{4,20}$/.test(id)) return null;
  const shard = await readData<Record<string, string>>(`archive/ids/${shardOf(id)}.json`, 600);
  const date = shard?.[id];
  if (!date) return null;
  const day = await getArchiveDay(date);
  return day?.stories.find((s) => s.id === id || s.aliases?.includes(id)) ?? null;
}
