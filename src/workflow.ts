/**
 * Approval workflow: a small state machine that turns a packet's decision
 * into what an agent loop should do next — continue, pause for the user, or
 * stop and offer a safer path — and records the user's answer.
 */

import type { TranslateFn } from "./levels.js";
import { buildApprovalPacket, type ApprovalDecision, type ApprovalPacket, type ApprovalPacketInput } from "./packets.js";

/** Where an action sits in the approval loop: skipped, awaiting a decision, blocked, or resolved. */
export type ApprovalWorkflowState = "not-needed" | "waiting-for-user" | "blocked" | "approved" | "cancelled";

export interface ApprovalWorkflow {
  kind: "approval-workflow";
  state: ApprovalWorkflowState;
  decision: ApprovalDecision;
  packet: ApprovalPacket;
  /** Render-ready choice labels; the packet's user choices. */
  resumeChoices: string[];
  /** The state explained in one plain sentence. */
  plainState: string;
}

/** Builds the packet for an action and derives the workflow state from its decision. */
export function createApprovalWorkflow(
  action: string,
  options?: Omit<ApprovalPacketInput, "action">
): ApprovalWorkflow {
  const packet = buildApprovalPacket({ ...options, action });
  const state = stateFor(packet.decision);
  const t = options?.translate ?? identity;
  return {
    kind: "approval-workflow",
    state,
    decision: packet.decision,
    packet,
    resumeChoices: packet.userChoices,
    plainState: t(plainStateFor(state))
  };
}

/**
 * Records the user's answer on a workflow that is waiting for them, returning
 * a new workflow in the "approved" or "cancelled" state. Workflows in any
 * other state are returned unchanged — "not-needed" never asked, and
 * "blocked" cannot be approved.
 */
export function resolveApprovalWorkflow(
  workflow: ApprovalWorkflow,
  outcome: "approve" | "cancel",
  options?: { translate?: TranslateFn }
): ApprovalWorkflow {
  if (workflow.state !== "waiting-for-user") {
    return workflow;
  }

  const t = options?.translate ?? identity;
  const state = outcome === "approve" ? "approved" : "cancelled";
  return {
    ...workflow,
    state,
    resumeChoices: state === "approved" ? [t("Continue")] : [],
    plainState: t(plainStateFor(state))
  };
}

function stateFor(decision: ApprovalDecision): ApprovalWorkflowState {
  if (decision === "allow-automatically") return "not-needed";
  if (decision === "ask-first") return "waiting-for-user";
  return "blocked";
}

function plainStateFor(state: ApprovalWorkflowState): string {
  switch (state) {
    case "not-needed":
      return "This can continue without interrupting the user.";
    case "waiting-for-user":
      return "Pause and ask the user before continuing.";
    case "blocked":
      return "Do not continue. Offer a safer path.";
    case "approved":
      return "The user approved this step.";
    case "cancelled":
      return "The user cancelled this step.";
  }
}

function identity(text: string): string {
  return text;
}
