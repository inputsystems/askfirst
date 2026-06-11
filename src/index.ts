/**
 * askfirst — human-approval UX for AI agents and CLIs.
 *
 * Explain risky actions in plain language before a human approves them:
 * risk classification, trust checklists, progressive instructions, safe
 * workspace boundaries, intent screening, and ready-to-render approval
 * packets with a small workflow state machine on top.
 */

export {
  EXPLANATION_LEVELS,
  levelFromPreferences,
  normalizeExplanationLevel,
  type ExplanationLevel,
  type ExplanationPreferences,
  type TranslateFn
} from "./levels.js";

export { classifyAction, type RiskLevel } from "./risk.js";

export { explainAction, type ActionExplanation, type ExplainActionOptions } from "./explain.js";

export { buildInstructionSet, type InstructionSet, type InstructionSetInput } from "./instructions.js";

export {
  buildTrustChecklist,
  TRUST_REFERENCES,
  type TrustChecklist,
  type TrustChecklistKind,
  type TrustReference,
  type TrustReferenceId
} from "./trust.js";

export {
  buildNotification,
  type ApprovalNotification,
  type NotificationInput,
  type NotificationKind
} from "./notification.js";

export {
  planSafeWorkspace,
  type SafeWorkspacePlan,
  type SafeWorkspacePlanInput,
  type WorkspaceActionKind,
  type WorkspaceBoundary
} from "./workspace.js";

export {
  screenIntent,
  type IntentAssessment,
  type IntentCategory,
  type IntentDecision,
  type ScreenIntentOptions
} from "./intent.js";

export {
  buildApprovalPacket,
  type ApprovalAuditPreview,
  type ApprovalDecision,
  type ApprovalPacket,
  type ApprovalPacketInput,
  type SafetyPolicy
} from "./packets.js";

export {
  createApprovalWorkflow,
  resolveApprovalWorkflow,
  type ApprovalWorkflow,
  type ApprovalWorkflowState
} from "./workflow.js";
