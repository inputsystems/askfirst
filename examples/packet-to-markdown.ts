/**
 * Render an approval packet as Markdown — ready to drop into a PR comment,
 * chat message, or TUI panel.
 *
 *   npx tsx examples/packet-to-markdown.ts "npm install left-pad"
 */

import { buildApprovalPacket, type ApprovalPacket } from "../src/index.js";

function packetToMarkdown(packet: ApprovalPacket): string {
  const badge = { green: "🟢", yellow: "🟡", red: "🔴" } as const;
  const lines = [
    `## ${badge[packet.actionExplanation.risk]} ${packet.title}`,
    "",
    `> ${packet.plainSummary}`,
    "",
    `**Action:** \`${packet.action}\``,
    `**Decision:** ${packet.decision}`,
    `**Workspace boundary:** ${packet.workspacePlan.boundary}`,
    "",
    "### Protections",
    ...packet.workspacePlan.protections.map((protection) => `- ${protection}`),
    "",
    "### Your choices",
    ...packet.userChoices.map((choice) => `- ${choice}`)
  ];

  const checklist = packet.workspacePlan.trustChecklist;
  if (checklist) {
    lines.push("", `### ${checklist.prompt}`, ...checklist.checks.map((check) => `- [ ] ${check}`));
    lines.push(
      "",
      checklist.references.map((reference) => `[${reference.label}](${reference.url})`).join(" · ")
    );
  }

  lines.push("", `<sub>audit: \`${packet.auditPreview.actionHash}\` · policy \`${packet.policy.version}\`</sub>`);
  return lines.join("\n");
}

const action = process.argv[2] ?? "npm install left-pad";
console.log(packetToMarkdown(buildApprovalPacket({ action, overrideLevel: "guided" })));
