/**
 * Progressive instructions: the same guidance rendered at three depths, so a
 * UI can switch between a one-line decision, a walkthrough, and full
 * technical detail without separate copy.
 */

import { normalizeExplanationLevel, type ExplanationLevel, type TranslateFn } from "./levels.js";

/** The source copy an {@link InstructionSet} is rendered from. */
export interface InstructionSetInput {
  /** Accepts {@link ExplanationLevel} values and friendly aliases like "beginner". */
  level?: ExplanationLevel | (string & {});
  headline: string;
  summary: string;
  /** The single step shown at the "basic" level. */
  conciseStep: string;
  /** The numbered steps shown at the "guided" and "technical" levels. */
  walkthroughSteps: string[];
  /** Machine-readable details appended at the "technical" level only. */
  technicalDetails?: string[];
  /** Optional hook to localize the headline, summary, and steps. */
  translate?: TranslateFn;
}

/** Guidance rendered at one {@link ExplanationLevel}. */
export interface InstructionSet {
  level: ExplanationLevel;
  headline: string;
  summary: string;
  steps: string[];
  /** Present at the "technical" level only; never translated. */
  technicalDetails?: string[];
}

/** Builds an {@link InstructionSet} at the requested level from one shared source of copy. */
export function buildInstructionSet(input: InstructionSetInput): InstructionSet {
  const level = normalizeExplanationLevel(input.level);
  const t = input.translate ?? identity;

  if (level === "technical") {
    return {
      level,
      headline: t(input.headline),
      summary: t(input.summary),
      steps: input.walkthroughSteps.map((step) => t(step)),
      technicalDetails: input.technicalDetails ?? []
    };
  }

  if (level === "guided") {
    return {
      level,
      headline: t(input.headline),
      summary: t(input.summary),
      steps: input.walkthroughSteps.map((step) => t(step))
    };
  }

  return {
    level,
    headline: t(input.headline),
    summary: t(input.summary),
    steps: [t(input.conciseStep)]
  };
}

function identity(text: string): string {
  return text;
}
