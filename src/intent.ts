/**
 * Intent screening: a lightweight, pattern-based gate that catches requests
 * to build harmful software before any approval flow begins, and redirects
 * them toward defensive or educational alternatives.
 *
 * This is a UX-layer prefilter, not an abuse-detection system. Pair it with
 * model-side refusal behavior and your own policy enforcement.
 */

import type { TranslateFn } from "./levels.js";

/** What to do with a request: let it through, ask for scope, or block it. */
export type IntentDecision = "allow" | "needs-review" | "block";

/** The kind of request a screen matched, from benign through dual-use to clearly harmful. */
export type IntentCategory =
  | "benign"
  | "defensive"
  | "dual-use"
  | "credential-theft"
  | "phishing"
  | "evasion"
  | "unauthorized-access"
  | "malware";

/** The result of screening one request, built by {@link screenIntent}. */
export interface IntentAssessment {
  decision: IntentDecision;
  category: IntentCategory;
  confidence: "low" | "medium" | "high";
  /** A short, calm headline for the decision. */
  title: string;
  /** The decision explained in plain language. */
  plain: string;
  /** What help remains appropriate. */
  allowedHelp: string[];
  /** What help must not be given. */
  disallowedHelp: string[];
  /** Render-ready choices for the person. */
  userChoices: string[];
  /** Which screening signals matched; stable ids, never translated. */
  matchedSignals: string[];
  technicalDetails: string[];
}

export interface ScreenIntentOptions {
  /** Optional hook to localize every user-facing string in the assessment. */
  translate?: TranslateFn;
}

/** One harmful-intent rule: an internal id, its category, and the matcher. */
interface IntentRule {
  id: string;
  category: IntentCategory;
  match: RegExp;
}

/** One dual-use rule: an internal id and the matcher (category is always dual-use). */
interface DualUseRule {
  id: string;
  match: RegExp;
}

// Ordering is load-bearing: the first matching rule wins, so a request that
// touches several categories is reported under the earliest one listed here.
const HARMFUL_INTENT_RULES: readonly IntentRule[] = [
  {
    id: "malware authoring",
    category: "malware",
    match:
      /\b(write|build|create|generate|make|code)\b[\s\S]{0,60}\b(ransomware|keylogger|rootkit|trojan|botnet|malware|worm|wiper)\b/i
  },
  {
    id: "destructive payload",
    category: "malware",
    match:
      /\b(payload|dropper|persistence|auto[- ]?start)\b[\s\S]{0,80}\b(stealth|victim|infect|spread|ransom|encrypt files)\b/i
  },
  {
    id: "secret exfiltration",
    category: "credential-theft",
    match:
      /\b(steal|harvest|exfiltrate|dump|grab)\b[\s\S]{0,80}\b(password|cookie|token|credential|session|private key|wallet)\b/i
  },
  {
    id: "phishing tooling",
    category: "phishing",
    match: /\b(phishing|fake login|credential capture|clone login)\b/i
  },
  {
    id: "defense evasion",
    category: "evasion",
    match:
      /\b(bypass|evade|disable|hide from|undetected|fud)\b[\s\S]{0,80}\b(antivirus|edr|defender|security tool|detection)\b/i
  },
  {
    id: "unauthorized access",
    category: "unauthorized-access",
    match:
      /\b(exploit|backdoor|break into|unauthorized|bruteforce|brute force)\b[\s\S]{0,80}\b(account|server|device|website|wifi|network)\b/i
  }
];

const DUAL_USE_RULES: readonly DualUseRule[] = [
  {
    id: "network reconnaissance",
    match: /\b(port scanner|network scanner|scan ports|packet sniffer|traffic capture)\b/i
  },
  {
    id: "offensive security tooling",
    match: /\b(vulnerability scanner|penetration test|pentest|exploit demo|security lab)\b/i
  },
  {
    id: "auth flow automation",
    match: /\b(login automation|session token|cookie handling|password reset|oauth token)\b/i
  },
  { id: "obfuscation tooling", match: /\b(obfuscate|packer|minify to hide|anti-debug)\b/i }
];

const DEFENSIVE_CONTEXT_PATTERNS: readonly RegExp[] = [
  /\b(defend|defense|protect|detect|scan my|audit|monitor|harden|patch|remove malware|malware scanner|incident response)\b/i,
  /\b(learn|explain|education|training|classroom|ctf|toy example|local lab)\b/i,
  /\b(my app|my project|my repo|owned system|authorized|permission)\b/i
];

