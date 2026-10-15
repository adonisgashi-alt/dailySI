// The AI risk desk: judges what each confirmed story means for the two meters.
// Claude Haiku reads the reports (and our write-up, if any) and rates the story
// from -2 to +2 for each meter, or marks it as not relevant to that meter.
// Replaces keyword matching, which was fooled by things like a product named
// "Superintelligence platform".

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ArchivedStory } from "../lib/archive.ts";
import { METERS, type MeterId, type RiskScores, type StoryRisk } from "../lib/risk.ts";
import { BULK_MODEL } from "./editor.ts";

// Bump when the prompt changes so stories are judged again.
export const RISK_VERSION = 1;

const categories = (id: MeterId) => [...new Set([...METERS[id].pressure, ...METERS[id].relief].map((s) => s.label)), "Other"];

const verdict = (id: MeterId) =>
  z.object({
    relevant: z.boolean().describe(`Does this event bear on the question at all? ${METERS[id].question.replace("this week's confirmed news", "this event")}`),
    score: z.number().describe("-2 strong evidence against the risk, -1 some evidence against, 0 relevant but neutral, +1 some evidence for, +2 strong evidence for. Use 0 if not relevant."),
    category: z.string().describe(`The signal this event is mainly about. Exactly one of: ${categories(id).join("; ")}.`),
    reason: z.string().describe("One short sentence (max 20 words) explaining the score, in plain language."),
  });

const Schema = z.object({ replacement: verdict("replacement"), extinction: verdict("extinction") });

const SYSTEM = `You are the risk desk of Daily Super Intelligence. For one news event you judge what it actually implies for two questions:

1. AI replacing humans: does this event make it more or less likely that AI replaces human work at scale? Evidence for: AI-driven layoffs, automation of real jobs, agents doing work people did, big capability jumps, self-improving systems, cheap humanoid robots. Evidence against: AI creating or augmenting jobs, documented capability limits or failures, worker protections that bite, adoption stalling.
2. AI extinction risk: does this event make a catastrophe from advanced AI (loss of control, misaligned systems, AI-enabled weapons of mass destruction) more or less likely? Evidence for: deceptive or uncontrolled model behavior, rapid capability gains, weapons uplift, racing, safety teams weakened, safety commitments dropped. Evidence against: binding regulation, international coordination, alignment or interpretability progress, credible safety testing, capability plateaus.

Rules:
- Judge the substance of the event, not the words in the headline. A product named "superintelligence", a stock move, a lawsuit about privacy, a funding round or a gadget launch is usually not relevant (relevant=false, score 0).
- Most events are 0 or +/-1. Use +/-2 only for clear, significant evidence.
- Base your judgement only on what the reports say.`;

function toRisk(id: MeterId, v: z.infer<ReturnType<typeof verdict>>): StoryRisk | null {
  if (!v.relevant) return null;
  const category = categories(id).find((c) => c.toLowerCase() === v.category.trim().toLowerCase()) ?? "Other";
  return { score: Math.max(-2, Math.min(2, Math.round(v.score))), category, reason: v.reason.trim() };
}

export async function judgeRisk(client: Anthropic, story: ArchivedStory): Promise<{ risk: RiskScores | null; usage: string }> {
  const reports = story.reports
    .slice(0, 8)
    .map((r) => `- ${r.outlet}: ${r.title}${r.summary ? `. ${r.summary.slice(0, 300)}` : ""}`)
    .join("\n");
  const ours = story.editorial ? `\n\nOur write-up:\n${story.editorial.summary}` : "";
  const response = await client.beta.messages.parse({
    model: BULK_MODEL,
    max_tokens: 1500,
    system: SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(Schema) },
    messages: [{ role: "user", content: `The event: ${story.headline}\n\nWhat outlets reported:\n${reports}${ours}` }],
  });
  const usage = `${response.model} in=${response.usage.input_tokens} out=${response.usage.output_tokens}`;
  const o = response.parsed_output;
  if (response.stop_reason === "refusal" || !o) return { risk: null, usage };
  return {
    risk: { replacement: toRisk("replacement", o.replacement), extinction: toRisk("extinction", o.extinction), model: response.model, at: Date.now(), version: RISK_VERSION },
    usage,
  };
}
