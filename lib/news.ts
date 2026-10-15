import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SOURCES, PRIMARY_OUTLETS, type Source } from "./sources.ts";
import { parseFeed, type RawItem } from "./parse.ts";
import { editDesk, type Story } from "./desk.ts";
import { computeRisk, type RiskReading } from "./risk.ts";
import { artFor, type Art } from "./images.ts";

// How often the wire is re-read, in seconds. Pages built from it use the same.
export const WIRE_REFRESH = 600;

export type FeedStatus = { outlet: string; ok: boolean; items: number };

export type Edition = {
  stories: (Story & { art: Art })[];
  queue: Story[];
  risk: RiskReading;
  feeds: FeedStatus[];
  scanned: number;
  relevant: number;
  generatedAt: number;
};

async function readSource(src: Source): Promise<{ items: RawItem[]; ok: boolean }> {
  // Offline development/testing: DAILYSI_FIXTURES=<dir> reads <dir>/<n>.xml.
  const fixtures = process.env.DAILYSI_FIXTURES;
  try {
    let xml: string;
    if (fixtures) {
      const idx = SOURCES.indexOf(src);
      xml = await readFile(path.join(fixtures, `${idx}.xml`), "utf8").catch(() => "");
      if (!xml) return { items: [], ok: false };
    } else {
      const res = await fetch(src.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TheDailySI/1.0; +https://github.com/adonisgashi-alt/dailySI)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
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
  const results = await Promise.all(SOURCES.map(readSource));
  const items = results.flatMap((r) => r.items);
  const now = Date.now();
  const desk = editDesk(items, now);
  const top = desk.confirmed.slice(0, 40);
  const art = await artFor(top);

  const feeds = new Map<string, FeedStatus>();
  SOURCES.forEach((s, i) => {
    const f = feeds.get(s.outlet) ?? { outlet: s.outlet, ok: false, items: 0 };
    f.ok ||= results[i].ok;
    f.items += results[i].items.length;
    feeds.set(s.outlet, f);
  });

  return {
    stories: top.map((s) => ({ ...s, art: art.get(s.id)! })),
    queue: desk.queue.slice(0, 15),
    risk: computeRisk(desk.confirmed, now),
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
