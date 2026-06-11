/**
 * Safe workspace planning: decide which boundary an action should run inside
 * (project folder, project environment, remote tunnel, manual approval, or
 * blocked) and describe the protections in plain language.
 */

import { levelFromPreferences, type ExplanationLevel, type ExplanationPreferences, type TranslateFn } from "./levels.js";
import { classifyAction } from "./risk.js";
import { buildTrustChecklist, type TrustChecklist } from "./trust.js";
import { concise } from "./text.js";

/** Basic-level plan messages are trimmed to fit this many characters. */
const BASIC_MESSAGE_BUDGET = 150;

/** The kinds of actions a workspace plan distinguishes. */
export type WorkspaceActionKind = "file-change" | "package-install" | "command-run" | "remote-connect" | "publish";

/** The protection boundary an action should run inside. */
export type WorkspaceBoundary =
  | "project-folder"
  | "project-environment"
  | "remote-tunnel"
  | "manual-approval"
  | "blocked";

/** A render-ready plan for where one action belongs and how it is protected. */
export interface SafeWorkspacePlan {
  actionKind: WorkspaceActionKind;
  level: ExplanationLevel;
  boundary: WorkspaceBoundary;
  title: string;
  message: string;
  actions: string[];
  protections: string[];
  /** True only when both the boundary and the risk classification allow it. */
  allowAutomatically: boolean;
  trustChecklist?: TrustChecklist;
  /** Present at the "guided" and "technical" levels. */
  details?: string[];
  /** Present at the "technical" level only; never translated. */
  technicalDetails?: string[];
}

export interface SafeWorkspacePlanInput {
  action: string;
  /** Overrides the inferred action kind. */
  kind?: WorkspaceActionKind;
  preferences?: ExplanationPreferences;
  /** Overrides the level for this one plan without changing preferences. */
  overrideLevel?: ExplanationLevel;
  /** Optional hook to localize every user-facing string in the plan. */
  translate?: TranslateFn;
}

/** Plans the workspace boundary and protections for one action. */
export function planSafeWorkspace(input: SafeWorkspacePlanInput): SafeWorkspacePlan {
  const level = input.overrideLevel ?? levelFromPreferences(input.preferences);
  const t = input.translate ?? identity;
  const kind = input.kind ?? inferActionKind(input.action);
  const risk = classifyAction(input.action);
  const allowByDefault = risk === "green";
  const template = templateFor(kind, risk === "red", allowByDefault);
  const trustChecklist = trustChecklistFor(kind, input.translate);
  const base = {
    actionKind: kind,
    level,
    boundary: template.boundary,
    title: t(template.title),
    message: level === "basic" ? concise(t(template.message), BASIC_MESSAGE_BUDGET) : t(template.message),
    actions: template.actions.map((action) => t(action)),
    protections: template.protections.map((protection) => t(protection)),
    allowAutomatically: template.allowAutomatically,
    trustChecklist
  };

  if (level === "technical") {
    return {
      ...base,
      details: template.details.map((detail) => t(detail)),
      technicalDetails: [
        `actionKind=${kind}`,
        `boundary=${template.boundary}`,
        `risk=${risk}`,
        `allowByDefault=${allowByDefault}`,
        `allowAutomatically=${template.allowAutomatically}`,
        `action=${input.action}`,
        ...template.technicalDetails
      ]
    };
  }

  if (level === "guided") {
    return {
      ...base,
      details: template.details.map((detail) => t(detail))
    };
  }

  return base;
}

function inferActionKind(action: string): WorkspaceActionKind {
  if (/npm\s+install|pnpm\s+add|yarn\s+add|pip\s+install|uv\s+add/i.test(action)) {
    return "package-install";
  }

  if (/ssh\b|scp\b|rsync\b/i.test(action)) {
    return "remote-connect";
  }

  if (/rm\s+|mv\s+|cp\s+|write|create|delete|edit/i.test(action)) {
    return "file-change";
  }

  if (/git\s+push|\bpublish\b|\bdeploy\b/i.test(action)) {
    return "publish";
  }

  return "command-run";
}

