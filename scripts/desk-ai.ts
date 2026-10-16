// The low-cost AI desk: ONE Claude Haiku call per story writes the summary,
// judges the story for both risk meters, and names the Wikipedia article whose
// lead image (a logo, a person, a product) should illustrate it. No image
// checking with vision, no thinking tokens, front-page stories only.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ArchivedStory, Editorial } from "../lib/archive.ts";
import type { RiskScores } from "../lib/risk.ts";
import { generatedArt, wikipediaPhoto, type Art } from "../lib/images.ts";
import { EDITOR_VERSION, EditorialSchema, SYSTEM as EDITOR_SYSTEM, reportList, stripMeta } from "./editor.ts";
import { RISK_SYSTEM, RISK_VERSION, toRisk, verdict } from "./risk-desk.ts";

export const MODEL = "claude-haiku-5-5";

const Schema = z.object({
  ...EditorialSchema.shape,
  risk_replacement: verdict("replacement"),
  risk_extinction: verdict("extinction"),
  picture_wikipedia_title: z
    .string()
    .describe(
      "The exact English Wikipedia article title whose lead image would honestly illustrate this story: the organization, person or product it is mainly about (e.g. \"OpenAI\", \"Federal Trade Commission\", \"Jensen Huang\"). Empty string if nothing specific fits.",
    ),
});

const SYSTEM = `${EDITOR_SYSTEM}

You also act as the risk desk. ${RISK_SYSTEM.replace(/^You are the risk desk of Daily Super Intelligence\. /, "")}`;

export type DeskResult = { editorial: Editorial | null; risk: RiskScores | null; art: Art; usage: string };

export async function runDesk(client: Anthropic, story: ArchivedStory): Promise<DeskResult | null> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    // Thinking off and low effort: this is short, well-specified writing.
    thinking: { type: "disabled" },
    system: SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(Schema) },
    messages: [{ role: "user", content: `The event: ${story.headline}\n\nWhat outlets reported:\n${reportList(story)}` }],
  });
  const usage = `${response.model} in=${response.usage.input_tokens} out=${response.usage.output_tokens}`;
  const o = response.parsed_output;
  if (response.stop_reason === "refusal" || !o) return null;

  const keyFacts = o.key_facts.map((f) => stripMeta(f.trim())).filter(Boolean).slice(0, 4);
  let summary = stripMeta(o.summary.trim());
  if (summary.split(/\s+/).filter(Boolean).length < 20) summary = keyFacts.join(" ");
  const editorial: Editorial | null = summary
    ? {
        summary,
        whyItMatters: stripMeta(o.why_it_matters.trim()),
        keyFacts,
        sourcesAgree: o.sources_agree,
        note: o.note.trim(),
        model: response.model,
        writtenAt: Date.now(),
        version: EDITOR_VERSION,
      }
    : null;
  const risk: RiskScores = {
    replacement: toRisk("replacement", o.risk_replacement),
    extinction: toRisk("extinction", o.risk_extinction),
    model: response.model,
    at: Date.now(),
    version: RISK_VERSION,
  };
  // The named subject's Wikipedia lead image (free licence checked there), else our illustration.
  const title = o.picture_wikipedia_title.trim();
  const photo = title ? await wikipediaPhoto(title) : null;
  const art: Art = photo ? { ...photo, picked: true } : { ...generatedArt(story), picked: true };
  return { editorial, risk, art, usage: `${usage} picture=${photo ? title : "illustration"}` };
}
