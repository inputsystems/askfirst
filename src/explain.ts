/**
 * The flagship entry point: classify a technical action by risk and explain
 * it the way you would to a careful, non-expert friend — what it is, why the
 * agent wants it, what it costs, and how to judge it before approving.
 */

import { buildInstructionSet, type InstructionSet } from "./instructions.js";
import { normalizeExplanationLevel, type ExplanationLevel, type TranslateFn } from "./levels.js";
import { classifyAction, type RiskLevel } from "./risk.js";
import { buildTrustChecklist, type TrustChecklist } from "./trust.js";

/** A plain-language explanation of one technical action, built by {@link explainAction}. */
export interface ActionExplanation {
  risk: RiskLevel;
  /** What the agent is trying to do, in one calm sentence. */
  plain: string;
  /** Why an agent would want this, so the request makes sense. */
  why: string;
  /** The goal the action serves. */
  purpose: string;
  benefits: string[];
  tradeoffs: string[];
  /** How to judge this kind of action, with neutral references. */
  trustChecklist: TrustChecklist;
  /** The original action text, unchanged. */
  technical: string;
  /** True only for routine ("green") work. */
  allowByDefault: boolean;
  /** The same guidance at the requested explanation level. */
  instructions: InstructionSet;
}

export interface ExplainActionOptions {
  /** Accepts {@link ExplanationLevel} values and friendly aliases like "beginner". */
  level?: ExplanationLevel | (string & {});
  /** Optional hook to localize every user-facing string in the explanation. */
  translate?: TranslateFn;
}

interface ActionDecisionContext {
  plain: string;
  why: string;
  purpose: string;
  benefits: string[];
  tradeoffs: string[];
  conciseStep: string;
  walkthroughSteps: string[];
  trustChecklist: TrustChecklist;
}

