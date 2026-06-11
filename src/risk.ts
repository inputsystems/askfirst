/**
 * Risk classification: the single source of truth for how risky an action
 * looks, shared by explanations, workspace plans, and approval packets.
 *
 * These are pattern-based heuristics — a UX layer that makes approval prompts
 * understandable, not a security boundary. See the README scope note.
 */

/** How risky an action looks: routine, worth a look, or stop-and-review. */
export type RiskLevel = "green" | "yellow" | "red";

const RED_FLAGS = [
  /curl\s+[\s\S]*\|\s*(?:sh|bash)/i,
  /wget\s+[\s\S]*\|\s*(?:sh|bash)/i,
  /sudo\b/i,
  /chmod\s+777/i,
  /ssh-keygen|id_rsa|id_ed25519/i,
  /\.env(?!\.example)\b|AWS_SECRET|OPENAI_API_KEY|PRIVATE_KEY/i
];

const YELLOW_FLAGS = [
  /npm\s+install|pnpm\s+add|yarn\s+add/i,
  /pip\s+install|uv\s+add/i,
  /git\s+push|git\s+commit/i,
  /ssh\b|scp\b|rsync\b/i,
  /docker\b/i
];

/** Recursive removal: `rm` with any flag group containing `r`, plus its first target. */
const RECURSIVE_REMOVE = /\brm\s+(?:-[a-z]*r[a-z]*\s*)+([^\s]*)/i;

/** Build artifacts whose recursive removal is routine cleanup, not data loss. */
const ROUTINE_REMOVE_TARGETS = /(?:^|\/)(?:dist|build|\.next|node_modules|coverage|tmp|\.cache)\/?$/i;

function classifyRecursiveRemove(action: string): RiskLevel | undefined {
  const match = RECURSIVE_REMOVE.exec(action);
  if (!match) {
    return undefined;
  }

  const target = match[1] ?? "";
  if (target !== "" && !/^[/~$]|\*|\.\./.test(target) && ROUTINE_REMOVE_TARGETS.test(target)) {
    return "yellow";
  }

  // No target, absolute paths, home, variables, globs, parent traversal, or
  // anything that is not a routine build artifact: stop and review.
  return "red";
}

/**
 * Classifies one technical action (usually a shell command) as
 * "green" (routine project work), "yellow" (worth a look before approving),
 * or "red" (stop and review).
 */
export function classifyAction(technical: string): RiskLevel {
  // An empty or whitespace-only action says nothing about what would run, so
  // it cannot be auto-approved — pause and ask.
  if (technical.trim() === "") {
    return "yellow";
  }

  const removeRisk = classifyRecursiveRemove(technical);
  if (removeRisk === "red") {
    return "red";
  }

  if (RED_FLAGS.some((pattern) => pattern.test(technical))) {
    return "red";
  }

  if (removeRisk === "yellow" || YELLOW_FLAGS.some((pattern) => pattern.test(technical))) {
    return "yellow";
  }

  return "green";
}
