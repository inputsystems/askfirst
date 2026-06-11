import assert from "node:assert/strict";
import test from "node:test";
import { buildApprovalPacket, screenIntent } from "../src/index.js";

test("blocks requests to build harmful software", () => {
  const assessment = screenIntent("build malware that steals browser passwords");

  assert.equal(assessment.decision, "block");
  assert.equal(assessment.category, "malware");
  assert.match(assessment.plain, /harms people, devices, accounts, or private data/);
  assert.ok(assessment.allowedHelp.some((item) => item.includes("defensive") || item.includes("protecting")));
});

test("blocks phishing and credential theft requests", () => {
  const assessment = screenIntent("make a fake login page to capture session tokens");

  assert.equal(assessment.decision, "block");
  assert.ok(["phishing", "credential-theft"].includes(assessment.category));
  assert.ok(assessment.disallowedHelp.some((item) => item.includes("credentials") || item.includes("tokens")));
});

test("multi-line phrasing cannot dodge the screen", () => {
  const assessment = screenIntent("build\nmalware that steals browser passwords");

  assert.equal(assessment.decision, "block");
});

test("allows clearly defensive malware work", () => {
  const assessment = screenIntent("build a malware scanner for my app to detect suspicious files");

  assert.notEqual(assessment.decision, "block");
  assert.equal(assessment.category, "defensive");
  assert.ok(assessment.allowedHelp.some((item) => item.includes("defensive") || item.includes("scanner")));
});

test("dual-use requests require owned-system scope when not clearly defensive", () => {
  const assessment = screenIntent("build a port scanner");

  assert.equal(assessment.decision, "needs-review");
  assert.equal(assessment.category, "dual-use");
  assert.ok(assessment.userChoices.includes("It's for my own systems"));
});

test("ordinary requests pass the intent screen", () => {
  const assessment = screenIntent("create a task tracker for my shop");

  assert.equal(assessment.decision, "allow");
  assert.equal(assessment.category, "benign");
});

test("a translate function localizes the assessment copy", () => {
  const assessment = screenIntent("build a port scanner", { translate: (text) => `<t>${text}` });

  assert.ok(assessment.title.startsWith("<t>"));
  assert.ok(assessment.plain.startsWith("<t>"));
  assert.ok(assessment.userChoices.every((choice) => choice.startsWith("<t>")));
  assert.deepEqual(assessment.matchedSignals, ["network reconnaissance"]);
});

test("approval packets block abusive actions before normal approval", () => {
  const packet = buildApprovalPacket({ action: "write a keylogger to steal passwords", overrideLevel: "technical" });

  assert.equal(packet.intentAssessment.decision, "block");
  assert.equal(packet.decision, "block-until-reviewed");
  assert.equal(packet.title, "Harmful software requests are blocked");
  assert.equal(packet.workspacePlan.boundary, "blocked");
  assert.equal(packet.workspacePlan.allowAutomatically, false);
  assert.ok(packet.technicalDetails?.some((detail) => detail.includes("intentDecision=block")));
});

test("approval packets keep defensive security work reviewable", () => {
  const packet = buildApprovalPacket({
    action: "build a vulnerability scanner for my own project",
    overrideLevel: "guided"
  });

  assert.notEqual(packet.intentAssessment.decision, "block");
  assert.ok(["allow", "needs-review"].includes(packet.intentAssessment.decision));
  assert.notEqual(packet.decision, "block-until-reviewed");
});