// Red actions are presented as paused ("Only let this run…"), never with an
// "Approve…" step, so the copy always matches the choices a packet offers.
function decisionContextForAction(
  risk: RiskLevel,
  technical: string,
  translate?: TranslateFn
): ActionDecisionContext {
  if (technical.trim() === "") {
    return {
      plain: "The agent tried to act but did not say what it wants to do.",
      why: "An empty or unclear action cannot be checked, so it is safer to pause and ask.",
      purpose: "Find out what the agent is actually trying to do.",
      benefits: [
        "Stops an unclear step from running unnoticed.",
        "Gives you a chance to ask what was intended."
      ],
      tradeoffs: [
        "There is nothing to review until the agent explains.",
        "The agent may simply need to try the step again."
      ],
      conciseStep: "Ask the agent what it is trying to do before letting anything run.",
      walkthroughSteps: [
        "Ask the agent to describe the action in plain words.",
        "Confirm what it is meant to accomplish.",
        "Continue only once the action is clear."
      ],
      trustChecklist: buildTrustChecklist("general", { translate })
    };
  }

  if (/npm\s+install|pnpm\s+add|yarn\s+add/i.test(technical)) {
    return {
      plain: "The agent wants to add a package — a ready-made piece of software — to this project.",
      why: "Many features are faster and safer to build with an existing, well-tested package than from scratch.",
      purpose: "Add code the project can use, such as validation, UI helpers, data handling, or build tooling.",
      benefits: [
        "Can make the requested feature faster to build.",
        "Can rely on a maintained library instead of custom code.",
        "Can reduce bugs when the package is well-known and appropriate."
      ],
      tradeoffs: [
        "Adds code from outside the project.",
        "May increase project size or install time.",
        "The package name and source should match the feature being built."
      ],
      conciseStep: "Approve if this package clearly supports the feature you asked for.",
      walkthroughSteps: [
        "Read the package name and ask whether it sounds related to your requested feature.",
        "Ask what this package does that would be slow or risky to build by hand.",
        "Remember the tradeoff: it adds outside code to your project.",
        "Approve if the reason makes sense, or ask the agent to do it without adding anything new."
      ],
      trustChecklist: buildTrustChecklist("package", { translate })
    };
  }

  if (/pip\s+install|uv\s+add/i.test(technical)) {
    return {
      plain: "The agent wants to add a Python package — a ready-made piece of software — to this project.",
      why: "The requested feature may need an existing Python tool for app logic, data processing, testing, or automation.",
      purpose: "Install a reusable Python tool or library for this project.",
      benefits: [
        "Can unlock a feature that would be slow to build manually.",
        "Can use common, tested Python tools.",
        "Can keep the project code smaller."
      ],
      tradeoffs: [
        "Adds code from outside the project.",
        "Should be added to this project only, not your whole computer.",
        "The package should be relevant to the project."
      ],
      conciseStep: "Approve if this package clearly helps with what you asked for and is added only to this project.",
      walkthroughSteps: [
        "Read the package name.",
        "Check whether it directly helps with the thing you asked for.",
        "Confirm it will be installed for this project, not used to change your whole computer.",
        "Approve if that all makes sense, or ask the agent to explain its choice first."
      ],
      trustChecklist: buildTrustChecklist("package", { translate })
    };
  }

  if (/curl\s+[\s\S]*\|\s*(?:sh|bash)|wget\s+[\s\S]*\|\s*(?:sh|bash)/i.test(technical)) {
    return {
      plain: "The agent wants to run an installer from the internet.",
      why: "Some tools publish one-line installers, and the agent may be trying to set up something needed for your project.",
      purpose: "Download setup instructions and run them so a required tool becomes available.",
      benefits: [
        "Can quickly install a tool needed to build or run the project.",
        "May follow the official setup path for that tool.",
        "Can get the work moving again when the tool is missing."
      ],
      tradeoffs: [
        "Runs code before you have reviewed what it does.",
        "Depends on the source being trustworthy and correct.",
        "A slower manual install may be easier to inspect."
      ],
      conciseStep: "Only let this run when the source is clearly official and this installer is necessary for the project.",
      walkthroughSteps: [
        "Look at the web address shown in the details and confirm it is the tool's official site.",
        "Ask the agent why this tool is needed for your project.",
        "Ask whether there is a slower but more reviewable install option.",
        "Only let this run if the source and reason make sense to you."
      ],
      trustChecklist: buildTrustChecklist("installer", { translate })
    };
  }

  if (/sudo\b/i.test(technical)) {
    return {
      plain: "The agent wants permission to change something outside the project folder.",
      why: "Some computer-level tools need administrator permission before the project can use them.",
      purpose: "Change a computer-level setting or install a tool that normal project commands cannot modify.",
      benefits: [
        "Can fix missing computer-level tools.",
        "Can make the project build or run when a computer-level piece is required.",
        "Can avoid a long manual setup if the command is correct."
      ],
      tradeoffs: [
        "Affects your whole computer, not just this project.",
        "May ask for your computer password.",
        "Usually deserves a clear explanation before it runs."
      ],
      conciseStep: "Only let this run if the agent explains why project-only changes are not enough.",
      walkthroughSteps: [
        "Ask what this changes on the computer.",
        "Ask why the project cannot continue without that change.",
        "Check whether there is a project-only alternative.",
        "Only let this run if you are comfortable changing your whole computer for it."
      ],
      trustChecklist: buildTrustChecklist("installer", { translate })
    };
  }

  if (/\brm\s+(?:-[a-z]*r[a-z]*\s*)+/i.test(technical)) {
    const routine = risk === "yellow";
    if (routine) {
      return {
        plain: "The agent wants to clean up generated project files.",
        why: "The tools that build the project create folders that are safe to remove, and clearing them fixes many problems.",
        purpose: "Remove generated files so they can be rebuilt cleanly.",
        benefits: [
          "Can fix problems caused by stale or broken files.",
          "Can free up space and reduce clutter.",
          "Can prepare the project for a clean rebuild."
        ],
        tradeoffs: [
          "The removed files will need to be rebuilt or reinstalled.",
          "Rebuilding can take time on slow connections.",
          "The target should be a generated folder, not source code."
        ],
        conciseStep: "Approve if rebuilding these generated files later is fine.",
        walkthroughSteps: [
          "Read exactly which files or folders would be deleted.",
          "Confirm the target is a generated folder that can be rebuilt.",
          "Ask for a saved copy first if you are unsure.",
          "Approve only when you are comfortable losing what is listed."
        ],
        trustChecklist: buildTrustChecklist("general", { translate })
      };
    }

    return {
      plain:
        "The agent wants to permanently delete files — and the target could reach beyond routine cleanup, possibly including personal files.",
      why: "Deleting can be part of cleanup, but deleted files usually cannot be brought back — so this needs a careful look first.",
      purpose: "Remove files or folders the agent believes are no longer needed.",
      benefits: [
        "Can clear out things that really are no longer needed.",
        "Can free up space and reduce clutter.",
        "Can prepare for a clean rebuild when the target is right."
      ],
      tradeoffs: [
        "Deleted files usually cannot be recovered.",
        "The target may include things you still need.",
        "A saved copy first is much safer."
      ],
      conciseStep: "Pause and read exactly what would be deleted — deleted files usually cannot be brought back.",
      walkthroughSteps: [
        "Read exactly which files or folders would be deleted.",
        "Ask whether anything in the target is still needed.",
        "Ask for a saved copy first if you are unsure.",
        "Only let this run when you are sure you can lose everything listed."
      ],
      trustChecklist: buildTrustChecklist("general", { translate })
    };
  }

  if (/ssh-keygen\b/i.test(technical)) {
    return {
      plain: "The agent wants to create a new digital key — like making a new house key for connecting to another computer.",
      why: "Connecting to another computer securely needs a key pair, and creating one is a normal setup step.",
      purpose: "Create a key the project can use for secure connections.",
      benefits: [
        "Lets the project connect to another computer without a password.",
        "The new key is created locally on this computer.",
        "A standard, well-understood setup step."
      ],
      tradeoffs: [
        "The private half of the key must stay on this computer.",
        "Anyone who gets the private key can act as you on systems that accept it.",
        "The key file should never be shared or published."
      ],
      conciseStep: "Pause until the agent confirms this creates a brand-new key and shares nothing.",
      walkthroughSteps: [
        "Ask what the new key will be used for.",
        "Confirm the key stays on this computer and out of anything shared or published.",
        "Only let this run if you expected a setup step like this."
      ],
      trustChecklist: buildTrustChecklist("general", { translate })
    };
  }

  if (/id_rsa|id_ed25519|\.env(?!\.example)\b|AWS_SECRET|OPENAI_API_KEY|PRIVATE_KEY/i.test(technical)) {
    return {
      plain: "The agent wants to work with keys, credentials, or other secret material.",
      why: "Some setup steps involve secrets, and they deserve special care because anyone who has them can act as you.",
      purpose: "Create, read, or change a password, key, or other secret the project may need.",
      benefits: [
        "Can finish a setup step that genuinely needs a secret.",
        "Can keep secrets in the standard place tools expect.",
        "Can avoid a manual copy-paste of sensitive values."
      ],
      tradeoffs: [
        "Secret files affect every system that trusts them.",
        "Mistakes here are harder to undo than normal project edits.",
        "Secrets should never end up in shared or published files."
      ],
      conciseStep: "Pause until you know which password, key, or other secret this involves — and why.",
      walkthroughSteps: [
        "Ask which password, key, or secret file this involves.",
        "Ask why the project needs it for the feature you asked for.",
        "Confirm the secret stays local and out of anything shared or published.",
        "Only let this run when those answers make sense to you."
      ],
      trustChecklist: buildTrustChecklist("general", { translate })
    };
  }

  if (/ssh\b/i.test(technical)) {
    return {
      plain: "The agent wants to connect to another computer.",
      why: "This can be needed for deployment, remote development, or checking a server that runs part of the project.",
      purpose: "Use another trusted computer as part of the development workflow.",
      benefits: [
        "Can do work on another computer that is better suited for the job.",
        "Can keep services private instead of exposing them to the public internet.",
        "Can make remote setup smoother."
      ],
      tradeoffs: [
        "Requires the address and user to be correct.",
        "Depends on trust in the remote computer.",
        "Keys and connection details should not be shared publicly."
      ],
      conciseStep: "Approve if this is the server or computer you intended to use.",
      walkthroughSteps: [
        "Check that the computer name or address is one you recognize.",
        "Check that the username is yours or the one you expected.",
        "Confirm the connection is for the feature you asked for.",
        "Approve if the destination is trusted."
      ],
      trustChecklist: buildTrustChecklist("remote", { translate })
    };
  }

  if (/scp\b|rsync\b/i.test(technical)) {
    return {
      plain: "The agent wants to copy files between this computer and another one.",
      why: "Moving files to or from a remote computer is common for deploying, backing up, or sharing project files.",
      purpose: "Transfer files to or from another computer the project uses.",
      benefits: [
        "Can move project files to where they are needed.",
        "Can back up or deploy work to another computer.",
        "Can avoid copying files by hand."
      ],
      tradeoffs: [
        "The destination should be a computer you trust.",
        "Private files should not be sent somewhere they do not belong.",
        "The address and path should be the ones you expected."
      ],
      conciseStep: "Approve if the files and the other computer are the ones you intended.",
      walkthroughSteps: [
        "Check which files are being copied.",
        "Check that the other computer's address is one you recognize.",
        "Confirm no private files are included by mistake.",
        "Approve if the transfer is the one you expected."
      ],
      trustChecklist: buildTrustChecklist("remote", { translate })
    };
  }

  if (/git\s+push/i.test(technical)) {
    return {
      plain: "The agent wants to upload the project's saved progress to where it is stored online.",
      why: "Uploading shares progress so it is backed up or visible to collaborators.",
      purpose: "Send the project's saved changes to its online storage place.",
      benefits: [
        "Backs up the work outside this computer.",
        "Makes collaboration and review easier.",
        "Can protect progress before larger changes."
      ],
      tradeoffs: [
        "Depending on the destination, other people may be able to see the code.",
        "Private files should not be included.",
        "The destination should be the project's own storage place."
      ],
      conciseStep: "Approve if you want these changes uploaded to the project's online storage.",
      walkthroughSteps: [
        "Review what changed.",
        "Check that no private files are included.",
        "Check where the changes are being uploaded.",
        "Approve if this is the publish step you expected."
      ],
      trustChecklist: buildTrustChecklist("general", { translate })
    };
  }

  if (/git\s+commit/i.test(technical)) {
    return {
      plain: "The agent wants to save a snapshot of the project's progress.",
      why: "Saving progress makes it easy to review changes or go back to this point later.",
      purpose: "Record the current project state so it can be reviewed or restored later.",
      benefits: [
        "Saves your progress so you can go back to this point later.",
        "Makes it easier to review what changed.",
        "Can protect progress before larger changes."
      ],
      tradeoffs: [
        "The note attached to the save should describe the work accurately.",
        "Private files should not be included.",
        "Saving locally does not back up the work online."
      ],
      conciseStep: "Approve if the included changes are the ones you want saved.",
      walkthroughSteps: [
        "Review what changed.",
        "Check that no private files are included.",
        "Read the note describing the save.",
        "Approve if this is the save point you expected."
      ],
      trustChecklist: buildTrustChecklist("general", { translate })
    };
  }

  // Only the risky permission changes (e.g. chmod 777) get the cautious copy;
  // routine ones like `chmod +x` are green and fall through to the calm path.
  if (risk === "red" && /chmod\b|chown\b/i.test(technical)) {
    return {
      plain: "The agent wants to change who is allowed to open, change, or run a file.",
      why: "Some tools only work when a file is marked as runnable, so the agent may be adjusting that.",
      purpose: "Change a file's permission settings so a step in the project can proceed.",
      benefits: [
        "Can let a needed script or tool actually run.",
        "Can fix permission-denied errors.",
        "Takes effect immediately without installing anything."
      ],
      tradeoffs: [
        "Opening a file to everyone lets any program or person on the computer change or run it.",
        "Loose permissions are a common cause of security problems.",
        "A narrower permission usually does the same job more safely."
      ],
      conciseStep: "Only let this run if the agent explains why this exact file needs looser permissions.",
      walkthroughSteps: [
        "Ask which file this changes and why.",
        "Ask whether a narrower permission would work instead.",
        "Be extra careful if it opens the file to everyone on the computer.",
        "Only let this run when the reason is clear."
      ],
      trustChecklist: buildTrustChecklist("general", { translate })
    };
  }

  if (/docker\b|podman\b/i.test(technical)) {
    return {
      plain: "The agent wants to start or manage the project's services — helper programs that run in the background.",
      why: "Many projects need a database or another background service running before the app itself can work.",
      purpose: "Start, stop, or configure the background services this project uses.",
      benefits: [
        "Can get the project running end-to-end.",
        "Keeps services packaged so they are easy to start and stop cleanly.",
        "Usually avoids changing the rest of your computer."
      ],
      tradeoffs: [
        "Services keep running and use memory until they are stopped.",
        "May download large pieces the first time it runs.",
        "Services can open local network connections while they run."
      ],
      conciseStep: "Approve if you asked for something that needs the project running.",
      walkthroughSteps: [
        "Ask which services would start and why the project needs them.",
        "Expect a wait the first time while pieces download.",
        "Approve if this matches what you asked for.",
        "Ask how to stop the services later if you are unsure."
      ],
      trustChecklist: buildTrustChecklist("general", { translate })
    };
  }

  if (risk === "green") {
    return {
      plain: "The agent wants to continue with a normal project action.",
      why: "This looks like ordinary work inside the project, such as reading files, checking output, or editing project files.",
      purpose: "Move the project closer to the thing you asked for.",
      benefits: [
        "Keeps the work moving without extra interruptions.",
        "Usually stays within the project folder.",
        "Helps the agent inspect or update the project."
      ],
      tradeoffs: [
        "You may still want to review visible changes.",
        "The agent should keep changes related to your request.",
        "Unexpected edits can be reverted if caught early."
      ],
      conciseStep: "Let this continue if it matches your request.",
      walkthroughSteps: [
        "Check that the action is related to what you asked for.",
        "Let it continue.",
        "Review the result when the agent finishes the step."
      ],
      trustChecklist: buildTrustChecklist("general", { translate })
    };
  }

  return {
    plain:
      risk === "red"
        ? "The agent wants to do something that could reach beyond this project, so it is paused for a closer look."
        : "The agent wants to make a change that is worth a quick look before it runs.",
    why: "This is not one of the routine actions this tool recognizes, so it is safer to have you glance at it.",
    purpose: "Complete a step that may be necessary for the feature you asked for.",
    benefits: [
      "Can get the work moving again.",
      "Can set up tools or files the project needs.",
      "Can help the agent complete the requested feature."
    ],
    tradeoffs: [
      "May change more than a simple file edit.",
      "You should understand the destination, package, or file area involved.",
      "There may be a slower but more reviewable alternative."
    ],
    conciseStep: "Read what the agent says this is for, and continue only if that matches what you asked for.",
    walkthroughSteps: [
      "Read what the agent is trying to accomplish.",
      "Compare the benefits with the tradeoffs.",
      "Ask for a simpler explanation if anything seems unrelated.",
      "Continue only when the action clearly supports your goal."
    ],
    trustChecklist: buildTrustChecklist("general", { translate })
  };
}

