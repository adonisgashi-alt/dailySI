// The AI desk: writes an original summary for each confirmed story from the
// reports we matched to it (headlines and feed snippets only). Top stories go to
// Claude Sonnet 5.5, everything else to Claude Haiku 5.5.
// Needs ANTHROPIC_API_KEY; without it, stories simply keep the publishers' text.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ArchivedStory, Editorial } from "../lib/archive.ts";

// Bump when the prompt changes so existing write-ups are rewritten.
export const EDITOR_VERSION = 2;

export const TOP_MODEL = "claude-sonnet-5-5";
export const BULK_MODEL = "claude-haiku-5-5";

const EditorialSchema = z.object({
  summary: z.string().describe("Two short paragraphs, 90-160 words in total, separated by a blank line."),
  why_it_matters: z.string().describe("One or two sentences on what this means for the path to superintelligence, AI safety, or human work."),
  key_facts: z.array(z.string()).describe("Two to four short factual bullet points taken from the reports."),
  sources_agree: z.boolean().describe("True if all reports describe the same event and do not contradict each other."),
  note: z.string().describe("If sources disagree or a report seems to be about a different event, say what differs in one sentence; otherwise an empty string."),
});

const SYSTEM = `You are the AI desk of Daily Super Intelligence, a news site that covers superintelligence, AGI, frontier AI labs, AI safety, and AI's effect on human work.

You write an original summary of one news event from the reports other outlets published about it. You only see each report's headline, outlet, time, and (sometimes) a short snippet.

Rules:
- Use only facts stated in the reports. Do not add names, numbers, dates, quotes, or background from your own knowledge.
- Attribute claims to their source ("according to Reuters", "the company said"). Where reports differ, say so.
- Write in your own words in a neutral, clear newspaper style. Do not copy sentences from the reports.
- No hype, no speculation, no opinions, no calls to action.
- If the reports give little detail, write less rather than filling gaps.
- Write for readers. Never mention headlines, snippets, "the reports provided", this desk, or what information you do or don't have. Attribute facts to outlets ("The Hill reported..."), not to their headlines.`;

function reportList(s: ArchivedStory): string {
  return s.reports
    .slice(0, 10)
    .map((r, i) => {
      const when = new Date(r.publishedAt).toISOString().slice(0, 16).replace("T", " ");
      return `${i + 1}. ${r.outlet}${r.primary ? " (primary source)" : ""}, ${when} UTC\n   Headline: ${r.title}${r.summary ? `\n   Snippet: ${r.summary}` : ""}`;
    })
    .join("\n");
}

export async function writeEditorial(client: Anthropic, story: ArchivedStory, top: boolean): Promise<{ editorial: Editorial | null; usage: string }> {
  const model = top ? TOP_MODEL : BULK_MODEL;
  const response = await client.beta.messages.parse({
    model,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: top ? "medium" : "low", format: betaZodOutputFormat(EditorialSchema) },
    // Sonnet: if it declines on policy grounds, Anthropic retries on a fallback model.
    ...(top ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    messages: [{ role: "user", content: `Event headline: ${story.headline}\n\nReports:\n${reportList(story)}` }],
  });
  const usage = `${response.model} in=${response.usage.input_tokens} out=${response.usage.output_tokens}`;
  if (response.stop_reason === "refusal" || !response.parsed_output) return { editorial: null, usage };
  const o = response.parsed_output;
  return {
    editorial: {
      summary: o.summary.trim(),
      whyItMatters: o.why_it_matters.trim(),
      keyFacts: o.key_facts.map((f) => f.trim()).filter(Boolean).slice(0, 4),
      sourcesAgree: o.sources_agree,
      note: o.note.trim(),
      model: response.model,
      writtenAt: Date.now(),
      version: EDITOR_VERSION,
    },
    usage,
  };
}
