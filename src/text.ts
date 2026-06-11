/**
 * Small text helpers shared across builders.
 */

/**
 * Shortens copy by dropping whole sentences from the end until it fits within
 * `maxLength` — never cutting mid-word — and always keeps at least the first
 * sentence intact, even if that one sentence is longer than the budget.
 */
export function concise(message: string, maxLength: number): string {
  const trimmed = message.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const sentences = trimmed.match(/[^.!?]+[.!?]+["')\]]*\s*/g);
  if (!sentences) {
    return trimmed;
  }

  let result = "";
  for (const sentence of sentences) {
    if (result !== "" && (result + sentence).trim().length > maxLength) {
      break;
    }
    result += sentence;
  }

  return result.trim();
}
