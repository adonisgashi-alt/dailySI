// The Replacement Risk Index: a transparent, news-driven gauge of how strongly
// this week's confirmed coverage points toward AI replacing human work.
// It is an editorial signal derived from headlines, not a forecast.

import type { Story } from "./desk.ts";

type Signal = { re: RegExp; w: number; label: string };

const PRESSURE: Signal[] = [
  { re: /\b(replac(e|es|ed|ing)|displac\w*)\b.*\b(workers?|jobs?|humans?|staff|employees|roles?)\b|\b(workers?|jobs?|humans?|staff)\b.*\breplac\w*/i, w: 5, label: "Human replacement" },
  { re: /\b(layoffs?|laid off|job cuts?|cuts? \d[\d,]* jobs|headcount|hiring freeze)\b/i, w: 4, label: "AI-linked layoffs" },
  { re: /\bautomat(e|es|ed|ion|ing)\b/i, w: 3, label: "Automation" },
  { re: /\b(autonomous|AI) (agents?|workers?|employees?|coworkers?)\b|\bagentic\b/i, w: 3, label: "Autonomous agents" },
  { re: /\b(surpass\w*|outperform\w*|beats?|exceed\w*|superhuman|better than (humans|doctors|lawyers|programmers))\b/i, w: 3, label: "Superhuman performance" },
  { re: /\b(AGI|superintelligen\w*|artificial general intelligence)\b/i, w: 2, label: "AGI / ASI progress" },
  { re: /\b(self-improv\w*|recursive\w*|automated (AI )?research)\b/i, w: 4, label: "Self-improvement" },
  { re: /\b(humanoids?|robot workforce|robots? (take|replace|join))\b/i, w: 2, label: "Physical automation" },
  { re: /\b(white-collar|entry-level|junior|coders?|programmers?|call cent(er|re)s?)\b/i, w: 2, label: "White-collar exposure" },
  { re: /\b(launch\w*|releases?|unveil\w*|debuts?)\b.*\b(model|agent|GPT|Claude|Gemini|Grok)\b/i, w: 1, label: "Capability releases" },
];

const RELIEF: Signal[] = [
  { re: /\b(regulat\w*|AI act|legislation|bill|law|ban\w*|treaty|oversight)\b/i, w: 2, label: "Regulation & oversight" },
  { re: /\b(safety (institute|standards?|framework|testing)|guardrails?|red.?team\w*|pause)\b/i, w: 2, label: "Safety measures" },
  { re: /\b(creat\w* (new )?jobs|hiring|reskill\w*|upskill\w*|new roles|augment\w*)\b/i, w: 3, label: "Job creation & augmentation" },
  { re: /\b(fails?|failure|flaw\w*|hallucinat\w*|struggl\w*|plateau\w*|limits?|overhyped|bubble|backlash)\b/i, w: 2, label: "Capability limits" },
  { re: /\b(union\w*|strike|protections?|lawsuit|sue[sd]?)\b/i, w: 1, label: "Worker pushback" },
];

export type Driver = { label: string; delta: number; storyId: string; headline: string };

export type RiskReading = {
  index: number; // 0..100
  level: "Low" | "Guarded" | "Elevated" | "High" | "Severe";
  pressure: number;
  relief: number;
  drivers: Driver[];
  components: { label: string; value: number }[];
  basedOn: number;
  computedAt: number;
};

// Long-run anchor: where the index sits on a week with no news at all.
const BASELINE = 52;

export function levelFor(index: number): RiskReading["level"] {
  if (index < 25) return "Low";
  if (index < 45) return "Guarded";
  if (index < 62) return "Elevated";
  if (index < 80) return "High";
  return "Severe";
}

export function computeRisk(stories: Story[], now = Date.now()): RiskReading {
  let pressure = 0;
  let relief = 0;
  const drivers: Driver[] = [];
  const comp = new Map<string, number>();

  for (const s of stories) {
    const ageD = (now - s.lastUpdate) / 8.64e7;
    if (ageD > 7) continue;
    // Fresh, widely-corroborated stories move the needle most.
    const weight = Math.exp(-ageD / 3) * (1 + Math.log2(s.outlets.length));
    const text = `${s.headline} ${s.summary} ${s.reports.slice(0, 4).map((r) => r.title).join(" ")}`;
    let delta = 0;
    let top = "";
    let topAbs = 0;
    for (const sig of PRESSURE)
      if (sig.re.test(text)) {
        const v = sig.w * weight;
        delta += v;
        comp.set(sig.label, (comp.get(sig.label) ?? 0) + v);
        if (v > topAbs) [topAbs, top] = [v, sig.label];
      }
    for (const sig of RELIEF)
      if (sig.re.test(text)) {
        const v = sig.w * weight;
        delta -= v;
        comp.set(sig.label, (comp.get(sig.label) ?? 0) - v);
        if (v > topAbs) [topAbs, top] = [v, sig.label];
      }
    if (delta > 0) pressure += delta;
    else relief -= delta;
    if (top && Math.abs(delta) > 0.5) drivers.push({ label: top, delta, storyId: s.id, headline: s.headline });
  }

  const net = pressure - relief;
  const index = Math.round(Math.max(1, Math.min(99, BASELINE + 46 * Math.tanh(net / 40))));
  return {
    index,
    level: levelFor(index),
    pressure: Math.round(pressure),
    relief: Math.round(relief),
    drivers: drivers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5),
    components: [...comp.entries()]
      .map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 8),
    basedOn: stories.length,
    computedAt: now,
  };
}
