/**
 * Explain any shell command the way you would to a careful friend.
 *
 *   npx tsx examples/explain-cli.ts "curl https://example.com/install.sh | bash"
 *   npx tsx examples/explain-cli.ts "npm install zod" guided
 */

import { explainAction } from "../src/index.js";

const action = process.argv[2] ?? "curl https://example.com/install.sh | bash";
const level = process.argv[3];

const badge = { green: "🟢 LOW RISK", yellow: "🟡 NEEDS A LOOK", red: "🔴 STOP AND REVIEW" } as const;
const explanation = explainAction(action, { level });

console.log(`\n${badge[explanation.risk]}  ${explanation.technical}\n`);
console.log(`What:  ${explanation.plain}`);
console.log(`Why:   ${explanation.why}`);
console.log(`Goal:  ${explanation.purpose}\n`);

console.log("Benefits:");
for (const benefit of explanation.benefits) console.log(`  + ${benefit}`);
console.log("Tradeoffs:");
for (const tradeoff of explanation.tradeoffs) console.log(`  - ${tradeoff}`);

console.log(`\nWhat to do (${explanation.instructions.level}):`);
explanation.instructions.steps.forEach((step, index) => console.log(`  ${index + 1}. ${step}`));

console.log(`\n${explanation.trustChecklist.prompt}:`);
for (const check of explanation.trustChecklist.checks) console.log(`  • ${check}`);
console.log("Learn more:");
for (const reference of explanation.trustChecklist.references) {
  console.log(`  ${reference.label} — ${reference.url}`);
}

console.log();