function templateFor(
  kind: WorkspaceActionKind,
  blocked: boolean,
  actionAllowsDefault: boolean
): {
  boundary: WorkspaceBoundary;
  title: string;
  message: string;
  actions: string[];
  protections: string[];
  details: string[];
  technicalDetails: string[];
  allowAutomatically: boolean;
} {
  if (blocked) {
    return {
      boundary: "blocked",
      title: "This needs a careful review",
      message:
        "This is paused before running because it could reach beyond this project or touch private information.",
      actions: ["Review", "Choose a safer way", "Details"],
      protections: [
        "This is paused before it can run",
        "The agent must explain why it is needed",
        "A safer way is offered when possible"
      ],
      details: [
        "This will not run automatically.",
        "A safer project-only option should be tried first.",
        "The exact technical action is available to inspect before deciding."
      ],
      technicalDetails: ["automaticExecution=false", "requiresExplicitApproval=true", "saferAlternativeRequired=true"],
      allowAutomatically: false
    };
  }

  if (kind === "file-change") {
    return {
      boundary: "project-folder",
      title: "Change project files safely",
      message: "This change can stay inside the project folder with a way to undo it.",
      actions: ["Apply safely", "Preview changes", "Details"],
      protections: [
        "Changes stay inside the project folder",
        "You can preview changed files",
        "A saved copy is kept so changes can be undone"
      ],
      details: [
        "Only files in the project should be changed.",
        "Files that hold secrets or are produced automatically stay protected unless clearly requested.",
        "What changed should be visible before important approvals."
      ],
      technicalDetails: ["writeBoundary=project-root", "checkpointBeforeWrite=true", "secretPatternsProtected=true"],
      allowAutomatically: actionAllowsDefault
    };
  }

  if (kind === "package-install") {
    return {
      boundary: "project-environment",
      title: "Add packages in this project only",
      message: "Packages should be added inside this project so other software on the computer is not changed.",
      actions: ["Add to project", "Ask why", "Details"],
      protections: [
        "Anything added stays inside this project",
        "An exact record is kept of what was added",
        "Guidance is shown for judging the package"
      ],
      details: [
        "Packages should be tied to the current project.",
        "Each new package should come with a reason tied to the requested feature.",
        "The package source and license should be reviewable."
      ],
      technicalDetails: ["dependencyScope=project", "lockfileRequired=true", "systemInstall=false"],
      allowAutomatically: false
    };
  }

  if (kind === "remote-connect") {
    return {
      boundary: "remote-tunnel",
      title: "Connect only to the intended computer",
      message: "The connection should stay private and protected, and be tested before real use.",
      actions: ["Test connection", "Change computer", "Details"],
      protections: [
        "The computer's name is confirmed first",
        "The connection stays private",
        "The connection is tested before real use"
      ],
      details: [
        "Remote access should be used only for a known computer or trusted server.",
        "Remote services should stay behind SSH or a private network.",
        "Connection details should not be shown publicly."
      ],
      technicalDetails: ["connectionBoundary=ssh-or-private-network", "preflightRequired=true"],
      allowAutomatically: false
    };
  }

  if (kind === "publish") {
    return {
      boundary: "manual-approval",
      title: "Review before sharing",
      message: "Saving online, publishing, or sharing project code should be approved first.",
      actions: ["Review changes", "Keep local", "Details"],
      protections: [
        "Private files are checked first",
        "The destination is shown clearly",
        "Nothing is shared without your approval"
      ],
      details: [
        "Saving locally is the safer default.",
        "Publishing can share files outside this computer.",
        "Where the code is going should be clearly visible."
      ],
      technicalDetails: [
        "remoteWriteRequiresApproval=true",
        "secretScanRequired=true",
        "destinationPreviewRequired=true"
      ],
      allowAutomatically: false
    };
  }

  return {
    boundary: actionAllowsDefault ? "project-folder" : "manual-approval",
    title: "Run with project safeguards",
    message: "This should run only with a clear purpose and project-level safeguards.",
    actions: ["Run safely", "Ask why", "Details"],
    protections: [
      "The purpose is explained first",
      "Changes to your whole computer are avoided",
      "The result is shown when it finishes"
    ],
    details: [
      "Commands should be tied to the project goal.",
      "Changes to your whole computer need separate approval.",
      "The result should be shown in plain language when the command finishes."
    ],
    technicalDetails: ["executionScope=project", "systemChangeApproval=required", "outputSummary=required"],
    allowAutomatically: actionAllowsDefault
  };
}

function trustChecklistFor(kind: WorkspaceActionKind, translate?: TranslateFn): TrustChecklist | undefined {
  if (kind === "package-install") {
    return buildTrustChecklist("package", { translate });
  }

  if (kind === "remote-connect") {
    return buildTrustChecklist("remote", { translate });
  }

  if (kind === "publish" || kind === "command-run") {
    return buildTrustChecklist("general", { translate });
  }

  return undefined;
}

function identity(text: string): string {
  return text;
}
