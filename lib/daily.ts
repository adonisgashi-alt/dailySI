// The meters' daily reading: computed from every report published before
// midnight UTC, as of midnight UTC. Same input all day, so the same value all day.

import type { RawItem } from "./parse.ts";
import { editDesk } from "./desk.ts";
import { capMove, computeMeter, dayStart, utcDate, type Anchor, type MeterId, type RiskReading, type RiskScores } from "./risk.ts";

export type DailyReading = {
  date: string; // YYYY-MM-DD (UTC)
  replacement: RiskReading;
  extinction: RiskReading;
};

export type DailyInputs = {
  scores?: Map<string, RiskScores>; // AI risk desk verdicts by story id
  anchors?: Partial<Record<MeterId, Anchor | null>>; // data anchors
  previous?: DailyReading; // the last published reading, for the daily movement cap
};

export function dailyReading(items: RawItem[], now = Date.now(), inputs: DailyInputs = {}): DailyReading {
  const cut = dayStart(now);
  const desk = editDesk(
    items.filter((i) => i.publishedAt && i.publishedAt < cut),
    cut,
  );
  const date = utcDate(now);
  const prev = inputs.previous && inputs.previous.date < date ? inputs.previous : undefined;
  // Readings from before the method change (no news component) don't limit the first new one.
  const meter = (id: MeterId) =>
    capMove(
      computeMeter(id, desk.confirmed, cut, { scores: inputs.scores, anchor: inputs.anchors?.[id] }),
      prev?.[id].news !== undefined ? prev[id].index : undefined,
    );
  return { date, replacement: meter("replacement"), extinction: meter("extinction") };
}

/**
 * How much a meter moved over the past week, like a credit score's "up 4 pts".
 * Compares the latest reading with the one 7 days earlier, or with the earliest
 * reading under the current method if there isn't a week of them yet.
 */
export function weeklyChange(history: DailyReading[], id: MeterId): { delta: number; since: string } | null {
  const h = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const now = h.at(-1);
  if (!now) return null;
  const weekAgo = new Date(Date.parse(now.date + "T00:00:00Z") - 7 * 8.64e7).toISOString().slice(0, 10);
  // Readings from before the method change (no news component) aren't comparable.
  const base = h.filter((r) => r.date >= weekAgo && r.date < now.date && r[id].news !== undefined)[0];
  if (!base) return null;
  const since = base.date === weekAgo ? "this week" : `since ${new Date(base.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
  return { delta: now[id].index - base[id].index, since };
}
