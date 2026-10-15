// The meters' daily reading: computed from every report published before
// midnight UTC, as of midnight UTC. Same input all day, so the same value all day.

import type { RawItem } from "./parse.ts";
import { editDesk } from "./desk.ts";
import { computeMeter, dayStart, utcDate, type RiskReading } from "./risk.ts";

export type DailyReading = {
  date: string; // YYYY-MM-DD (UTC)
  replacement: RiskReading;
  extinction: RiskReading;
};

export function dailyReading(items: RawItem[], now = Date.now()): DailyReading {
  const cut = dayStart(now);
  const desk = editDesk(
    items.filter((i) => i.publishedAt && i.publishedAt < cut),
    cut,
  );
  return {
    date: utcDate(now),
    replacement: computeMeter("replacement", desk.confirmed, cut),
    extinction: computeMeter("extinction", desk.confirmed, cut),
  };
}
