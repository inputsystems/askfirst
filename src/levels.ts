/**
 * Explanation levels: one scale for how much detail a person wants, used by
 * every builder in the library.
 *
 * - "basic" — one calm sentence for people who just want to decide.
 * - "guided" — numbered steps for people who want to be walked through it.
 * - "technical" — the guided steps plus exact machine-readable details.
 */

/** How much detail to show: one sentence, numbered steps, or steps plus machine-readable details. */
export type ExplanationLevel = "basic" | "guided" | "technical";

/** All levels, in order of increasing detail. */
export const EXPLANATION_LEVELS: readonly ExplanationLevel[] = ["basic", "guided", "technical"];

/**
 * Translates one user-facing English string into another language. The
 * library's source strings are stable English sentences, so a
 * `Record<string, string>` lookup per locale is all an implementation needs.
 * Machine-readable fields (`technicalDetails`, ids, hashes) are never passed
 * through it.
 */
export type TranslateFn = (text: string) => string;

/** How much detail the person approving actions wants to see by default. */
export interface ExplanationPreferences {
  level: ExplanationLevel;
  /** Forces "technical" regardless of {@link ExplanationPreferences.level}. */
  showTechnicalApprovalDetails?: boolean;
}

/**
 * Maps loose user-supplied level names onto a supported
 * {@link ExplanationLevel}. Accepts friendly aliases: "beginner",
 * "walkthrough", and "step-by-step" normalize to "guided"; "concise"
 * normalizes to "basic". Unknown values fall back to "basic".
 */
export function normalizeExplanationLevel(level: string | undefined): ExplanationLevel {
  if (level === "basic" || level === "guided" || level === "technical") {
    return level;
  }

  if (level === "beginner" || level === "walkthrough" || level === "step-by-step") {
    return "guided";
  }

  return "basic";
}

/** Resolves preferences to a level; no preferences means "basic". */
export function levelFromPreferences(preferences: ExplanationPreferences | undefined): ExplanationLevel {
  if (!preferences) {
    return "basic";
  }

  if (preferences.level === "technical" || preferences.showTechnicalApprovalDetails) {
    return "technical";
  }

  return preferences.level;
}
