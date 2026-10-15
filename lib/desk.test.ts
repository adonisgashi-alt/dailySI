import { test } from "node:test";
import assert from "node:assert/strict";
import { editDesk, relevance, tokens } from "./desk.ts";
import { parseFeed } from "./parse.ts";
import { computeRisk } from "./risk.ts";
import type { RawItem } from "./parse.ts";

const now = Date.parse("2026-10-15T12:00:00Z");
const item = (title: string, outlet: string, hoursAgo: number, extra: Partial<RawItem> = {}): RawItem => ({
  title,
  outlet,
  link: `https://${outlet.replace(/\W/g, "").toLowerCase()}.example/${encodeURIComponent(title)}`,
  publishedAt: now - hoursAgo * 3.6e6,
  summary: "",
  primary: false,
  ...extra,
});

test("relevance keeps the beat and drops noise", () => {
  assert.ok(relevance({ title: "OpenAI says it is close to AGI", summary: "" }) >= 4);
  assert.ok(relevance({ title: "Anthropic publishes new alignment research on Claude", summary: "" }) >= 4);
  assert.ok(relevance({ title: "Best AI laptops to buy this Prime Day", summary: "" }) < 4);
  assert.ok(relevance({ title: "City council approves new bike lanes", summary: "" }) < 4);
});

test("tokens drop stopwords and fold plurals", () => {
  assert.deepEqual(tokens("The Robots are taking over jobs"), ["robot", "tak", "job"]);
});

test("two independent outlets confirm; one outlet waits in the queue", () => {
  const ed = editDesk(
    [
      item("OpenAI unveils GPT-7 with week-long autonomous reasoning", "The Verge", 3),
      item("OpenAI's GPT-7 can reason autonomously for a week, company says", "TechCrunch", 2),
      item("GPT-7 arrives: OpenAI pushes autonomous reasoning further", "Wired", 1),
      item("Rumor: secret DeepMind superintelligence project codenamed Halcyon", "Some Blog", 5),
      item("Stocks rise as markets rally", "TechCrunch", 2),
    ],
    now,
  );
  assert.equal(ed.confirmed.length, 1);
  assert.equal(ed.confirmed[0].outlets.length, 3);
  assert.equal(ed.queue.length, 1);
  assert.match(ed.queue[0].headline, /Halcyon/);
});

test("same outlet twice does not corroborate itself", () => {
  const ed = editDesk(
    [
      item("Anthropic raises $30 billion to build superintelligence compute", "Axios", 4),
      item("Anthropic $30 billion raise for superintelligence compute, explained", "Axios", 2),
    ],
    now,
  );
  assert.equal(ed.confirmed.length, 0);
  assert.equal(ed.queue.length, 1);
});

test("primary sources confirm themselves", () => {
  const ed = editDesk([item("Introducing Gemini 4: our most capable AI model", "Google DeepMind", 1, { primary: true })], now);
  assert.equal(ed.confirmed.length, 1);
  assert.match(ed.confirmed[0].basis, /Primary source/);
});

test("unrelated AI stories stay separate", () => {
  const ed = editDesk(
    [
      item("OpenAI unveils GPT-7 model", "The Verge", 3),
      item("EU passes sweeping AI Act amendments on frontier models", "The Guardian", 2),
      item("EU lawmakers approve AI Act changes for frontier models", "BBC News", 2),
    ],
    now,
  );
  assert.equal(ed.confirmed.length, 1);
  assert.match(ed.confirmed[0].headline, /AI Act/);
});

test("risk index rises with replacement news and falls with relief news", () => {
  const scary = editDesk(
    [
      item("AI agents replace 30,000 call center workers at major bank", "Reuters", 2),
      item("Bank replaces 30,000 call center workers with AI agents", "The Guardian", 1),
      item("Self-improving AI system automates its own research, lab says", "Wired", 3),
      item("Lab says its AI system now automates its own research, self-improving", "Ars Technica", 3),
    ],
    now,
  );
  const calm = editDesk(
    [
      item("Congress passes AI safety oversight law with worker protections", "Axios", 2),
      item("New AI safety oversight law with worker protections passes Congress", "BBC News", 2),
    ],
    now,
  );
  const hi = computeRisk(scary.confirmed, now);
  const lo = computeRisk(calm.confirmed, now);
  assert.ok(hi.index > 60, `expected high, got ${hi.index}`);
  assert.ok(lo.index < 52, `expected low, got ${lo.index}`);
  assert.ok(hi.drivers.length > 0);
});

test("parses RSS with Google News attribution and Atom", () => {
  const rss = `<?xml version="1.0"?><rss><channel><item><title>Big AGI news - Reuters</title><link>https://news.google.com/x</link><pubDate>Wed, 14 Oct 2026 10:00:00 GMT</pubDate><source url="https://reuters.com">Reuters</source></item></channel></rss>`;
  const [r] = parseFeed(rss, "Google News");
  assert.equal(r.outlet, "Reuters");
  assert.equal(r.title, "Big AGI news");
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom &amp; AI</title><link rel="alternate" href="https://x.example/a"/><updated>2026-10-14T10:00:00Z</updated><summary>&lt;p&gt;Hello &amp;amp; world&lt;/p&gt;</summary></entry></feed>`;
  const [a] = parseFeed(atom, "The Register");
  assert.equal(a.title, "Atom & AI");
  assert.equal(a.link, "https://x.example/a");
  assert.equal(a.summary, "Hello & world");
});

test("clusters hold up inside a busy wire", () => {
  const filler = [
    "EU lawmakers approve AI Act changes covering frontier models",
    "Major bank replaces 12,000 call centre workers with AI agents",
    "Inside the race to build superintelligence data centers",
    "Anthropic researchers find Claude models can detect when they are being tested",
    "Humanoid robots begin shifts at car factory in pilot program",
    "OpenAI CEO Sam Altman testifies before Senate on AI risks",
    "OpenAI launches shopping agent inside ChatGPT",
    "Nvidia earnings beat as AI chip demand soars",
  ].map((t, i) => item(t, `Outlet ${i}`, 6));
  const ed = editDesk(
    [
      ...filler,
      item("OpenAI unveils GPT-7, claiming week-long autonomous reasoning", "The Verge", 2),
      item("OpenAI's GPT-7 can reason autonomously for a week, company says", "TechCrunch", 1.5),
      item("GPT-7 arrives as OpenAI pushes autonomous reasoning further", "Wired", 1),
    ],
    now,
  );
  assert.equal(ed.confirmed.length, 1);
  assert.equal(ed.confirmed[0].outlets.length, 3);
  assert.equal(ed.queue.length, filler.length);
});
