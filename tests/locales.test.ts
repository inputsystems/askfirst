import assert from "node:assert/strict";
import test from "node:test";
import {
  SUPPORTED_LOCALES,
  collectSourceStrings,
  localeStrings,
  makeTranslate
} from "../src/locales/index.js";
import { buildTrustChecklist } from "../src/index.js";

const source = collectSourceStrings();

// Every non-English locale must cover exactly the source string set.
for (const locale of SUPPORTED_LOCALES) {
  if (locale === "en") continue;

  test(`${locale}: covers all source strings`, () => {
    const pack = localeStrings(locale);
    const keys = new Set(Object.keys(pack));

    const missing = source.filter((s) => !keys.has(s));
    const extra = [...keys].filter((s) => !source.includes(s));

    assert.equal(missing.length, 0, `missing keys: ${missing.slice(0, 5).join(", ")}`);
    assert.equal(extra.length, 0, `extra keys: ${extra.slice(0, 5).join(", ")}`);
  });

  test(`${locale}: no empty translations`, () => {
    const pack = localeStrings(locale);
    const empty = Object.entries(pack)
      .filter(([, v]) => typeof v !== "string" || v.trim() === "")
      .map(([k]) => k);

    assert.equal(empty.length, 0, `empty values: ${empty.slice(0, 5).join(", ")}`);
  });
}

test("makeTranslate returns identity for English", () => {
  const t = makeTranslate("en");
  assert.equal(t("hello world"), "hello world");
});

test("makeTranslate returns identity for unknown locale", () => {
  const t = makeTranslate("xx-UNKNOWN");
  assert.equal(t("hello world"), "hello world");
});

test("makeTranslate BCP-47 subtag stripping: de-AT resolves to de", () => {
  const t = makeTranslate("de-AT");
  const deT = makeTranslate("de");

  const sample = source[0];
  assert.equal(t(sample), deT(sample));
});

test("makeTranslate base-language match: pt resolves to pt-BR", () => {
  const t = makeTranslate("pt");
  const ptBR = makeTranslate("pt-BR");

  const sample = source[0];
  assert.equal(t(sample), ptBR(sample));
});

test("makeTranslate plugs into buildTrustChecklist end-to-end (es)", () => {
  const t = makeTranslate("es");
  const checklist = buildTrustChecklist("package", { translate: t });

  // The prompt must differ from the English source — translation is active.
  assert.notEqual(checklist.prompt, "How to judge this package");
  assert.ok(checklist.prompt.length > 0);
  // Every check string must be non-empty.
  assert.ok(checklist.checks.every((c) => c.length > 0));
});

test("makeTranslate plugs into buildTrustChecklist end-to-end (ja)", () => {
  const t = makeTranslate("ja");
  const checklist = buildTrustChecklist("installer", { translate: t });

  assert.notEqual(checklist.prompt, "How to judge this installer");
  assert.ok(checklist.prompt.length > 0);
});

test("makeTranslate falls back to English for untranslated keys", () => {
  const t = makeTranslate("de");
  const untranslated = "this string does not exist in any pack";
  assert.equal(t(untranslated), untranslated);
});
