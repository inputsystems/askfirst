/**
 * Approval packets: everything a UI needs to ask a human one clear question
 * about one action — the decision, plain-language summary, choices,
 * notification copy, risk explanation, workspace plan, intent screen, and a
 * privacy-preserving audit preview.
 */

import { explainAction, type ActionExplanation } from "./explain.js";
import { screenIntent, type IntentAssessment } from "./intent.js";
import { levelFromPreferences, type ExplanationLevel, type ExplanationPreferences, type TranslateFn } from "./levels.js";
import { buildNotification, type ApprovalNotification } from "./notification.js";
import { planSafeWorkspace, type SafeWorkspacePlan, type WorkspaceActionKind, type WorkspaceBoundary } from "./workspace.js";

/** The authoritative call for an action: run it, ask the user, or block it. */
export type ApprovalDecision = "allow-automatically" | "ask-first" | "block-until-reviewed";

/**
 * Identifies the safety policy a packet was built under, so audit records can
 * say which rules were active. Supply your own via
 * {@link ApprovalPacketInput.policy}; the library default identifies its own
 * built-in rules.
 */
export interface SafetyPolicy {
  version: string;
  hash: string;
}

export interface ApprovalPacketInput {
  action: string;
  /** Overrides the inferred workspace action kind. */
  kind?: WorkspaceActionKind;
  preferences?: ExplanationPreferences;
  /** Overrides the level for this one packet without changing preferences. */
  overrideLevel?: ExplanationLevel;
  /** Optional hook to localize every user-facing string in the packet. */
  translate?: TranslateFn;
  policy?: SafetyPolicy;
}

/**
 * What an audit record would contain. The action appears only as a stable
 * hash — a correlation identifier, not a cryptographic commitment — so
 * decisions can be logged without logging the raw command.
 */
export interface ApprovalAuditPreview {
  event: "approval-preview";
  actionHash: string;
  decision: ApprovalDecision;
  boundary: WorkspaceBoundary;
  risk: ActionExplanation["risk"];
  policyVersion: string;
  policyHash: string;
  storesRawAction: boolean;
  plain: string;
}

/** A render-ready approval request for one action. */
export interface ApprovalPacket {
  action: string;
  level: ExplanationLevel;
  /** The authoritative outcome; everything else is presentation. */
  decision: ApprovalDecision;
  title: string;
  plainSummary: string;
  userChoices: string[];
  notification: ApprovalNotification;
  intentAssessment: IntentAssessment;
  actionExplanation: ActionExplanation;
  workspacePlan: SafeWorkspacePlan;
  auditPreview: ApprovalAuditPreview;
  policy: SafetyPolicy;
  /** Present at the "technical" level only; never translated. */
  technicalDetails?: string[];
}

const BOUNDARY_SUMMARY: Record<WorkspaceBoundary, { allow: string; ask: string }> = {
  "project-folder": {
    allow: "It can continue safely — it stays inside this project's folder, with a way to undo changes.",
    ask: "It needs your OK first. If you approve, it stays inside this project's folder, with a way to undo changes."
  },
  "project-environment": {
    allow: "It can continue — anything added is kept inside this project only, not your whole computer.",
    ask: "It needs your OK first. If you approve, anything added is kept inside this project only, not your whole computer."
  },
  "remote-tunnel": {
    allow: "It can continue — the connection is kept private and checked before use.",
    ask: "It needs your OK first. If you approve, the connection is kept private and checked before use."
  },
  "manual-approval": {
    allow: "It can continue once you have reviewed it.",
    ask: "It needs your OK first."
  },
  blocked: {
    allow: "It is paused until you review it.",
    ask: "It is paused until you review it."
  }
};

