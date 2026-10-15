import { test } from "node:test";
import assert from "node:assert/strict";
import { pictureFor } from "./images.ts";

test("pictures follow the headline's real subject", () => {
  // "Lab" here is an AI lab: show Meta, never a chemistry lab.
  assert.deepEqual(pictureFor("Meta Superintelligence Lab Releases Muse Wonder Models in First Push Into Frontier AI"), { subject: "Meta Platforms" });
  assert.deepEqual(pictureFor("Sam Altman says OpenAI is close to AGI"), { subject: "Sam Altman" });
  assert.deepEqual(pictureFor("Humanoid robots begin shifts at car factory"), { theme: "humanoid robot" });
  // Abstract stories get a generated illustration rather than a loose stock photo.
  assert.equal(pictureFor("A proposal for better informing the public about loss-of-control risks"), null);
  assert.equal(pictureFor("Interest in the term 'superintelligence' has tripled"), null);
});
