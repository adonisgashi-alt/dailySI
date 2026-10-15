import { test } from "node:test";
import assert from "node:assert/strict";
import { fileStories, dayIndex, type ArchiveState } from "./archive-file.ts";
import type { ArchiveDay, ArchivedStory } from "./archive.ts";

const T = Date.parse("2026-10-15T10:00:00Z");
const story = (id: string, links: string[], extra: Partial<ArchivedStory> = {}): ArchivedStory => ({
  id,
  headline: `Story ${id}`,
  summary: "",
  section: "labs",
  status: "confirmed",
  basis: "",
  confidence: 42,
  outlets: links.map((_, i) => `Outlet ${i}`),
  firstSeen: T,
  lastUpdate: T,
  art: { src: "/x", alt: "", kind: "generated" },
  reports: links.map((link, i) => ({ title: `t${i}`, link, outlet: `Outlet ${i}`, publishedAt: T + i, summary: "", primary: false })),
  ...extra,
});
const empty = (date: string): ArchiveDay => ({ date, stories: [] });

test("files new stories by first-seen date and is idempotent", () => {
  const state: ArchiveState = { days: new Map(), ids: {} };
  const changed = fileStories(state, [story("aaa111", ["https://a/1", "https://b/1"])], empty);
  assert.deepEqual([...changed], ["2026-10-15"]);
  assert.equal(state.ids.aaa111, "2026-10-15");
  assert.equal(fileStories(state, [story("aaa111", ["https://a/1", "https://b/1"])], empty).size, 0);
});

test("a story whose id changed is merged, not duplicated, and keeps an alias", () => {
  const state: ArchiveState = { days: new Map(), ids: {} };
  fileStories(state, [story("aaa111", ["https://a/1", "https://b/1"])], empty);
  fileStories(state, [story("bbb222", ["https://z/0", "https://a/1", "https://c/1"], { firstSeen: T - 3.6e6 })], empty);
  const day = state.days.get("2026-10-15")!;
  assert.equal(day.stories.length, 1);
  assert.equal(day.stories[0].id, "aaa111");
  assert.deepEqual(day.stories[0].aliases, ["bbb222"]);
  assert.equal(day.stories[0].reports.length, 4);
  assert.equal(state.ids.bbb222, "2026-10-15");
  assert.deepEqual(dayIndex([], state.days), [{ date: "2026-10-15", count: 1 }]);
});

test("a wrongly merged archived story is split when the desk separates the events", () => {
  const state: ArchiveState = { days: new Map(), ids: {} };
  // An earlier, buggy desk filed both events as one story (id "fbi1").
  fileStories(state, [story("fbi1", ["https://fbi/1", "https://suit/1", "https://suit/2"], { editorial: { summary: "x", whyItMatters: "", keyFacts: [], sourcesAgree: true, note: "", model: "m", writtenAt: T } })], empty);
  // Now the desk sees two separate stories.
  fileStories(state, [story("fbi1", ["https://fbi/1", "https://fbi/2"]), story("suit9", ["https://suit/1", "https://suit/2", "https://suit/3"])], empty);
  const day = state.days.get("2026-10-15")!;
  const fbi = day.stories.find((x) => x.id === "fbi1")!;
  const suit = day.stories.find((x) => x.id === "suit9")!;
  assert.deepEqual(fbi.reports.map((r) => r.link).sort(), ["https://fbi/1", "https://fbi/2"]);
  assert.equal(fbi.editorial, undefined);
  assert.equal(suit.reports.length, 3);
});
