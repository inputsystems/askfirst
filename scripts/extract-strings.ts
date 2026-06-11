/**
 * Prints every translatable source string as JSON. Used when building or
 * updating locale packs:
 *
 *   npx tsx scripts/extract-strings.ts > strings.json
 */

import { collectSourceStrings } from "../src/locales/harvest.js";

console.log(JSON.stringify(collectSourceStrings(), null, 2));
