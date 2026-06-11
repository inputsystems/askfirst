import assert from "node:assert/strict";
import test from "node:test";
import { buildNotification } from "../src/index.js";

test("basic notifications stay short and calm", () => {
  const notification = buildNotification({ kind: "approval-needed" });

  assert.equal(notification.level, "basic");
  assert.equal(notification.title, "Your approval is needed");
  assert.equal(notification.details, undefined);
  assert.equal(notification.technicalDetails, undefined);
});

test("long basic messages drop trailing sentences, never cutting mid-word", () => {
  const reason = "The first sentence stays whole. The second sentence also fits inside the limit. This third sentence pushes the message past the basic budget.";
  const notification = buildNotification({ kind: "approval-needed", reason });

  assert.equal(
    notification.message,
    "The first sentence stays whole. The second sentence also fits inside the limit."
  );
});

test("a long first sentence is kept whole rather than chopped", () => {
  const reason = `${"word ".repeat(40).trim()}.`;
  const notification = buildNotification({ kind: "approval-needed", reason });

  assert.equal(notification.message, reason);
});

test("guided notifications include guidance and tradeoff details", () => {
  const notification = buildNotification({ kind: "approval-needed", level: "guided", tradeoff: "Costs time." });

  assert.equal(notification.details?.length, 2);
  assert.ok(notification.details?.includes("Costs time."));
});

test("technical notifications carry machine-readable details", () => {
  const notification = buildNotification({
    kind: "approval-needed",
    level: "technical",
    technicalDetails: ["decision=ask-first"]
  });

  assert.deepEqual(notification.technicalDetails, ["decision=ask-first"]);
});

test("custom kinds can override title and actions", () => {
  const notification = buildNotification({
    kind: "deploy-confirm",
    title: "Ready to deploy",
    actions: ["Deploy", "Hold"]
  });

  assert.equal(notification.kind, "deploy-confirm");
  assert.equal(notification.title, "Ready to deploy");
  assert.deepEqual(notification.actions, ["Deploy", "Hold"]);
});

test("a translate function localizes title message and actions", () => {
  const notification = buildNotification({ kind: "approval-needed", level: "guided", translate: (text) => `<t>${text}` });

  assert.ok(notification.title.startsWith("<t>"));
  assert.ok(notification.message.startsWith("<t>"));
  assert.ok(notification.actions.every((action) => action.startsWith("<t>")));
  assert.ok(notification.details?.every((detail) => detail.startsWith("<t>")));
});
