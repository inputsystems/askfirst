import assert from "node:assert/strict";
import test from "node:test";
import { buildTrustChecklist, TRUST_REFERENCES } from "../src/index.js";

test("trust references include neutral software security and license sources", () => {
  const ids = Object.values(TRUST_REFERENCES).map((item) => item.id);

  assert.ok(ids.includes("openssf"));
  assert.ok(ids.includes("owasp"));
  assert.ok(ids.includes("osi"));
  assert.ok(ids.includes("spdx"));
});

test("package trust checklist links to OpenSSF OWASP OSI and SPDX", () => {
  const checklist = buildTrustChecklist("package");
  const ids = checklist.references.map((item) => item.id);

  assert.equal(checklist.prompt, "How to judge this package");
  assert.ok(ids.includes("openssf"));
  assert.ok(ids.includes("owasp"));
  assert.ok(ids.includes("osi"));
  assert.ok(ids.includes("spdx"));
});

test("license checklist teaches license judgment", () => {
  const checklist = buildTrustChecklist("license");

  assert.equal(checklist.prompt, "How to judge this license");
  assert.deepEqual(
    checklist.references.map((item) => item.id),
    ["osi", "spdx"]
  );
});

test("a translate function localizes prompt checks and reference text", () => {
  const checklist = buildTrustChecklist("package", { translate: (text) => `<t>${text}` });

  assert.ok(checklist.prompt.startsWith("<t>"));
  assert.ok(checklist.checks.every((check) => check.startsWith("<t>")));
  assert.ok(checklist.references.every((reference) => reference.plain.startsWith("<t>")));
  assert.ok(checklist.references.every((reference) => reference.bestFor.every((topic) => topic.startsWith("<t>"))));
  assert.ok(checklist.references.every((reference) => reference.url.startsWith("https://")));
});

test("mutating a returned checklist never affects the shared references", () => {
  const checklist = buildTrustChecklist("package");
  checklist.references[0].plain = "vandalized";

  assert.notEqual(buildTrustChecklist("package").references[0].plain, "vandalized");
  assert.notEqual(TRUST_REFERENCES.openssf.plain, "vandalized");
});
