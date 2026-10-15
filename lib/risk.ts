// The risk meters: transparent, news-driven gauges of what this week's
// confirmed coverage says about two questions.
//   - replacement: how strongly the news points toward AI replacing human work
//   - extinction:  how strongly it points toward AI posing a threat to humanity
// They are editorial signals derived from headlines, not forecasts or probabilities.

import type { Story } from "./desk.ts";

type Signal = { re: RegExp; w: number; label: string };

export type MeterId = "replacement" | "extinction";

type MeterDef = {
  id: MeterId;
  name: string;
  short: string;
  question: string;
  baseline: number; // where the needle rests on a week with no news
  pressure: Signal[];
  relief: Signal[];
};

export const METERS: Record<MeterId, MeterDef> = {
  replacement: {
    id: "replacement",
    name: "AI Replacing Humans Risk",
    short: "AI replacing humans",
    question: "How strongly does this week's confirmed news point toward AI replacing human work?",
    baseline: 52,
    pressure: [
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
    ],
    relief: [
      { re: /\b(regulat\w*|AI act|legislation|bill|law|ban\w*|treaty|oversight)\b/i, w: 2, label: "Regulation & oversight" },
      { re: /\b(safety (institute|standards?|framework|testing)|guardrails?|red.?team\w*|pause)\b/i, w: 2, label: "Safety measures" },
      { re: /\b(creat\w* (new )?jobs|hiring|reskill\w*|upskill\w*|new roles|augment\w*)\b/i, w: 3, label: "Job creation & augmentation" },
      { re: /\b(fails?|failure|flaw\w*|hallucinat\w*|struggl\w*|plateau\w*|limits?|overhyped|bubble|backlash)\b/i, w: 2, label: "Capability limits" },
      { re: /\b(union\w*|strike|protections?|lawsuit|sue[sd]?)\b/i, w: 1, label: "Worker pushback" },
    ],
  },
  extinction: {
    id: "extinction",
    name: "AI Extinction Risk",
    short: "AI threat to humanity",
    question: "How strongly does this week's confirmed news point toward AI becoming a threat to humanity's survival?",
    baseline: 30,
    pressure: [
      { re: /\b(existential|extinction|catastroph\w*|x-risk|p\(doom\)|end of humanity|wipe out)\b/i, w: 4, label: "Existential warnings" },
      { re: /\b(loss of control|lose control|uncontroll\w*|rogue|escap\w* (containment|the lab)|self-replicat\w*|exfiltrat\w*|cop(y|ies|ied) (itself|its own weights))\b/i, w: 5, label: "Loss of control" },
      { re: /\b(decepti\w*|deceiv\w*|lying|scheming|sabotag\w*|blackmail\w*|misalign\w*|power-seeking|reward hacking|sandbagg\w*)\b/i, w: 4, label: "Deceptive or misaligned behavior" },
      { re: /\b(self-improv\w*|recursive\w*|automated (AI )?research|intelligence explosion)\b/i, w: 4, label: "Self-improvement" },
      { re: /\b(AGI|superintelligen\w*|artificial general intelligence)\b/i, w: 2, label: "AGI / ASI progress" },
      { re: /\b(bioweapons?|biological weapons?|pathogens?|chemical weapons?|nuclear (weapons?|command)|cyberattacks?|cyber.?weapons?)\b/i, w: 4, label: "Weapons capability" },
      { re: /\b(autonomous weapons?|killer robots?|military AI|AI (in|for) (warfare|weapons))\b/i, w: 3, label: "Military AI" },
      { re: /\b(arms race|race to (AGI|superintelligence)|racing)\b/i, w: 2, label: "Race dynamics" },
      { re: /\b(safety (team|researchers?|lead)\w* (quit|resign|leav|depart|exit)\w*|(quit|resign|leav|depart)\w* .*safety|disband\w*)\b/i, w: 3, label: "Safety team departures" },
      { re: /\b(open.?weights?|open.?source)\b.*\b(frontier|most (capable|powerful))\b/i, w: 1, label: "Uncontrolled proliferation" },
    ],
    relief: [
      { re: /\b(treaty|international (agreement|accord|cooperation)|summit|global (ban|moratorium))\b/i, w: 3, label: "International coordination" },
      { re: /\b(safety institute|safety (standards?|framework|testing|evaluations?)|evals?|red.?team\w*|preparedness)\b/i, w: 2, label: "Safety testing" },
      { re: /\b(interpretab\w*|alignment (breakthrough|progress|research)|mechanistic|oversight (tool|method))\b/i, w: 3, label: "Alignment progress" },
      { re: /\b(regulat\w*|AI act|legislation|licens\w*|compute (governance|caps?|limits?)|export controls?)\b/i, w: 2, label: "Regulation & compute governance" },
      { re: /\b(pause|moratorium|halt\w*|kill switch|shut ?down)\b/i, w: 2, label: "Pauses & kill switches" },
      { re: /\b(plateau\w*|hits? (a )?wall|slow\w* (progress|down)|overhyped|bubble|limits?|fails?)\b/i, w: 2, label: "Capability limits" },
    ],
  },
};

