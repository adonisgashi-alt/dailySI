import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorFrom, fredLatest, frontierPace, incidentsPart, parseCsv, postingsPart } from "./indicators.ts";

const DAY = 8.64e7;
const now = Date.parse("2026-10-15T00:00:00Z");

test("reads the latest FRED value, skipping blanks", () => {
  assert.deepEqual(fredLatest("observation_date,X\n2026-10-08,104.2\n2026-10-09,104.1\n2026-10-10,\n"), { date: "2026-10-09", value: 104.1 });
});

test("postings: exposed work in step with the market reads 52, falling behind reads higher", () => {
  const all = { date: "2026-10-09", value: 104.1 };
  assert.equal(postingsPart(all, [{ date: "2026-10-09", value: 104.1 }])!.index, 52);
  const today = postingsPart(all, [78.1, 87.2, 95.5].map((value) => ({ date: "2026-10-09", value })))!;
  assert.ok(today.index > 65 && today.index < 75, String(today.index));
});

test("CSV parser handles quotes and embedded newlines", () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","line1\nline2"\n'), [["a", "b"], ["x, y", "line1\nline2"]]);
});

test("release pace compares company release rates", () => {
  const rows = ["Model,Publication date,Organization categorization"];
  const end = now - 14 * DAY;
  for (let i = 0; i < 20; i++) rows.push(`m${i},${new Date(end - (i + 0.5) * 9 * DAY).toISOString().slice(0, 10)},Industry`); // 20 in 180 days
  for (let i = 0; i < 20; i++) rows.push(`o${i},${new Date(end - 180 * DAY - (i + 0.5) * 18 * DAY).toISOString().slice(0, 10)},Industry`); // 20 in 365 days
  rows.push(`u0,${new Date(end - DAY).toISOString().slice(0, 10)},Academia`);
  const p = frontierPace(rows.join("\n"), now)!;
  assert.equal(p.recent, 20);
  assert.equal(p.before, 20);
  assert.ok(p.ratio > 1.9 && p.ratio < 2.1);
});

test("incidents need enough feed history, and parts average into an anchor", () => {
  assert.equal(incidentsPart([now - DAY, now - 2 * DAY], now, 30), null);
  const dates = [...Array.from({ length: 10 }, (_, i) => now - (i + 1) * 2 * DAY), ...Array.from({ length: 10 }, (_, i) => now - (31 + i * 5) * DAY), now - 120 * DAY];
  const p = incidentsPart(dates, now, 30)!;
  assert.equal(p.value, 2);
  assert.equal(p.index, 45);
  assert.equal(anchorFrom([p, null, { ...p, index: 35 }])!.index, 40);
  assert.equal(anchorFrom([null]), null);
});
