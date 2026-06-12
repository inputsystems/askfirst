/**
 * askfirst + LangChain — gate a tool so risky commands pause for a human.
 *
 * Run it in your own project (not part of this repo's CI):
 *   npm install askfirst @langchain/core zod
 *
 * The idea: wrap a tool's executor so every call is classified first. Green
 * actions run untouched; yellow/red actions return askfirst's plain-language
 * explanation instead of executing, so your agent surfaces it for approval.
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { classifyAction, explainAction } from "askfirst";

/** Replace with your real executor (child_process, a sandbox, an API, ...). */
async function runShell(command: string): Promise<string> {
  return `(pretend output of: ${command})`;
}

export const runShellTool = tool(
  async ({ command }: { command: string }) => {
    const risk = classifyAction(command);

    if (risk !== "green") {
      // Don't run it. Hand the agent a human-readable approval request.
      const e = explainAction(command, { level: "guided" });
      return [
        `⛔ "${command}" needs human approval (risk: ${risk}).`,
        ``,
        e.plain,
        e.why,
        ``,
        `What to do:`,
        ...e.instructions.steps.map((s, i) => `  ${i + 1}. ${s}`)
      ].join("\n");
    }

    return runShell(command);
  },
  {
    name: "run_shell",
    description:
      "Run a shell command. Routine commands run immediately; risky ones are " +
      "paused with a plain-language explanation for a human to approve.",
    schema: z.object({
      command: z.string().describe("The shell command to run.")
    })
  }
);

/**
 * Generic wrapper: gate ANY existing tool-style executor with askfirst.
 * Pass a function that derives the action string from the tool's input.
 */
export function withAskfirst<I>(
  executor: (input: I) => Promise<string>,
  toAction: (input: I) => string
) {
  return async (input: I): Promise<string> => {
    const action = toAction(input);
    if (classifyAction(action) === "green") return executor(input);
    const e = explainAction(action, { level: "guided" });
    return `⛔ Needs approval (${e.risk}): ${e.plain}\n${e.instructions.steps.join("\n")}`;
  };
}
