/**
 * Trust checklists: short, neutral "how to judge this" guidance backed by
 * well-known public institutions, so approval prompts teach instead of scare.
 */

import type { TranslateFn } from "./levels.js";

/** Stable ids for the neutral institutions the checklists cite. */
export type TrustReferenceId = "openssf" | "owasp" | "osi" | "spdx" | "eff" | "cisa";

/** The kinds of actions a checklist can teach someone to judge. */
export type TrustChecklistKind = "package" | "installer" | "remote" | "license" | "general";

/** One neutral institution a checklist can point to for further reading. */
export interface TrustReference {
  id: TrustReferenceId;
  label: string;
  url: string;
  /** One-sentence description of why this source is worth trusting. */
  plain: string;
  /** The topics this source is best for. */
  bestFor: string[];
}

/** "How to judge this" guidance for one kind of action. */
export interface TrustChecklist {
  prompt: string;
  checks: string[];
  references: TrustReference[];
}

/** The neutral institutions cited by the built-in checklists, keyed by id. */
export const TRUST_REFERENCES: Record<TrustReferenceId, TrustReference> = {
  openssf: {
    id: "openssf",
    label: "OpenSSF",
    url: "https://openssf.org/",
    plain: "OpenSSF publishes practical guidance for open-source software supply-chain security.",
    bestFor: ["judging packages", "project health", "how software is built and delivered", "where software really comes from"]
  },
  owasp: {
    id: "owasp",
    label: "OWASP",
    url: "https://owasp.org/",
    plain: "OWASP is a nonprofit foundation with widely used app security education and checklists.",
    bestFor: ["app security basics", "common risks", "beginner security education"]
  },
  osi: {
    id: "osi",
    label: "Open Source Initiative",
    url: "https://opensource.org/",
    plain: "OSI maintains the Open Source Definition and helps users understand open-source licensing.",
    bestFor: ["open-source licenses", "license legitimacy", "license education"]
  },
  spdx: {
    id: "spdx",
    label: "SPDX",
    url: "https://spdx.dev/",
    plain: "SPDX provides standard license identifiers and software bill-of-materials formats.",
    bestFor: ["standard license names", "keeping track of what software includes"]
  },
  eff: {
    id: "eff",
    label: "Electronic Frontier Foundation",
    url: "https://www.eff.org/",
    plain: "EFF publishes accessible privacy, encryption, and digital rights education.",
    bestFor: ["privacy", "encryption", "digital keys", "learning about remote access"]
  },
  cisa: {
    id: "cisa",
    label: "CISA",
    url: "https://www.cisa.gov/",
    plain: "CISA is a public cybersecurity agency with practical security guidance for individuals and organizations.",
    bestFor: ["general cybersecurity guidance", "safe setup habits", "public security advisories"]
  }
};

function buildBaseTrustChecklist(kind: TrustChecklistKind): TrustChecklist {
  if (kind === "package") {
    return {
      prompt: "How to judge this package",
      checks: [
        "Check whether the package name matches the feature being built.",
        "Prefer packages linked from the official project or a well-known registry page.",
        "Look for signs of maintenance, such as recent releases, documentation, and a clear license.",
        "If the package seems unrelated, ask the agent why it chose it — or ask for a way to do this without adding anything new."
      ],
      references: [TRUST_REFERENCES.openssf, TRUST_REFERENCES.owasp, TRUST_REFERENCES.osi, TRUST_REFERENCES.spdx]
    };
  }

  if (kind === "installer") {
    return {
      prompt: "How to judge this installer",
      checks: [
        "Confirm the link is from the official project or documentation.",
        "Check that the tool is necessary for what you asked for.",
        "Prefer a more reviewable install method when you are unsure.",
        "Ask the agent to explain what the installer changes before approving."
      ],
      references: [TRUST_REFERENCES.openssf, TRUST_REFERENCES.owasp, TRUST_REFERENCES.cisa]
    };
  }

  if (kind === "remote") {
    return {
      prompt: "How to judge this connection",
      checks: [
        "Confirm the computer name, address, and user are the ones you expected.",
        "Only connect to computers you control or trust.",
        "Avoid sharing keys, passwords, or connection details in public places.",
        "Ask why the connection is needed if it is not obvious."
      ],
      references: [TRUST_REFERENCES.eff, TRUST_REFERENCES.cisa, TRUST_REFERENCES.owasp]
    };
  }

  if (kind === "license") {
    return {
      prompt: "How to judge this license",
      checks: [
        "Look for a clear license name.",
        "Check whether the license allows your intended use.",
        "Use standard license identifiers when possible.",
        "Treat unclear licensing as something to review before including it in a product or selling it."
      ],
      references: [TRUST_REFERENCES.osi, TRUST_REFERENCES.spdx]
    };
  }

  return {
    prompt: "How to judge this action",
    checks: [
      "Check whether the action clearly supports what you asked for.",
      "Compare the benefits with the tradeoffs.",
      "Ask for a simpler explanation if the action seems unrelated.",
      "Prefer official sources and project-local changes when possible."
    ],
    references: [TRUST_REFERENCES.openssf, TRUST_REFERENCES.owasp, TRUST_REFERENCES.cisa]
  };
}

/**
 * Builds the trust checklist for a kind of action. Pass `translate` to render
 * the prompt, checks, and reference descriptions in another language; without
 * it the English source strings are returned unchanged. The returned
 * references are copies — mutating them never affects {@link TRUST_REFERENCES}.
 */
export function buildTrustChecklist(
  kind: TrustChecklistKind,
  options?: { translate?: TranslateFn }
): TrustChecklist {
  const base = buildBaseTrustChecklist(kind);
  const t = options?.translate ?? ((text: string) => text);

  return {
    prompt: t(base.prompt),
    checks: base.checks.map((check) => t(check)),
    references: base.references.map((reference) => ({
      ...reference,
      plain: t(reference.plain),
      bestFor: reference.bestFor.map((topic) => t(topic))
    }))
  };
}
