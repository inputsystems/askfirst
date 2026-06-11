/**
 * Verifies one locale pack against the harvested source strings:
 *
 *   npx tsx scripts/check-locale.ts de
 */

import { collectSourceStrings } from "../src/locales/harvest.js";

const locale = process.argv[2];
if (!locale) {
  console.error("usage: npx tsx scripts/check-locale.ts <locale>");
  process.exit(1);
}

const pack: Record<string, string> = (await import(`../src/locales/${locale}.js`)).default;
const source = collectSourceStrings();
const keys = new Set(Object.keys(pack));

const missing = source.filter((entry) => !keys.has(entry));
const extra = [...keys].filter((entry) => !source.includes(entry));
const empty = Object.entries(pack)
  .filter(([, value]) => typeof value !== "string" || value.trim() === "")
  .map(([key]) => key);

if (missing.length || extra.length || empty.length) {
  console.error(`${locale}: FAIL`);
  if (missing.length) console.error(`missing (${missing.length}):`, missing.slice(0, 10));
  if (extra.length) console.error(`extra (${extra.length}):`, extra.slice(0, 10));
  if (empty.length) console.error(`empty (${empty.length}):`, empty.slice(0, 10));
  process.exit(1);
}

console.log(`${locale}: OK — ${source.length} strings covered`);
