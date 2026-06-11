import assert from "node:assert/strict";
import test from "node:test";
import { planSafeWorkspace } from "../src/index.js";

test("normal file changes stay inside the project folder", () => {
  const plan = planSafeWorkspace({ action: "edit src/app.ts" });

  assert.equal(plan.actionKind, "file-change");
  assert.equal(plan.level, "basic");
  assert.equal(plan.boundary, "project-folder");
  assert.equal(plan.allowAutomatically, true);
  assert.ok(plan.protections.includes("Changes stay inside the project folder"));
  assert.equal(plan.technicalDetails, undefined);
});

test("package installs require project environment and trust guidance", () => {
  const plan = planSafeWorkspace({ action: "npm install zod", overrideLevel: "guided" });

  assert.equal(plan.actionKind, "package-install");
  assert.equal(plan.boundary, "project-environment");
  assert.equal(plan.allowAutomatically, false);
  assert.ok(plan.trustChecklist);
  assert.ok(plan.details?.some((detail) => detail.includes("current project")));
});

test("remote connections use tunnel boundary and can show technical details", () => {
  const plan = planSafeWorkspace({ action: "ssh -L 8080:localhost:8080 devbox", overrideLevel: "technical" });

  assert.equal(plan.actionKind, "remote-connect");
  assert.equal(plan.boundary, "remote-tunnel");
  assert.equal(plan.allowAutomatically, false);
  assert.ok(plan.technicalDetails?.some((detail) => detail.includes("connectionBoundary=ssh-or-private-network")));
});

test("publishing requires manual approval", () => {
  const plan = planSafeWorkspace({ action: "git push origin main" });

  assert.equal(plan.actionKind, "publish");
  assert.equal(plan.boundary, "manual-approval");
  assert.deepEqual(plan.actions, ["Review changes", "Keep local", "Details"]);
  assert.equal(plan.allowAutomatically, false);
});

test("dangerous actions are blocked for careful review", () => {
  const plan = planSafeWorkspace({ action: "sudo rm -rf /", overrideLevel: "technical" });

  assert.equal(plan.boundary, "blocked");
  assert.equal(plan.allowAutomatically, false);
  assert.ok(plan.technicalDetails?.some((detail) => detail.includes("automaticExecution=false")));
});

test("every red classification blocks consistently", () => {
  assert.equal(planSafeWorkspace({ action: "chmod 777 deploy.sh" }).boundary, "blocked");
  assert.equal(planSafeWorkspace({ action: "cat .env" }).boundary, "blocked");
  assert.equal(planSafeWorkspace({ action: "rm -rf ~" }).boundary, "blocked");
});

test("green commands run inside the project folder boundary", () => {
  const plan = planSafeWorkspace({ action: "ls -la" });

  assert.equal(plan.actionKind, "command-run");
  assert.equal(plan.boundary, "project-folder");
  assert.equal(plan.allowAutomatically, true);
});

test("file names containing publish-like words are still file changes", () => {
  const plan = planSafeWorkspace({ action: "edit publish.ts" });

  assert.equal(plan.actionKind, "file-change");
});

test("basic safe workspace wording avoids scary technical jargon", () => {
  const plan = planSafeWorkspace({ action: "create a todo app file" });
  const text = `${plan.title} ${plan.message}`.toLowerCase();

  assert.doesNotMatch(text, /sandbox|chmod|sudo|shell|symlink|permission denied|spawn/);
});

test("explanation preferences choose the default level", () => {
  const guided = planSafeWorkspace({
    action: "npm install zod",
    preferences: { level: "guided" }
  });
  const technical = planSafeWorkspace({
    action: "npm install zod",
    preferences: { level: "basic", showTechnicalApprovalDetails: true }
  });

  assert.equal(guided.level, "guided");
  assert.equal(technical.level, "technical");
  assert.ok(technical.technicalDetails?.length);
});

test("a translate function localizes the plan copy", () => {
  const plan = planSafeWorkspace({ action: "npm install zod", overrideLevel: "guided", translate: (text) => `<t>${text}` });

  assert.ok(plan.title.startsWith("<t>"));
  assert.ok(plan.message.startsWith("<t>"));
  assert.ok(plan.actions.every((action) => action.startsWith("<t>")));
  assert.ok(plan.protections.every((protection) => protection.startsWith("<t>")));
  assert.ok(plan.details?.every((detail) => detail.startsWith("<t>")));
  assert.ok(plan.trustChecklist?.prompt.startsWith("<t>"));
});
