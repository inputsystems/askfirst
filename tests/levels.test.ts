import assert from "node:assert/strict";
import test from "node:test";
import { EXPLANATION_LEVELS, levelFromPreferences, normalizeExplanationLevel } from "../src/index.js";

test("normalizes friendly aliases to guided", () => {
  assert.equal(normalizeExplanationLevel("beginner"), "guided");
  assert.equal(normalizeExplanationLevel("walkthrough"), "guided");
  assert.equal(normalizeExplanationLevel("step-by-step"), "guided");
});

test("keeps supported levels and falls back to basic", () => {
  assert.equal(normalizeExplanationLevel("basic"), "basic");
  assert.equal(normalizeExplanationLevel("guided"), "guided");
  assert.equal(normalizeExplanationLevel("technical"), "technical");
  assert.equal(normalizeExplanationLevel("tehcnical"), "basic");
  assert.equal(normalizeExplanationLevel(undefined), "basic");
});

test("resolves preferences to a level", () => {
  assert.equal(levelFromPreferences(undefined), "basic");
  assert.equal(levelFromPreferences({ level: "guided" }), "guided");
  assert.equal(levelFromPreferences({ level: "basic", showTechnicalApprovalDetails: true }), "technical");
});

test("levels are listed in order of increasing detail", () => {
  assert.deepEqual([...EXPLANATION_LEVELS], ["basic", "guided", "technical"]);
});
