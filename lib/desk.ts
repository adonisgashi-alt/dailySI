// The editorial desk: decides what is superintelligence news, groups reports
// of the same event, and decides whether a story is confirmed enough to post.

import type { RawItem } from "./parse.ts";

// ---------------------------------------------------------------- relevance

const TERMS: [RegExp, number][] = [
  [/\bsuper\s?intelligen(ce|t)\b/i, 6],
  [/\b(AGI|ASI)\b/, 5],
  [/\bartificial general intelligence\b/i, 5],
  [/\b(existential|catastrophic) risk|x-risk|p\(doom\)|doomer/i, 4],
  [/\bAI (safety|alignment)|alignment research|misaligned|interpretability\b/i, 4],
  [/\bself-improv|recursive(ly)? improv|intelligence explosion|singularity\b/i, 4],
  [/\bfrontier (AI|model|lab)s?\b/i, 4],
  [/\b(deceiv\w*|decepti\w*|scheming|sabotag\w*|blackmail\w*|cop(y|ies) itself|self-replicat\w*|loss of control|rogue AI|jailbreak\w*)\b/i, 3],
  [/\b(OpenAI|Anthropic|DeepMind|xAI|Mistral AI|Safe Superintelligence|SSI|Meta Superintelligence)\b/, 3],
  [/\b(ChatGPT|GPT-\d|Claude|Gemini|Grok|Llama \d|o\d model|DeepSeek|Qwen)\b/, 3],
  [/\b(large language model|LLMs?|foundation model|reasoning model)s?\b/i, 3],
  [/\bAI agents?\b|\bagentic\b/i, 3],
  [/\b(Altman|Amodei|Hassabis|Sutskever|Hinton|Bengio|LeCun|Musk)\b/, 2],
  [/\bartificial intelligence\b/i, 2],
  [/\b(AI|A\.I\.) (model|system|lab|race|chip|compute|act|bill|regulation|jobs?|workers?)s?\b/i, 2],
  [/\bhumanoids?\b/i, 4],
  [/\b(robots?|robotics)\b/i, 1],
  [/\b(Nvidia|TSMC|Cerebras|Stargate)\b/, 2],
  [/\b(data ?cent(er|re)s?|GPUs?|compute)\b/i, 1],
  [/\bAI\b/, 1],
];

// Things that mention AI but are not frontier-AI news.
const NOISE = /\b(deal of the day|discount|coupon|best .* to buy|gift guide|review:|hands-on:|podcast|newsletter|sponsored|webinar|horoscope)\b/i;

export function relevance(item: Pick<RawItem, "title" | "summary">): number {
  const text = `${item.title} ${item.title} ${item.summary}`; // title counts double
  if (NOISE.test(item.title)) return 0;
  let score = 0;
  for (const [re, w] of TERMS) if (re.test(text)) score += w;
  return score;
}

export const RELEVANCE_THRESHOLD = 4;

// ---------------------------------------------------------------- clustering

const STOP = new Set(
  "a an the and or but of to in on for with at by from as is are was were be been being it its this that these those into over after before about than then up out new says said will would can could may might just how why what who when where amid via vs not no more most has have had do does did their his her they them we you our your".split(
    " ",
  ),
);

// Deliberately crude stemmer: enough to match "reasoning"/"reason",
// "unveils"/"unveiled", "autonomously"/"autonomous".
const NUMBERS: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", dozen: "12", hundred: "100", thousand: "1000", million: "1000000", billion: "1000000000" };
const IRREGULAR: Record<string, string> = { sued: "sue", sues: "sue", suing: "sue", lawsuit: "sue", lawsuits: "sue", says: "say", said: "say", led: "lead", leads: "lead", bought: "buy", buys: "buy", sold: "sell", sells: "sell", hit: "hit", hits: "hit", cut: "cut", cuts: "cut", children: "child", kids: "child", kid: "child", teens: "child", teen: "child", minors: "child", young: "child" };