export type Driver = { label: string; delta: number; storyId: string; headline: string };

export type Level = "Low" | "Guarded" | "Elevated" | "High" | "Severe";

export type RiskReading = {
  meter: MeterId;
  index: number; // 0..100
  level: Level;
  pressure: number;
  relief: number;
  drivers: Driver[];
  components: { label: string; value: number }[];
  basedOn: number;
  computedAt: number;
};

export function levelFor(index: number): Level {
  if (index < 25) return "Low";
  if (index < 45) return "Guarded";
  if (index < 62) return "Elevated";
  if (index < 80) return "High";
  return "Severe";
}

export function computeMeter(meter: MeterId, stories: Story[], now = Date.now()): RiskReading {
  const def = METERS[meter];
  let pressure = 0;
  let relief = 0;
  const drivers: Driver[] = [];
  const comp = new Map<string, number>();

  for (const s of stories) {
    const ageD = (now - s.lastUpdate) / 8.64e7;
    if (ageD > 7 || ageD < -0.05) continue;
    // Fresh, widely-corroborated stories move the needle most.
    const weight = Math.exp(-Math.max(0, ageD) / 3) * (1 + Math.log2(s.outlets.length));
    const text = `${s.headline} ${s.summary} ${s.reports.slice(0, 4).map((r) => r.title).join(" ")}`;
    let delta = 0;
    let top = "";
    let topAbs = 0;
    const apply = (sig: Signal, sign: 1 | -1) => {
      if (!sig.re.test(text)) return;
      const v = sig.w * weight;
      delta += sign * v;
      comp.set(sig.label, (comp.get(sig.label) ?? 0) + sign * v);
      if (v > topAbs) [topAbs, top] = [v, sig.label];
    };
    def.pressure.forEach((sig) => apply(sig, 1));
    def.relief.forEach((sig) => apply(sig, -1));
    if (delta > 0) pressure += delta;
    else relief -= delta;
    if (top && Math.abs(delta) > 0.5) drivers.push({ label: top, delta, storyId: s.id, headline: s.headline });
  }

  const net = pressure - relief;
  // A smooth curve around the baseline, so no single headline can pin the needle.
  const room = net >= 0 ? 98 - def.baseline : def.baseline - 2;
  const index = Math.round(Math.max(1, Math.min(99, def.baseline + room * Math.tanh(net / 40))));
  return {
    meter,
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

/** Back-compat helper: the replacement meter. */
export function computeRisk(stories: Story[], now = Date.now()): RiskReading {
  return computeMeter("replacement", stories, now);
}

// ---------------------------------------------------------------- daily readings

export function utcDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Midnight UTC that starts the day containing `ts`. */
export function dayStart(ts: number): number {
  return Date.parse(utcDate(ts) + "T00:00:00Z");
}
