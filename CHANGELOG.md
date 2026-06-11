# Changelog

## 0.1.0

Initial release.

- `explainAction` — plain-language what/why/benefits/tradeoffs for shell
  commands and agent actions, with green/yellow/red risk classification.
- `classifyAction` — the risk classifier on its own.
- `buildInstructionSet` — the same guidance at basic, guided, and technical
  depth.
- `buildTrustChecklist` — "how to judge this" checklists citing OpenSSF,
  OWASP, OSI, SPDX, EFF, and CISA.
- `planSafeWorkspace` — workspace boundaries (project folder, project
  environment, remote tunnel, manual approval, blocked) with protections.
- `screenIntent` — a prefilter that blocks harmful-software requests and
  redirects them to defensive alternatives.
- `buildApprovalPacket` — everything a UI needs to ask one clear approval
  question, with a privacy-preserving audit preview.
- `createApprovalWorkflow` / `resolveApprovalWorkflow` — a small state
  machine for agent loops.
- Every builder accepts a `translate` hook that reaches every user-facing
  string, so full localization is a `Record<string, string>` per locale.
