import { test } from "node:test";
import assert from "node:assert/strict";
import { stripMeta } from "../scripts/editor.ts";

test("sentences about the sourcing are removed, the news stays", () => {
  const text =
    "Intel's chief executive said adoption of Chinese frontier AI models has been very fast, CNBC reported. The available reports contain only the headline-level statement, with no further detail.\n\nNewsweek asked which tech leaders are adopting the label. Its headline frames the question but the answer is not described in the material available here.";
  assert.equal(
    stripMeta(text),
    "Intel's chief executive said adoption of Chinese frontier AI models has been very fast, CNBC reported.\n\nNewsweek asked which tech leaders are adopting the label.",
  );
  assert.equal(stripMeta("Sanders called for a ban, The Hill reported."), "Sanders called for a ban, The Hill reported.");
});
