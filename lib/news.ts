import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SOURCES, PRIMARY_OUTLETS, type Source } from "./sources.ts";
import { parseFeed, type RawItem } from "./parse.ts";
import { editDesk, type Story } from "./desk.ts";
import { dailyReading, type DailyReading } from "./daily.ts";
import { artFor, type Art } from "./images.ts";
import { sectionFor, type Section } from "./sections.ts";
import historyJson from "../data/risk-history.json";

// How often the wire is re-read, in seconds. Pages built from it use the same.
export const WIRE_REFRESH = 600;

export type FeedStatus = { outlet: string; ok: boolean; items: number };

export type EditionStory = Story & { art: Art; section: Section };

export type Edition = {
  stories: EditionStory[];
  queue: Story[];
  today: DailyReading & { provisional: boolean };
  history: DailyReading[];
  feeds: FeedStatus[];
  scanned: number;
  relevant: number;
  generatedAt: number;
};

const HISTORY = historyJson as unknown as DailyReading[];

export async function readSource(src: Source, index: number): Promise<{ items: RawItem[]; ok: boolean }> {
  // Offline development/testing: DAILYSI_FIXTURES=<dir> reads <dir>/<index>.xml.
  const fixtures = process.env.DAILYSI_FIXTURES;
  try {
    let xml: string;
    if (fixtures) {
      xml = await readFile(path.join(fixtures, `${index}.xml`), "utf8").catch(() => "");
      if (!xml) return { items: [], ok: false };
    } else {
      const res = await fetch(src.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DailySuperIntelligence/1.0; +https://daily-si.com)",
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
        next: { revalidate: WIRE_REFRESH },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { items: [], ok: false };
      xml = await res.text();
    }
    const items = parseFeed(xml, src.outlet, src.primary, PRIMARY_OUTLETS);
    return { items, ok: items.length > 0 };
  } catch {
    return { items: [], ok: false };
  }
}

export const getEdition = cache(async (): Promise<Edition> => {
  const results = await Promise.all(SOURCES.map((s, i) => readSource(s, i)));
  const items = results.flatMap((r) => r.items);
  const now = Date.now();
  const desk = editDesk(items, now);
  const top = desk.confirmed.slice(0, 60);
  const art = await artFor(top);

  const feeds = new Map<string, FeedStatus>();
  SOURCES.forEach((s, i) => {
    const f = feeds.get(s.outlet) ?? { outlet: s.outlet, ok: false, items: 0 };
    f.ok ||= results[i].ok;
    f.items += results[i].items.length;
    feeds.set(s.outlet, f);
  });

  // The meters publish once a day. Use the stored daily reading when the daily
  // job has run; otherwise compute today's reading from news up to midnight UTC,
  // which gives the same value all day.
  const computed = dailyReading(items, now);
  const stored = HISTORY.find((h) => h.date === computed.date);
  const today = stored ? { ...stored, provisional: false } : { ...computed, provisional: true };
  const history = [...HISTORY.filter((h) => h.date !== today.date), today]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);

  return {
    stories: top.map((s) => ({
      ...s,
      art: art.get(s.id)!,
      section: sectionFor(`${s.headline} ${s.headline} ${s.summary} ${s.reports.map((r) => r.title).join(" ")}`),
    })),
    queue: desk.queue.slice(0, 20),
    today,
    history,
    feeds: [...feeds.values()],
    scanned: desk.scanned,
    relevant: desk.relevant,
    generatedAt: now,
  };
});

export async function getStory(id: string) {
  const ed = await getEdition();
  return ed.stories.find((s) => s.id === id) ?? null;
}
