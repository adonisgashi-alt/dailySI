// The paper's sections. Every confirmed story is filed under the section whose
// vocabulary it matches best; ties go to the earlier section in this list.

export type Section = { slug: string; name: string; nav: string; blurb: string; re: RegExp[] };

export const SECTIONS: Section[] = [
  {
    slug: "labs",
    name: "Labs & Models",
    nav: "Labs & Models",
    blurb: "OpenAI, Anthropic, Google DeepMind, xAI, Meta and the models racing toward general intelligence.",
    re: [
      /\b(OpenAI|Anthropic|DeepMind|xAI|Mistral|Meta AI|Safe Superintelligence|SSI|DeepSeek|Qwen|Moonshot)\b/,
      /\b(GPT-?\d|ChatGPT|Claude|Gemini|Grok|Llama|o\d|Sora)\b/,
      /\b(model|release[sd]?|launch\w*|unveil\w*|benchmark\w*|reasoning)\b/i,
    ],
  },
  {
    slug: "safety",
    name: "Safety & Alignment",
    nav: "Safety",
    blurb: "Alignment research, evaluations, deception, loss of control and the people trying to keep AI safe.",
    re: [
      /\b(safety|alignment|misalign\w*|interpretab\w*|red.?team\w*|evaluations?|evals?)\b/i,
      /\b(existential|extinction|catastroph\w*|x-risk|doom\w*|loss of control|rogue|deceptive|deception|scheming|sabotage)\b/i,
      /\b(bioweapons?|cyberattacks?|jailbreak\w*|guardrails?)\b/i,
    ],
  },
  {
    slug: "policy",
    name: "Policy & Power",
    nav: "Policy",
    blurb: "Governments, regulators, courts, the military and the geopolitics of the AI race.",
    re: [
      /\b(regulat\w*|AI Act|legislat\w*|lawmakers?|Congress|Senate|Parliament|White House|executive order|government|ministers?)\b/i,
      /\b(China|EU|European Union|UK|United States|Pentagon|military|defen[cs]e|national security|export controls?|sanctions?)\b/,
      /\b(court|lawsuits?|sue[sd]?|suing|judge|copyright|antitrust|FTC|treaty|summit|attorneys? general|states?)\b/i,
    ],
  },
  {
    slug: "business",
    name: "Business",
    nav: "Business",
    blurb: "Funding rounds, valuations, deals and the money behind superintelligence.",
    re: [
      /\b(raises?|funding|valuation|valued|investors?|investment|IPO|acquir\w*|acquisition|deal|revenue|earnings|stock|shares|billion)\b/i,
    ],
  },
  {
    slug: "work",
    name: "Work & Economy",
    nav: "Work",
    blurb: "Jobs, layoffs, automation and what AI means for human work.",
    re: [
      /\b(jobs?|workers?|workforce|employ\w*|layoffs?|laid off|hiring|labou?r|unemploy\w*|wages?|automat\w*|replac\w*)\b/i,
      /\b(economy|economic|productivity|white-collar|entry-level|careers?)\b/i,
    ],
  },
  {
    slug: "compute",
    name: "Chips & Compute",
    nav: "Compute",
    blurb: "GPUs, data centers, energy and the physical infrastructure of intelligence.",
    re: [
      /\b(chips?|GPUs?|semiconductors?|Nvidia|TSMC|AMD|Cerebras|TPUs?|wafers?)\b/i,
      /\b(data ?cent(er|re)s?|Stargate|supercomputers?|gigawatts?|power|energy|nuclear|compute)\b/i,
    ],
  },
  {
    slug: "robotics",
    name: "Robotics",
    nav: "Robotics",
    blurb: "Humanoids, autonomous machines and AI in the physical world.",
    re: [/\b(robots?|robotics|humanoids?|Optimus|Figure AI|self-driving|autonomous vehicles?|drones?|Waymo)\b/i],
  },
  {
    slug: "research",
    name: "Research & Science",
    nav: "Research",
    blurb: "Papers, discoveries and AI doing science.",
    re: [
      /\b(research(ers)?|study|paper|scientists?|discover\w*|breakthrough|arXiv|Nature|proof|math\w*|protein|drug|biology)\b/i,
    ],
  },
];

export const SECTION_BY_SLUG = new Map(SECTIONS.map((s) => [s.slug, s]));

export function sectionFor(text: string): Section {
  let best = SECTIONS[0];
  let bestScore = 0;
  for (const s of SECTIONS) {
    let score = 0;
    for (const re of s.re) {
      const m = text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"));
      if (m) score += Math.min(m.length, 3);
    }
    // Naming a lab says less about a story than its subject does: "states sue
    // OpenAI" is a policy story, not a labs story.
    if (s.slug === "labs") score *= 0.6;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}
