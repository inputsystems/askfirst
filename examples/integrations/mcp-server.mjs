#!/usr/bin/env node
/**
 * askfirst as an MCP server — "approve tool calls with askfirst".
 *
 * A Model Context Protocol server (stdio transport, JSON-RPC 2.0) that exposes
 * askfirst's risk classification and plain-language explanations as tools any
 * MCP client (Claude Desktop, IDEs, agent runtimes) can call before it runs a
 * shell command. Zero dependencies beyond askfirst itself.
 *
 * Tools:
 *   explain_action  — full plain-language explanation (what / why / tradeoffs / steps)
 *   classify_action — quick gate: risk + whether it is safe to auto-approve
 *
 * Wire it into Claude Desktop (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "askfirst": { "command": "node", "args": ["/abs/path/to/mcp-server.mjs"] }
 *     }
 *   }
 *
 * In your own project this imports from the published package:
 *   import { explainAction, classifyAction, buildApprovalPacket } from "askfirst";
 */
import { createInterface } from "node:readline";
import { explainAction, classifyAction, buildApprovalPacket } from "askfirst";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "askfirst", version: "0.1.0" };

const TOOLS = [
  {
    name: "explain_action",
    description:
      "Explain a shell command or agent action in plain language before a human approves it. " +
      "Returns risk (green/yellow/red), what it does, why, benefits, tradeoffs, and what to check.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "The command or action to explain." },
        level: {
          type: "string",
          enum: ["basic", "guided", "technical"],
          description: "How much detail: one sentence, numbered steps, or steps plus details."
        }
      },
      required: ["action"]
    }
  },
  {
    name: "classify_action",
    description:
      "Quickly classify an action's risk and whether it is safe to run without asking. " +
      "Use this as a gate before executing a tool call.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "The command or action to classify." }
      },
      required: ["action"]
    }
  }
];

function explainText(action, level) {
  const e = explainAction(action, level ? { level } : undefined);
  const badge = { green: "🟢 LOW RISK", yellow: "🟡 NEEDS A LOOK", red: "🔴 STOP AND REVIEW" }[e.risk];
  const lines = [
    `${badge}  ${e.technical}`,
    "",
    `What:  ${e.plain}`,
    `Why:   ${e.why}`,
    `Goal:  ${e.purpose}`,
    "",
    "Benefits:",
    ...e.benefits.map((b) => `  + ${b}`),
    "Tradeoffs:",
    ...e.tradeoffs.map((t) => `  - ${t}`),
    "",
    `What to do (${e.instructions.level}):`,
    ...e.instructions.steps.map((s, i) => `  ${i + 1}. ${s}`)
  ];
  return lines.join("\n");
}

function classifyText(action) {
  const packet = buildApprovalPacket({ action });
  const risk = classifyAction(action);
  return JSON.stringify(
    {
      risk,
      decision: packet.decision, // allow-automatically | ask-first | block-until-reviewed
      safeToAutoApprove: packet.decision === "allow-automatically"
    },
    null,
    2
  );
}

function callTool(name, args) {
  if (name === "explain_action") {
    return explainText(String(args?.action ?? ""), args?.level);
  }
  if (name === "classify_action") {
    return classifyText(String(args?.action ?? ""));
  }
  throw new Error(`Unknown tool: ${name}`);
}

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function handle(msg) {
  const { id, method, params } = msg;
  // Notifications (no id) need no response.
  if (id === undefined || id === null) return;

  try {
    if (method === "initialize") {
      return send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO
        }
      });
    }
    if (method === "tools/list") {
      return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    }
    if (method === "tools/call") {
      const text = callTool(params?.name, params?.arguments);
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } });
    }
    if (method === "ping") {
      return send({ jsonrpc: "2.0", id, result: {} });
    }
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err) {
    send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(err?.message ?? err) } });
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return; // ignore malformed lines
  }
  handle(msg);
});