/**
 * Explains one technical action (usually a shell command) in plain language.
 * `options.level` controls instruction depth ("basic" by default), and
 * `options.translate` localizes every user-facing string.
 */
export function explainAction(technical: string, options?: ExplainActionOptions): ActionExplanation {
  const level = normalizeExplanationLevel(options?.level);
  const translate = options?.translate;
  const t = translate ?? identity;
  const risk = classifyAction(technical);
  const context = decisionContextForAction(risk, technical, translate);
  const allowByDefault = risk === "green";

  return {
    risk,
    plain: t(context.plain),
    why: t(context.why),
    purpose: t(context.purpose),
    benefits: context.benefits.map((benefit) => t(benefit)),
    tradeoffs: context.tradeoffs.map((tradeoff) => t(tradeoff)),
    trustChecklist: context.trustChecklist,
    technical,
    allowByDefault,
    // Copy is translated unit-by-unit here (not as composed sentences), so a
    // string-table translate function can match every piece.
    instructions: buildInstructionSet({
      level,
      headline: t(context.plain),
      summary: `${t(context.why)} ${t("Benefit:")} ${t(context.benefits[0])} ${t("Tradeoff:")} ${t(context.tradeoffs[0])}`,
      conciseStep: t(context.conciseStep),
      walkthroughSteps: context.walkthroughSteps.map((step) => t(step)),
      technicalDetails: [
        `risk=${risk}`,
        `allowByDefault=${allowByDefault}`,
        `command=${technical}`
      ]
    })
  };
}

function identity(text: string): string {
  return text;
}
