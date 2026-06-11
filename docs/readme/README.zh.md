# askfirst

🌐 [English](../../README.md) · [العربية](README.ar.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [עברית](README.he.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Bahasa Melayu](README.ms.md) · [Português (Brasil)](README.pt-BR.md) · [Tagalog](README.tl.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · **中文（简体）** · [中文（繁體）](README.zh-Hant.md)

**面向 AI 代理和命令行工具的人工审批用户体验层。** 在人工批准前，用平实的语言说明风险操作——包括操作内容、原因、好处、权衡因素以及评估方法。

[![CI](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml/badge.svg)](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/askfirst)](https://www.npmjs.com/package/askfirst)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

您的代理想要运行某个命令。您的用户能理解它吗？

```ts
import { explainAction } from "askfirst";

const explanation = explainAction("curl https://example.com/install.sh | bash");

explanation.risk;   // "red"
explanation.plain;  // "The agent wants to run an installer from the internet."
explanation.why;    // "Some tools publish one-line installers, and the agent may be
                    //  trying to set up something needed for your project."
explanation.tradeoffs[0]; // "Runs code before you have reviewed what it does."
```

大多数代理产品通过显示原始 Shell 命令来请求审批。非专业用户无法评估 `curl … | bash`，因此只能盲目点击确认——审批步骤形同虚设，无法保护任何人。`askfirst` 将这一时刻转变为用户能够真正做出判断的平静、简明的决策过程。

## 安装

```sh
npm install askfirst
```

零运行时依赖，无 Node 特定 API——可在任何支持 TypeScript/ESM 的环境中运行。测试工具需要 Node ≥ 20。

## 功能概览

| | |
|---|---|
| **风险分类** | 🟢 绿色 / 🟡 黄色 / 🔴 红色，基于模式的启发式规则，适用于安装操作、`curl\|bash`、`sudo`、递归删除、机密信息、SSH、发布等场景 |
| **平实语言说明** | 操作内容 / 原因 / 目的 / 好处 / 权衡因素——用词平和，绝不危言耸听 |
| **渐进式深度** | 统一的层级体系：`basic`（单句）、`guided`（编号步骤）、`technical`（步骤加机器可读详情） |
| **信任检查清单** | 「如何评估」步骤，引用中立机构（OpenSSF、OWASP、OSI、SPDX、EFF、CISA） |
| **工作区边界** | 指定操作应在哪种保护下运行：项目文件夹、项目环境、远程隧道、人工审批或阻止 |
| **意图筛查** | 预过滤器，拦截「帮我构建键盘记录器」类请求，并重定向至防御性替代方案 |
| **审批数据包** | UI 所需的一切信息，用于提出一个清晰的问题——决策、标题、摘要、选项、通知文案、审计预览 |
| **工作流状态** | 适用于代理循环的小型状态机：继续、暂停等待用户，或停止并提供更安全的路径 |
| **本地化就绪** | 每个构建器均接受 `translate` 钩子，覆盖所有面向用户的字符串 |

## 快速上手：为代理循环添加门控

```ts
import { createApprovalWorkflow, resolveApprovalWorkflow } from "askfirst";

const workflow = createApprovalWorkflow("npm install stripe");

workflow.state;      // "waiting-for-user"
workflow.plainState; // "Pause and ask the user before continuing."

// Render workflow.packet in your UI:
const { packet } = workflow;
packet.title;        // "Your approval is needed"
packet.plainSummary; // "The agent wants to add a package — a ready-made piece of
                     //  software — to this project. It needs your OK first. If you
                     //  approve, anything added is kept inside this project only,
                     //  not your whole computer."
packet.userChoices;  // ["Approve", "Ask why", "Choose a safer way", "Details"]

// Record what the user decided:
const done = resolveApprovalWorkflow(workflow, "approve");
done.state;          // "approved"
```

绿色操作将返回 `"not-needed"`，常规工作不会打扰任何人；红色操作和有害请求将返回 `"blocked"`，并附带更安全的选项。

## 核心概念

### 风险级别

`classifyAction(action)`——也通过 `explainAction` 暴露——将操作分类为 `green`（常规项目工作）、`yellow`（值得关注：包安装、git 推送、SSH、清理构建产物）或 `red`（停止并审查：管道安装程序、`sudo`、机密材料、非构建产物的递归删除）。只有绿色操作才会获得 `allowByDefault: true`。

### 说明级别

整个库使用统一的层级体系：`basic`（一句平和的话）、`guided`（编号步骤）、`technical`（步骤加机器可读的 `key=value` 详情）。友好别名如 `"beginner"` 会规范化为 `guided`。使用 `levelFromPreferences` 根据用户偏好设置一次，然后在任何地方传入。

### 信任检查清单

`buildTrustChecklist(kind)` 不采用「您确定吗？」的方式，而是教导用户如何评估包、安装程序、远程连接或许可证——引用 OpenSSF、OWASP、OSI、SPDX、EFF 和 CISA，而非供应商观点。

### 工作区边界

`planSafeWorkspace({ action })` 建议操作应属于哪个范围：**项目文件夹**内（带检查点）、**项目环境**内（项目本地包）、**远程隧道**后（私有、经过测试的连接）、**人工审批**后，或**阻止**直至审查。边界始终与风险分类保持一致——红色操作不会以友好的边界呈现。

### 意图筛查

`screenIntent(request)` 是一个基于模式的预过滤器，拦截恶意软件、凭据窃取、网络钓鱼、检测规避和未授权访问等请求——并针对每次拦截提供具体的防御性替代方案。端口扫描器、渗透测试工具等双重用途的安全工作会被路由至自有系统范围检查，而非直接拒绝。

### 审批数据包与工作流

`buildApprovalPacket({ action })` 将以上所有内容汇聚成一个可渲染的对象，并给出权威决策：`allow-automatically`、`ask-first` 或 `block-until-reviewed`。数据包包含一个**审计预览**，显示日志条目将包含的内容：决策、边界、风险、策略版本以及操作的稳定哈希值——这是一个关联标识符，而非密码学承诺——以便在不记录原始命令的情况下记录决策。`createApprovalWorkflow(action)` 将数据包封装在适用于代理循环的状态机中。

## 国际化

每个构建器均接受 `translate` 钩子，覆盖**所有面向用户的字符串**——说明、检查清单、说明文字、通知、数据包标题、摘要和选项。机器可读字段（`technicalDetails`、id、哈希值）从不翻译。

```ts
import { buildApprovalPacket } from "askfirst";

const es: Record<string, string> = {
  "Your approval is needed": "Se necesita tu aprobación"
  // ...
};

const packet = buildApprovalPacket({
  action: "npm install zod",
  translate: (text) => es[text] ?? text
});

packet.title; // "Se necesita tu aprobación"
```

库的源字符串是稳定的英文句子，逐条翻译，因此每种语言环境只需一个 `Record<string, string>` 即可完成翻译。

## 示例

可从此仓库的克隆中直接运行：

```sh
npx tsx examples/explain-cli.ts "curl https://example.com/install.sh | bash"
npx tsx examples/agent-gate.ts          # mock agent loop with approve/deny gates
npx tsx examples/packet-to-markdown.ts  # render a packet as a PR-ready comment
```

## 范围说明

`askfirst` 是一个**用户体验层，而非安全边界**。分类基于模式启发式规则：它们使审批提示易于理解，但不对任何内容进行沙箱化，且精心构造的命令可以绕过它们。公开这些模式是有意为之——它们向人类解释决策，而非执行机制。对于真正的隔离，请将此库与真实的隔离手段（容器、权限系统、模型端拒绝）配合使用。参见 [SECURITY.md](../../SECURITY.md)。

## API

所有导出均附有 TSDoc——[src/index.ts](../../src/index.ts) 是完整的接口定义：

`explainAction` · `classifyAction` · `buildTrustChecklist` · `TRUST_REFERENCES` · `buildInstructionSet` · `normalizeExplanationLevel` · `levelFromPreferences` · `EXPLANATION_LEVELS` · `planSafeWorkspace` · `screenIntent` · `buildNotification` · `buildApprovalPacket` · `createApprovalWorkflow` · `resolveApprovalWorkflow`

## 关于

由 **iomoth** 的开发团队构建和维护——iomoth 是一款本地优先的 AI 应用构建工具，此代码已在生产环境中运行。MIT 许可证。
