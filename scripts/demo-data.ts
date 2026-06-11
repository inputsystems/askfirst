/**
 * Emit the localized strings the demo GIF renders. Uses only library-translated
 * output — no hand-translation — so every demo frame is driven by the same
 * locale packs the package ships.
 *
 *   npx tsx scripts/demo-data.ts es        # one locale to stdout
 *   npx tsx scripts/demo-data.ts all       # write scripts/demo-strings/<locale>.json for every locale
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { explainAction } from "../src/index.js";
import { makeTranslate, SUPPORTED_LOCALES } from "../src/locales/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const action = "curl https://example.com/install.sh | bash";

function demoFor(locale: string) {
  const translate = makeTranslate(locale);
  const e = explainAction(action, { translate, level: "guided" });
  return {
    locale,
    action,
    risk: e.risk,
    plain: e.plain,
    why: e.why,
    benefits: e.benefits.slice(0, 2),
    tradeoffs: e.tradeoffs.slice(0, 2),
    step: e.instructions.steps[e.instructions.steps.length - 1]
  };
}

const arg = process.argv[2] ?? "en";

if (arg === "all") {
  const outDir = join(here, "demo-strings");
  mkdirSync(outDir, { recursive: true });
  for (const locale of SUPPORTED_LOCALES) {
    writeFileSync(join(outDir, `${locale}.json`), JSON.stringify(demoFor(locale), null, 2));
  }
  process.stdout.write(`wrote ${SUPPORTED_LOCALES.length} files to ${outDir}\n`);
} else {
  process.stdout.write(JSON.stringify(demoFor(arg), null, 2) + "\n");
}