/** Builds the complete approval packet for one action. */
export function buildApprovalPacket(input: ApprovalPacketInput): ApprovalPacket {
  const level = input.overrideLevel ?? levelFromPreferences(input.preferences);
  const t = input.translate ?? identity;
  const policy = input.policy ?? defaultPolicy();
  const intentAssessment = screenIntent(input.action, { translate: input.translate });
  const actionExplanation = explainAction(input.action, { level, translate: input.translate });
  const rawWorkspacePlan = planSafeWorkspace({
    action: input.action,
    kind: input.kind,
    preferences: input.preferences,
    overrideLevel: level,
    translate: input.translate
  });
  const workspacePlan =
    intentAssessment.decision === "block"
      ? {
          ...rawWorkspacePlan,
          boundary: "blocked" as const,
          title: t("Blocked by intent screening"),
          message: intentAssessment.plain,
          actions: intentAssessment.userChoices,
          protections: [
            t("Harmful software is never built"),
            t("Safer, protective alternatives are offered"),
            t("Records are kept without saving private details")
          ],
          allowAutomatically: false,
          technicalDetails:
            level === "technical"
              ? [
                  "boundary=blocked",
                  "allowAutomatically=false",
                  "automaticExecution=false",
                  `intentDecision=${intentAssessment.decision}`,
                  `intentCategory=${intentAssessment.category}`,
                  `matchedSignals=${intentAssessment.matchedSignals.join(",") || "none"}`
                ]
              : rawWorkspacePlan.technicalDetails
        }
      : rawWorkspacePlan;
  const decision = decisionFor(actionExplanation, workspacePlan, intentAssessment);
  const title = titleFor(decision, intentAssessment, t);
  const plainSummary = summaryFor(decision, workspacePlan, actionExplanation, intentAssessment, t);
  // Intent blocks keep the intent screen's own choices (already translated);
  // risk blocks get review-oriented choices — never "Approve" on a paused action.
  const userChoices =
    intentAssessment.decision === "block"
      ? intentAssessment.userChoices
      : choicesFor(decision).map((choice) => t(choice));
  // Copy passed to the notification is already translated, so no translate
  // hook is forwarded — that would translate the strings twice.
  const notification = buildNotification({
    kind: "approval-needed",
    level,
    title,
    actions: userChoices,
    reason: plainSummary,
    guidance: t("Review what it is trying to do, then approve or ask for another option."),
    tradeoff: sentenceList(workspacePlan.protections),
    technicalDetails: [
      `decision=${decision}`,
      `risk=${actionExplanation.risk}`,
      `boundary=${workspacePlan.boundary}`,
      `allowAutomatically=${workspacePlan.allowAutomatically}`,
      `intentDecision=${intentAssessment.decision}`,
      `intentCategory=${intentAssessment.category}`,
      `policyHash=${policy.hash}`
    ]
  });
  const auditPreview = buildAuditPreview(input.action, decision, workspacePlan, actionExplanation, policy, t);
  const packet: ApprovalPacket = {
    action: input.action,
    level,
    decision,
    title,
    plainSummary,
    userChoices,
    notification,
    intentAssessment,
    actionExplanation,
    workspacePlan,
    auditPreview,
    policy
  };

  if (level === "technical") {
    packet.technicalDetails = [
      `actionKind=${workspacePlan.actionKind}`,
      `workspaceBoundary=${workspacePlan.boundary}`,
      `risk=${actionExplanation.risk}`,
      `allowByDefault=${actionExplanation.allowByDefault}`,
      `allowAutomatically=${workspacePlan.allowAutomatically}`,
      `decision=${decision}`,
      `intentDecision=${intentAssessment.decision}`,
      `intentCategory=${intentAssessment.category}`,
      `policyVersion=${policy.version}`,
      `policyHash=${policy.hash}`,
      `auditActionHash=${auditPreview.actionHash}`
    ];
  }

  return packet;
}

const DEFAULT_POLICY_VERSION = "0.1.0";

function defaultPolicy(): SafetyPolicy {
  return {
    version: DEFAULT_POLICY_VERSION,
    hash: stableActionHash(`askfirst-default-policy-${DEFAULT_POLICY_VERSION}`)
  };
}

function decisionFor(
  actionExplanation: ActionExplanation,
  workspacePlan: SafeWorkspacePlan,
  intentAssessment: IntentAssessment
): ApprovalDecision {
  if (intentAssessment.decision === "block") {
    return "block-until-reviewed";
  }

  if (workspacePlan.boundary === "blocked" || actionExplanation.risk === "red") {
    return "block-until-reviewed";
  }

  if (intentAssessment.decision === "needs-review") {
    return "ask-first";
  }

  if (workspacePlan.allowAutomatically && actionExplanation.allowByDefault) {
    return "allow-automatically";
  }

  return "ask-first";
}

function titleFor(decision: ApprovalDecision, intentAssessment: IntentAssessment, t: TranslateFn): string {
  if (intentAssessment.decision === "block") {
    return intentAssessment.title;
  }

  if (decision === "allow-automatically") {
    return t("Ready to continue safely");
  }

  if (decision === "block-until-reviewed") {
    return t("Review before continuing");
  }

  return t("Your approval is needed");
}

function summaryFor(
  decision: ApprovalDecision,
  workspacePlan: SafeWorkspacePlan,
  actionExplanation: ActionExplanation,
  intentAssessment: IntentAssessment,
  t: TranslateFn
): string {
  if (intentAssessment.decision === "block") {
    return intentAssessment.plain;
  }

  if (intentAssessment.decision === "needs-review") {
    return `${intentAssessment.plain} ${t("It needs your OK first, and should stay limited to what you agreed to.")}`;
  }

  if (decision === "block-until-reviewed") {
    return `${actionExplanation.plain} ${t(
      "It is paused because it could reach beyond this project or touch private information."
    )}`;
  }

  const phrases = BOUNDARY_SUMMARY[workspacePlan.boundary];
  return `${actionExplanation.plain} ${t(decision === "allow-automatically" ? phrases.allow : phrases.ask)}`;
}

function choicesFor(decision: ApprovalDecision): string[] {
  if (decision === "allow-automatically") {
    return ["Continue", "Preview", "Details"];
  }

  if (decision === "block-until-reviewed") {
    return ["Review the details", "Choose a safer way", "Cancel"];
  }

  return ["Approve", "Ask why", "Choose a safer way", "Details"];
}

function buildAuditPreview(
  action: string,
  decision: ApprovalDecision,
  workspacePlan: SafeWorkspacePlan,
  actionExplanation: ActionExplanation,
  policy: SafetyPolicy,
  t: TranslateFn
): ApprovalAuditPreview {
  return {
    event: "approval-preview",
    actionHash: stableActionHash(action),
    decision,
    boundary: workspacePlan.boundary,
    risk: actionExplanation.risk,
    policyVersion: policy.version,
    policyHash: policy.hash,
    storesRawAction: false,
    plain: t("A record of this decision can be kept without saving the exact technical command.")
  };
}

/** Renders short protection phrases as one readable sentence list. */
function sentenceList(items: string[]): string {
  return items.map((item) => (item.endsWith(".") ? item : `${item}.`)).join(" ");
}

/** 64-bit FNV-1a over UTF-16 code units; dependency-free and runtime-agnostic. */
function stableActionHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < value.length; i++) {
    hash ^= BigInt(value.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, "0");
}

function identity(text: string): string {
  return text;
}
