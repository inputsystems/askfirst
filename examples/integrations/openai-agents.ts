/**
 * askfirst + OpenAI Agents SDK — drive tool approval with risk classification.
 *
 * Run it in your own project (not part of this repo's CI):
 *   npm install askfirst @openai/agents zod
 *
 * The Agents SDK has first-class human-in-the-loop: a tool can declare
 * `needsApproval`, and the run pauses with an interruption when it returns true.
 * askfirst is a perfect fit — let the risk level decide when to pause, and show
 * the plain-language explanation at the approval point.
 */
import { Agent, tool } from "@openai/agents";
import { z } from "zod";
import { classifyAction, explainAction } from "askfirst";

/** Replace with your real executor (child_process, a sandbox, an API, ...). */
async function runShell(command: string): Promise<string> {
  return `(pretend output of: ${command})`;
}

export const runShellTool = tool({
  name: "run_shell",
  description: "Run a shell command. Risky commands pause for human approval.",
  parameters: z.object({
    command: z.string().describe("The shell command to run.")
  }),
  // Green → run automatically; yellow/red → pause the run for a human.
  needsApproval: async (_ctx, { command }) => classifyAction(command) !== "green",
  execute: async ({ command }) => runShell(command)
});

export const agent = new Agent({
  name: "Build assistant",
  instructions: "Help with project setup. Use run_shell for shell commands.",
  tools: [runShellTool]
});

/**
 * When the run interrupts for approval, render askfirst's explanation so the
 * human is deciding on plain language, not a raw command. Example loop:
 *
 *   let result = await run(agent, "set up the project", { stream: false });
 *   while (result.interruptions?.length) {
 *     for (const interruption of result.interruptions) {
 *       const command = interruption.rawItem.arguments.command;
 *       const e = explainAction(command, { level: "guided" });
 *       console.log(`${e.risk.toUpperCase()}: ${e.plain}`);
 *       e.instructions.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
 *
 *       if (await askTheHuman()) result.state.approve(interruption);
 *       else result.state.reject(interruption);
 *     }
 *     result = await run(agent, result.state);
 *   }
 */
export function explainForApproval(command: string): string {
  const e = explainAction(command, { level: "guided" });
  return `${e.risk.toUpperCase()}: ${e.plain}\n${e.instructions.steps.join("\n")}`;
}
