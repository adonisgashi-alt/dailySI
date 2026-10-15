import { test } from "node:test";
import assert from "node:assert/strict";
import { idFromSlug, slugify, storySlug } from "./slug.ts";

test("story URLs read like the headline and end with the id", () => {
  const s = { id: "zhf444oatyf2", headline: "FBI says an OpenAI engineer used his wife’s ChatGPT account to plant a secret recording device" };
  const slug = storySlug(s);
  assert.match(slug, /^fbi-says-an-openai-engineer-used-his-wifes-chatgpt-account[a-z-]*-zhf444oatyf2$/);
  assert.ok(slug.length <= 80 + 13);
  assert.equal(idFromSlug(slug), "zhf444oatyf2");
  assert.equal(idFromSlug("zhf444oatyf2"), "zhf444oatyf2"); // old links
  assert.equal(slugify("Raúl Labrador & the AI Act: what's next?"), "raul-labrador-and-the-ai-act-whats-next");
});
