import assert from "node:assert/strict";
import test from "node:test";
import { buildInstructionSet } from "../src/index.js";

const input = {
  headline: "Do the thing",
  summary: "Short summary",
  conciseStep: "Click continue.",
  walkthroughSteps: ["Step one", "Step two"],
  technicalDetails: ["debug=true"]
};

test("basic instructions show one step while technical includes details", () => {
  assert.equal(buildInstructionSet({ ...input, level: "basic" }).steps.length, 1);
  assert.deepEqual(buildInstructionSet({ ...input, level: "guided" }).steps, ["Step one", "Step two"]);
  assert.equal(buildInstructionSet({ ...input, level: "technical" }).technicalDetails?.[0], "debug=true");
});

test("friendly aliases normalize to guided", () => {
  assert.equal(buildInstructionSet({ ...input, level: "beginner" }).level, "guided");
  assert.equal(buildInstructionSet({ ...input, level: "step-by-step" }).level, "guided");
});

test("a translate function localizes copy but never technical details", () => {
  const set = buildInstructionSet({ ...input, level: "technical", translate: (text) => `<t>${text}` });

  assert.ok(set.headline.startsWith("<t>"));
  assert.ok(set.summary.startsWith("<t>"));
  assert.ok(set.steps.every((step) => step.startsWith("<t>")));
  assert.deepEqual(set.technicalDetails, ["debug=true"]);
});