function stem(t: string): string {
  if (NUMBERS[t]) return NUMBERS[t];
  if (IRREGULAR[t]) return IRREGULAR[t];
  if (/\d/.test(t) || t.length <= 3) return t;
  t = t.replace(/ly$/, "");
  if (t.length > 5) t = t.replace(/(ing|ed)$/, "");
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) t = t.slice(0, -1);
  return t;
}

export function tokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .replace(/[^a-z0-9.\- ]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .map(stem)
    .filter((t) => (t.length > 1 || /\d/.test(t)) && !STOP.has(t));
}

export type Report = RawItem & { tokens: string[]; relevance: number };

export type Status = "confirmed" | "unconfirmed";

export type Story = {
  id: string;
  headline: string;
  summary: string;
  reports: Report[]; // newest first
  outlets: string[]; // independent outlets
  firstSeen: number;
  lastUpdate: number;
  status: Status;
  basis: string; // human-readable reason for the verification status
  confidence: number; // 0..100
  relevance: number;
};

export function hashId(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return ((h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)).slice(0, 12);
}

const WINDOW_MS = 4 * 24 * 3600 * 1000;

/**
 * Group reports of the same event. Similarity is the IDF-weighted overlap of
 * headline tokens, so rare words ("GPT-6", "Stargate", "Sutskever") bind
 * headlines together and common ones ("AI", "OpenAI") barely do.
 */
