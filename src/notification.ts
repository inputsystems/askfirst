/**
 * Approval notifications: the message shown to a human when their decision
 * is needed, rendered at the depth they asked for (basic, guided, technical).
 */

import type { ExplanationLevel, TranslateFn } from "./levels.js";
import { concise } from "./text.js";

/** Basic-level notification messages are trimmed to fit this many characters. */
const BASIC_MESSAGE_BUDGET = 140;

/** "approval-needed" is built in; consumers may use their own kind strings. */
export type NotificationKind = "approval-needed" | (string & {});

/** A render-ready notification at one {@link ExplanationLevel}. */
export interface ApprovalNotification {
  kind: NotificationKind;
  level: ExplanationLevel;
  title: string;
  message: string;
  actions: string[];
  /** Present at the "guided" and "technical" levels. */
  details?: string[];
  /** Present at the "technical" level only; never translated. */
  technicalDetails?: string[];
}

export interface NotificationInput {
  kind: NotificationKind;
  level?: ExplanationLevel;
  /** Overrides the built-in title — useful with custom kinds. */
  title?: string;
  /** Overrides the built-in action labels. */
  actions?: string[];
  /** The reason this decision is needed; falls back to built-in copy. */
  reason?: string;
  /** The tradeoff worth knowing before deciding; falls back to built-in copy. */
  tradeoff?: string;
  /** Overrides the built-in "what to do" guidance line. */
  guidance?: string;
  technicalDetails?: string[];
  /** Optional hook to localize the title, message, actions, and details. */
  translate?: TranslateFn;
}

/** Builds a notification at the requested level from one shared source of copy. */
export function buildNotification(input: NotificationInput): ApprovalNotification {
  const level = input.level ?? "basic";
  const t = input.translate ?? identity;
  const base = baseNotification();
  const title = t(input.title ?? base.title);
  const message = t(input.reason ?? base.message);
  const actions = (input.actions ?? base.actions).map((action) => t(action));
  const guidance = t(input.guidance ?? base.guidance);
  const tradeoff = t(input.tradeoff ?? base.tradeoff);

  if (level === "technical") {
    return {
      kind: input.kind,
      level,
      title,
      message,
      actions,
      details: [guidance, tradeoff],
      technicalDetails: input.technicalDetails ?? []
    };
  }

  if (level === "guided") {
    return {
      kind: input.kind,
      level,
      title,
      message,
      actions,
      details: [guidance, tradeoff]
    };
  }

  return {
    kind: input.kind,
    level,
    title,
    message: concise(message, BASIC_MESSAGE_BUDGET),
    actions
  };
}

function baseNotification(): { title: string; message: string; guidance: string; tradeoff: string; actions: string[] } {
  return {
    title: "Your approval is needed",
    message: "The agent wants to do something that may help your project.",
    guidance: "Review what it is trying to do, then approve or ask for another option.",
    tradeoff: "Approving can move the work forward, but you should understand the change.",
    actions: ["Approve", "Ask why", "Details"]
  };
}

function identity(text: string): string {
  return text;
}
