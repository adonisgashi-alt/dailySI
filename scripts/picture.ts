// The AI picture editor: finds a freely licensed image that actually shows what a
// story is about, or decides none does (the story then keeps its generated
// illustration). Claude names the story's real subjects, we fetch candidate
// images (Wikipedia/Wikimedia Commons lead images, Openverse photos), and Claude
// looks at the candidates and picks one only if it truly matches.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ArchivedStory } from "../lib/archive.ts";
import { openverse, openverseArt, wikipediaPhoto, type Art } from "../lib/images.ts";

const MODEL = "claude-haiku-5-5";
const MAX_CANDIDATES = 6;

const Subjects = z.object({
  wikipedia_titles: z
    .array(z.string())
    .describe("Up to 3 exact English Wikipedia article titles for the specific people, organizations, places or products the story is about, most central first."),
  photo_query: z
    .string()
    .describe("A short literal search for a stock photo that would accurately depict the story (e.g. 'humanoid robot factory'), or an empty string if no generic photo would be accurate."),
});

const Choice = z.object({
  choice: z.number().int().describe("Number of the image that clearly shows the story's subject, or 0 if none does."),
  reason: z.string().describe("One short sentence explaining the choice."),
});

const headlines = (s: ArchivedStory) => [s.headline, ...s.reports.slice(0, 6).map((r) => `${r.outlet}: ${r.title}`)].join("\n");

async function asBase64(url: string): Promise<{ data: string; media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif" } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "DailySuperIntelligence/1.0 (https://www.daily-si.com)" }, signal: AbortSignal.timeout(10000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0];
    if (!res.ok || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 3_500_000) return null;
    return { data: buf.toString("base64"), media_type: type as "image/jpeg" };
  } catch {
    return null;
  }
}

export async function pickPicture(client: Anthropic, story: ArchivedStory): Promise<{ art: Art | null; note: string }> {
  // 1. What is this story actually about?
  const named = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: betaZodOutputFormat(Subjects) },
    messages: [{ role: "user", content: `News story (headline, then how outlets reported it):\n${headlines(story)}\n\nName its main subjects and a literal photo search.` }],
  });
  const subj = named.parsed_output;
  if (!subj) return { art: null, note: "no subjects" };

  // 2. Candidate images, subjects first.
  const candidates: Art[] = [];
  for (const title of subj.wikipedia_titles.slice(0, 3)) {
    const a = await wikipediaPhoto(title);
    if (a && !candidates.some((c) => c.src === a.src)) candidates.push(a);
  }
  if (subj.photo_query.trim()) {
    for (const r of (await openverse(subj.photo_query.trim())).slice(0, MAX_CANDIDATES - candidates.length)) candidates.push(openverseArt(r, subj.photo_query.trim()));
  }
  const loaded: { art: Art; img: NonNullable<Awaited<ReturnType<typeof asBase64>>> }[] = [];
  for (const art of candidates.slice(0, MAX_CANDIDATES)) {
    const img = await asBase64(art.src);
    if (img) loaded.push({ art, img });
  }
  if (!loaded.length) return { art: null, note: `no candidates for ${subj.wikipedia_titles.join(", ")} / "${subj.photo_query}"` };

  // 3. Look at them and choose, or reject all.
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  loaded.forEach(({ art, img }, i) => {
    content.push({ type: "text", text: `Image ${i + 1}: ${art.alt}` });
    content.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
  });
  content.push({
    type: "text",
    text: `News story:\n${headlines(story)}\n\nWhich image should illustrate this story on a news site? Choose one only if it clearly shows the story's actual subject: the named person, the organization's logo or building, the specific product, or the concrete thing the story is about. Reject images that merely share a word with the headline (for example a chemistry lab for an "AI lab"), show unrelated people or places, or would mislead a reader. Answer 0 if none fits.`,
  });
  const judged = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: betaZodOutputFormat(Choice) },
    messages: [{ role: "user", content }],
  });
  const pick = judged.parsed_output;
  if (!pick || pick.choice < 1 || pick.choice > loaded.length) return { art: null, note: `rejected all: ${pick?.reason ?? "no answer"}` };
  return { art: { ...loaded[pick.choice - 1].art, picked: true }, note: `#${pick.choice}: ${pick.reason}` };
}