export function cluster(reports: Report[]): Report[][] {
  const df = new Map<string, number>();
  for (const r of reports) for (const t of new Set(r.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = Math.max(reports.length, 2);
  const idf = (t: string) => Math.log(1 + n / (df.get(t) ?? 1));
  const weight = (ts: Set<string>) => [...ts].reduce((s, t) => s + idf(t), 0);

  const sorted = [...reports].sort((a, b) => a.publishedAt - b.publishedAt);
  const clusters: { members: Report[]; sets: Set<string>[] }[] = [];

  for (const r of sorted) {
    const a = new Set(r.tokens);
    const wa = weight(a);
    let best = -1;
    let bestScore = 0;
    clusters.forEach((c, ci) => {
      c.members.forEach((m, mi) => {
        if (Math.abs(m.publishedAt - r.publishedAt) > WINDOW_MS) return;
        const b = c.sets[mi];
        const shared = [...a].filter((t) => b.has(t));
        if (shared.length < 2) return;
        const raw = shared.reduce((s, t) => s + idf(t), 0) / Math.min(wa, weight(b));
        // Words shared within a cluster are, by construction, less rare than
        // the words unique to each headline, so several shared words lower the bar.
        const score = shared.length >= 3 ? raw * 1.3 : raw;
        if (score > bestScore) {
          bestScore = score;
          best = ci;
        }
      });
    });
    if (best >= 0 && bestScore >= 0.5) {
      clusters[best].members.push(r);
      clusters[best].sets.push(a);
    } else {
      clusters.push({ members: [r], sets: [a] });
    }
  }

  // Second pass: merge groups that cover the same event but formed separately
  // (e.g. "OpenAI sued by 8 states over ChatGPT safety" and "Eight US states
  // sue OpenAI, claiming ChatGPT harms young users").
  const pairScore = (a: Set<string>, b: Set<string>) => {
    const shared = [...a].filter((t) => b.has(t));
    if (shared.length < 2) return 0;
    const raw = shared.reduce((s, t) => s + idf(t), 0) / Math.min(weight(a), weight(b));
    return shared.length >= 3 ? raw * 1.3 : raw;
  };
  const near = (x: (typeof clusters)[number], y: (typeof clusters)[number]) => {
    let best = 0;
    x.members.forEach((m, i) =>
      y.members.forEach((o, j) => {
        if (Math.abs(m.publishedAt - o.publishedAt) <= WINDOW_MS) best = Math.max(best, pairScore(x.sets[i], y.sets[j]));
      }),
    );
    if (best < 0.4) return false;
    const ux = new Set(x.sets.flatMap((st) => [...st]));
    const shared = [...new Set(y.sets.flatMap((st) => [...st]))].filter((t) => ux.has(t));
    return shared.length >= 3;
  };
  for (let merged = true; merged; ) {
    merged = false;
    outer: for (let i = 0; i < clusters.length; i++)
      for (let j = i + 1; j < clusters.length; j++)
        if (near(clusters[i], clusters[j])) {
          clusters[i].members.push(...clusters[j].members);
          clusters[i].sets.push(...clusters[j].sets);
          clusters.splice(j, 1);
          merged = true;
          break outer;
        }
  }
  return clusters.map((c) => c.members);
}

// ---------------------------------------------------------------- verification

const norm = (o: string) => o.toLowerCase().replace(/^the\s+/, "").replace(/\s+(news|online|\.com)$/, "").trim();

/**
 * The verification standard. A story is posted only when:
 *   - at least two independent outlets report it, or
 *   - it comes from a primary source (the lab or institute that made the news).
 * Everything else is held in the verification queue until a second outlet
 * confirms it.
 */
export function verify(members: Report[]): Story {
  const reports = [...members].sort((a, b) => b.publishedAt - a.publishedAt);
  const outletMap = new Map<string, string>();
  for (const r of reports) if (!outletMap.has(norm(r.outlet))) outletMap.set(norm(r.outlet), r.outlet);
  const outlets = [...outletMap.values()];
  const primary = reports.find((r) => r.primary);

  let status: Status = "unconfirmed";
  let basis = `Single report from ${outlets[0]}. Held until an independent outlet confirms.`;
  if (outlets.length >= 2) {
    status = "confirmed";
    basis = `Independently reported by ${outlets.length} outlets: ${outlets.slice(0, 4).join(", ")}${outlets.length > 4 ? "…" : ""}.`;
  } else if (primary) {
    status = "confirmed";
    basis = `Primary source: announced directly by ${primary.outlet}.`;
  }
  const confidence = Math.min(99, (primary ? 55 : 20) + Math.max(0, outlets.length - 1) * 22);

  // Headline: earliest non-primary report tends to be the clearest news framing;
  // fall back to the primary announcement.
  const earliest = [...reports].sort((a, b) => a.publishedAt - b.publishedAt);
  const lead = earliest.find((r) => r.summary) ?? earliest[0];
  return {
    id: hashId(earliest[0].link),
    headline: earliest[0].title,
    summary: lead.summary,
    reports,
    outlets,
    firstSeen: earliest[0].publishedAt,
    lastUpdate: reports[0].publishedAt,
    status,
    basis,
    confidence,
    relevance: Math.max(...reports.map((r) => r.relevance)),
  };
}

/** Rank confirmed stories: more corroboration and fresher news rise. */
export function rank(s: Story, now = Date.now()): number {
  const ageH = Math.max(0, (now - s.lastUpdate) / 3.6e6);
  return (Math.log2(1 + s.outlets.length) * 2 + Math.min(s.relevance, 12) / 4 + (s.reports.some((r) => r.primary) ? 1 : 0)) / Math.pow(1 + ageH / 12, 0.9);
}

export function editDesk(items: RawItem[], now = Date.now()) {
  const seen = new Set<string>();
  const reports: Report[] = [];
  for (const it of items) {
    if (!it.publishedAt || it.publishedAt > now + 3.6e6 || now - it.publishedAt > 7 * 24 * 3.6e6) continue;
    const key = it.link.split("?")[0] + "|" + it.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const rel = relevance(it);
    if (rel < RELEVANCE_THRESHOLD) continue;
    reports.push({ ...it, tokens: tokens(it.title), relevance: rel });
  }
  const stories = cluster(reports).map(verify);
  const confirmed = stories.filter((s) => s.status === "confirmed").sort((a, b) => rank(b, now) - rank(a, now));
  const queue = stories.filter((s) => s.status === "unconfirmed").sort((a, b) => b.lastUpdate - a.lastUpdate);
  return { confirmed, queue, scanned: items.length, relevant: reports.length };
}