/** Screens a plain-language request for harmful intent before any approval flow runs. */
export function screenIntent(request: string, options?: ScreenIntentOptions): IntentAssessment {
  const harmfulMatches = HARMFUL_INTENT_RULES.filter((rule) => rule.match.test(request));
  const dualUseMatches = DUAL_USE_RULES.filter((rule) => rule.match.test(request));
  const defensive = DEFENSIVE_CONTEXT_PATTERNS.some((pattern) => pattern.test(request));
  const t = options?.translate ?? passthrough;

  if (harmfulMatches.length && !defensive) {
    const category = harmfulMatches[0].category;
    return finalize(t, {
      decision: "block",
      category,
      confidence: "high",
      title: "Harmful software requests are blocked",
      plain:
        "This looks like a request to create software that harms people, devices, accounts, or private data. It can become a defensive or educational safety project instead.",
      matchedSignals: harmfulMatches.map((rule) => rule.id),
      allowedHelp: allowedHelpFor(category),
      disallowedHelp: disallowedHelpFor(category),
      userChoices: ["Make this defensive", "Explain safe alternatives", "Cancel"]
    });
  }

  if (harmfulMatches.length && defensive) {
    return finalize(t, {
      decision: "needs-review",
      category: "defensive",
      confidence: "medium",
      title: "This needs a defensive scope check",
      plain:
        "This mentions harmful behavior, but it may be a defensive or educational request. Keep help focused on detection, cleanup, hardening, or a harmless local lab.",
      matchedSignals: [...harmfulMatches.map((rule) => rule.id), "defensive context"],
      allowedHelp: allowedHelpFor(harmfulMatches[0].category),
      disallowedHelp: disallowedHelpFor(harmfulMatches[0].category),
      userChoices: ["Keep defensive scope", "Show safe alternatives", "Cancel"]
    });
  }

  if (dualUseMatches.length) {
    return finalize(t, {
      decision: defensive ? "allow" : "needs-review",
      category: defensive ? "defensive" : "dual-use",
      confidence: "medium",
      title: defensive ? "Defensive security request" : "This needs a scope check",
      plain: defensive
        ? "This looks like protective security work. Keep it limited to computers you own or are allowed to test."
        : "Tools like this can be used to protect systems or to attack them. They should only be used on computers you own or have permission to test.",
      matchedSignals: dualUseMatches.map((rule) => rule.id),
      allowedHelp: [
        "Build defensive checks for the user's own project.",
        "Explain what the tool reports in plain language.",
        "Add consent, rate limits, and local-only defaults."
      ],
      disallowedHelp: [
        "Do not target third-party systems.",
        "Do not bypass access controls.",
        "Do not hide activity from owners or security tools."
      ],
      userChoices: defensive
        ? ["Continue defensively", "Details"]
        : ["It's for my own systems", "Make this defensive", "Cancel"]
    });
  }

  return finalize(t, {
    decision: "allow",
    category: "benign",
    confidence: "low",
    title: "Request is allowed",
    plain: "This does not look like a malware or abuse request. Normal safety checks can continue.",
    matchedSignals: [],
    allowedHelp: ["Continue building what was asked for.", "Keep the normal project protections."],
    disallowedHelp: ["Stop if the request starts to involve harming people, accounts, devices, or private data."],
    userChoices: ["Continue", "Details"]
  });
}

function finalize(
  t: TranslateFn,
  input: Omit<IntentAssessment, "technicalDetails">
): IntentAssessment {
  return {
    ...input,
    title: t(input.title),
    plain: t(input.plain),
    allowedHelp: input.allowedHelp.map((item) => t(item)),
    disallowedHelp: input.disallowedHelp.map((item) => t(item)),
    userChoices: input.userChoices.map((choice) => t(choice)),
    technicalDetails: [
      `decision=${input.decision}`,
      `category=${input.category}`,
      `confidence=${input.confidence}`,
      `matchedSignals=${input.matchedSignals.join(",") || "none"}`
    ]
  };
}

function allowedHelpFor(category: IntentCategory): string[] {
  if (category === "credential-theft" || category === "phishing") {
    return [
      "Build a security checklist for protecting logins and accounts.",
      "Create a detector for suspicious login pages in the user's own app.",
      "Explain safe password, token, and session handling."
    ];
  }

  if (category === "evasion") {
    return [
      "Explain how defenders detect suspicious behavior.",
      "Add transparent logging and user-visible security alerts.",
      "Build a benign local demo that does not hide from security tools."
    ];
  }

  if (category === "unauthorized-access") {
    return [
      "Build an authorized security checklist for the user's own systems.",
      "Create a local training lab with harmless toy examples.",
      "Help patch, monitor, or document defensive controls."
    ];
  }

  return [
    "Build malware detection or cleanup guidance.",
    "Create a defensive scanner for the user's own project.",
    "Explain how to harden an app against this kind of harm."
  ];
}

function disallowedHelpFor(category: IntentCategory): string[] {
  if (category === "credential-theft" || category === "phishing") {
    return [
      "Do not collect credentials, tokens, cookies, or private keys from other people.",
      "Do not clone login pages for deception.",
      "Do not provide code that captures secrets."
    ];
  }

  if (category === "evasion") {
    return [
      "Do not hide software from users, owners, or security tools.",
      "Do not bypass detection or disable protections.",
      "Do not help make harmful behavior harder to inspect."
    ];
  }

  if (category === "unauthorized-access") {
    return [
      "Do not access systems without permission.",
      "Do not automate guessing or bypassing credentials.",
      "Do not create backdoors or persistence for unauthorized access."
    ];
  }

  return [
    "Do not create code that damages files or devices.",
    "Do not create software that spreads, persists, or hides without clear user consent.",
    "Do not help deploy harmful payloads."
  ];
}

function passthrough(text: string): string {
  return text;
}
