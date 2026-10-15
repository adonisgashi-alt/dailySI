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

test("extinction meter responds to loss-of-control news", async () => {
  const { computeMeter } = await import("./risk.ts");
  const ed = editDesk(
    [
      item("Frontier AI model tried to deceive evaluators and copy itself, lab says", "Wired", 2),
      item("Lab says AI model attempted to deceive evaluators and copy itself to outside servers", "The Guardian", 3),
    ],
    now,
  );
  const r = computeMeter("extinction", ed.confirmed, now);
  assert.ok(r.index > 30, `expected above baseline, got ${r.index}`);
});

test("sections file stories sensibly", async () => {
  const { sectionFor } = await import("./sections.ts");
  assert.equal(sectionFor("Nvidia unveils new GPU for AI data centers").slug, "compute");
  assert.equal(sectionFor("EU lawmakers pass AI Act amendments").slug, "policy");
  assert.equal(sectionFor("Humanoid robots start shifts at car plant").slug, "robotics");
  assert.equal(sectionFor("Anthropic raises $30 billion at $400 billion valuation").slug, "business");
});

test("daily reading ignores news published after midnight", async () => {
  const { dailyReading } = await import("./daily.ts");
  const midnight = Date.parse("2026-10-15T00:00:00Z");
  const base = [
    item("Bank replaces 12,000 call centre workers with AI agents", "Reuters", 13),
    item("Major bank replaces 12,000 call center workers with AI agents", "BBC News", 14),
  ];
  const later = item("AI agents replace 50,000 workers at retailer", "Axios", 1);
  const a = dailyReading(base, now);
  const b = dailyReading([...base, later, { ...later, outlet: "Wired", link: "https://w.example/x" }], now);
  assert.equal(a.date, "2026-10-15");
  assert.equal(a.replacement.index, b.replacement.index);
  assert.ok(now > midnight);
});

test("the same event from separately-formed groups is merged into one story", () => {
  const ed = editDesk(
    [
      item("OpenAI sued by 8 states over ChatGPT safety concerns", "Law Commentary", 3),
      item("Arkansans react as attorney general sues OpenAI over ChatGPT safety concerns", "KARK", 2.5),
      item("Multiple states sue OpenAI, accusing it of harming children and deceiving parents", "SiliconANGLE", 2),
      item("Eight US states sue OpenAI, claiming ChatGPT harms young users", "NBC News", 1),
      item("Eight states file lawsuits against OpenAI alleging ChatGPT harms kids", "China Daily", 0.6),
      // A different OpenAI story must stay separate.
      item("OpenAI unveils GPT-7 with week-long autonomous reasoning", "The Verge", 2),
      item("OpenAI's GPT-7 can reason autonomously for a week", "TechCrunch", 1),
    ],
    now,
  );
  assert.equal(ed.confirmed.length, 2, ed.confirmed.map((s) => s.headline).join(" || "));
  const suit = ed.confirmed.find((s) => /states/i.test(s.headline))!;
  assert.equal(suit.outlets.length, 5);
});

test("lawsuits against a lab are filed under policy, launches under labs", async () => {
  const { sectionFor } = await import("./sections.ts");
  assert.equal(sectionFor("Eight US states sue OpenAI, claiming ChatGPT harms young users").slug, "policy");
  assert.equal(sectionFor("OpenAI unveils GPT-7, claiming week-long autonomous reasoning").slug, "labs");
});

test("stories that only share common names (OpenAI, ChatGPT) are not merged", () => {
  const common = [
    "OpenAI launches ChatGPT shopping agent",
    "ChatGPT gets new memory features, OpenAI says",
    "OpenAI CEO talks ChatGPT growth at conference",
    "Schools weigh ChatGPT rules as OpenAI pushes education deals",
    "OpenAI ChatGPT outage hits users worldwide",
    "OpenAI expands ChatGPT voice mode to more countries",
    "Developers react to OpenAI ChatGPT API price cut",
    "OpenAI adds ChatGPT group chats",
  ].map((t, i) => item(t, `Outlet ${i}`, 5));
  const ed = editDesk(
    [
      ...common,
      item("FBI says an OpenAI engineer used his wife's ChatGPT account to plant a secret recording device", "Ars Technica", 13),
      item("OpenAI engineer used wife's ChatGPT account to plant recording device, FBI says", "The Register", 12),
      item("OpenAI sued by 8 states over ChatGPT safety concerns", "Law Commentary", 3),
      item("Eight US states sue OpenAI, claiming ChatGPT harms young users", "NBC News", 1),
      item("Multiple states sue OpenAI, accusing it of harming children and deceiving parents", "SiliconANGLE", 2),
    ],
    now,
  );
  const fbi = ed.confirmed.find((s) => /FBI/.test(s.headline))!;
  const suit = ed.confirmed.find((s) => /states/i.test(s.headline))!;
  assert.ok(fbi && suit && fbi.id !== suit.id, ed.confirmed.map((s) => `${s.headline} [${s.reports.length}]`).join(" || "));
  assert.equal(fbi.reports.length, 2);
  assert.equal(suit.reports.length, 3);
});

