/**
 * askfirst/locales — batteries-included translations for every user-facing
 * string the library renders, in the 17 locales listed in
 * {@link SUPPORTED_LOCALES}. `makeTranslate(locale)` plugs straight into any
 * builder's `translate` option.
 */

import type { TranslateFn } from "../levels.js";
import ar from "./ar.js";
import de from "./de.js";
import es from "./es.js";
import fr from "./fr.js";
import he from "./he.js";
import hi from "./hi.js";
import id from "./id.js";
import ja from "./ja.js";
import ko from "./ko.js";
import ms from "./ms.js";
import ptBR from "./pt-BR.js";
import tl from "./tl.js";
import tr from "./tr.js";
import vi from "./vi.js";
import zh from "./zh.js";
import zhHant from "./zh-Hant.js";

export { collectSourceStrings } from "./harvest.js";

export const SUPPORTED_LOCALES = [
  "en",
  "ar",
  "de",
  "es",
  "fr",
  "he",
  "hi",
  "id",
  "ja",
  "ko",
  "ms",
  "pt-BR",
  "tl",
  "tr",
  "vi",
  "zh",
  "zh-Hant"
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const PACKS: Record<SupportedLocale, Record<string, string>> = {
  en: {},
  ar,
  de,
  es,
  fr,
  he,
  hi,
  id,
  ja,
  ko,
  ms,
  "pt-BR": ptBR,
  tl,
  tr,
  vi,
  zh,
  "zh-Hant": zhHant
};

/** Returns the raw string table for a supported locale ("en" is empty — the source is English). */
export function localeStrings(locale: SupportedLocale): Readonly<Record<string, string>> {
  return PACKS[locale];
}

/**
 * Builds a translate function for a locale, ready to pass to any builder's
 * `translate` option. Accepts BCP-47-style tags and falls back gracefully:
 * "de-AT" matches "de", "pt" matches "pt-BR", and unknown locales return the
 * English source strings unchanged.
 */
export function makeTranslate(locale: SupportedLocale | (string & {})): TranslateFn {
  const resolved = resolveLocale(locale);
  if (!resolved || resolved === "en") {
    return (text) => text;
  }

  const pack = PACKS[resolved];
  return (text) => pack[text] ?? text;
}

function resolveLocale(locale: string): SupportedLocale | undefined {
  const supported = SUPPORTED_LOCALES as readonly string[];

  // Exact match, then progressively strip subtags: "zh-Hant-TW" → "zh-Hant".
  let candidate = locale;
  while (candidate) {
    if (supported.includes(candidate)) {
      return candidate as SupportedLocale;
    }

    const separator = candidate.lastIndexOf("-");
    candidate = separator === -1 ? "" : candidate.slice(0, separator);
  }

  // Base-language match: "pt" → "pt-BR".
  const base = locale.split("-")[0];
  return SUPPORTED_LOCALES.find((entry) => entry.startsWith(`${base}-`));
}