test("the same outlet under slightly different names counts once", async () => {
  const { norm } = await import("./desk.ts");
  assert.equal(norm("EnergyNow"), norm("EnergyNow.com"));
  assert.equal(norm("The Verge"), norm("Verge"));
  assert.notEqual(norm("NBC News"), norm("CBS News"));
  const ed = editDesk(
    [
      item("Hinton warns superintelligence could arrive within 10 years", "EnergyNow", 3),
      item("Hinton warns superintelligence could arrive within ten years", "EnergyNow.com", 2),
    ],
    now,
  );
  assert.equal(ed.confirmed.length, 0); // one outlet twice is not independent confirmation
});

test("frontier-lab business news is on the beat", () => {
  assert.ok(relevance({ title: "Anthropic Says Revenue Jumped 45% to $16.8 Billion in Third Quarter", summary: "" }) >= 4);
  assert.ok(relevance({ title: "FTC subpoenas OpenAI and Anthropic over chatbot safety", summary: "" }) >= 4);
});

test("dollar figures match however they are written", () => {
  assert.deepEqual(tokens("$16.8B").slice(0, 2), tokens("16.8 billion").slice(0, 2));
  const { confirmed, queue } = editDesk(
    [item("Anthropic Revenue Hits $16.8B", "Bloomberg", 2), item("Anthropic Revenue Hits $16.8 Billion in Q3", "Yahoo Finance", 1)],
    now,
  );
  assert.equal(confirmed.length, 1);
  assert.equal(queue.length, 0);
});

test("meters average the news: more of the same stories does not raise the needle", async () => {
  const { computeMeter } = await import("./risk.ts");
  const story = (i: number) => [
    item(`Bank ${i} replaces call center workers with AI agents`, "Reuters", 2),
    item(`Bank ${i} replaces its call center workers with AI agents, report says`, "The Guardian", 2),
  ];
  const few = editDesk([1, 2, 3, 4].flatMap(story), now).confirmed;
  const many = editDesk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap(story), now).confirmed;
  const a = computeMeter("replacement", few, now).index;
  const b = computeMeter("replacement", many, now).index;
  assert.ok(a > 52 && b > 52);
  assert.ok(b - a <= 12, `volume moved the needle from ${a} to ${b}`);
  assert.ok(b < 98);
});

test("AI risk scores override keywords, and irrelevant stories are skipped", async () => {
  const { computeMeter } = await import("./risk.ts");
  const ed = editDesk(
    [
      item("Security firm expands its Aurora Superintelligence platform", "PR Newswire", 2),
      item("Aurora Superintelligence platform gets new features, security firm says", "Business Wire", 2),
    ],
    now,
  );
  const base = computeMeter("extinction", [], now).index;
  const keywords = computeMeter("extinction", ed.confirmed, now);
  assert.ok(keywords.index > base); // the keyword fallback is fooled by the brand name
  const scores = new Map([[ed.confirmed[0].id, { replacement: null, extinction: null, model: "test", at: now, version: 1 }]]);
  const judged = computeMeter("extinction", ed.confirmed, now, { scores });
  assert.equal(judged.index, base);
  assert.equal(judged.basedOn, 0);
});

test("anchors blend in and daily moves are capped", async () => {
  const { computeMeter, capMove, MAX_DAILY_MOVE } = await import("./risk.ts");
  const anchor = { index: 80, parts: [] };
  const r = computeMeter("replacement", [], now, { anchor });
  assert.equal(r.news, 52);
  assert.equal(r.index, 66);
  const capped = capMove(r, 50);
  assert.equal(capped.index, 50 + MAX_DAILY_MOVE);
  assert.equal(capped.raw, 66);
  assert.equal(capMove(r, undefined).index, 66);
});

test("the first reading after the method change is not capped by an old-style reading", async () => {
  const { dailyReading } = await import("./daily.ts");
  const old = { date: "2026-10-14", replacement: { index: 90 }, extinction: { index: 90 } } as never;
  const r = dailyReading([], now, { previous: old });
  assert.equal(r.replacement.index, 52);
  const fresh = { date: "2026-10-14", replacement: { index: 90, news: 80 }, extinction: { index: 90, news: 80 } } as never;
  assert.equal(dailyReading([], now, { previous: fresh }).replacement.index, 87);
});

test("weekly change compares with a week ago, or the first comparable reading", async () => {
  const { weeklyChange } = await import("./daily.ts");
  const day = (date: string, i: number, news = true) =>
    ({ date, replacement: { index: i, ...(news && { news: i }) }, extinction: { index: i, ...(news && { news: i }) } }) as never;
  assert.equal(weeklyChange([day("2026-10-15", 70, false), day("2026-10-16", 64)], "replacement"), null);
  assert.deepEqual(weeklyChange([day("2026-10-15", 70, false), day("2026-10-16", 64), day("2026-10-18", 60)], "replacement"), { delta: -4, since: "since Oct 16" });
  assert.deepEqual(weeklyChange([day("2026-10-16", 64), day("2026-10-20", 66), day("2026-10-23", 68)], "extinction"), { delta: 4, since: "this week" });
});
