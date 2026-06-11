# askfirst

🌐 [English](../../README.md) · [العربية](README.ar.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [עברית](README.he.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Bahasa Melayu](README.ms.md) · **Português (Brasil)** · [Tagalog](README.tl.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文（简体）](README.zh.md) · [中文（繁體）](README.zh-Hant.md)

**UX de aprovação humana para agentes de IA e CLIs.** Explica ações arriscadas em linguagem simples — o quê, por quê, benefícios, desvantagens e como avaliá-las — *antes* de um humano aprová-las.

[![CI](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml/badge.svg)](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/askfirst)](https://www.npmjs.com/package/askfirst)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

O seu agente quer executar algo. O seu usuário consegue entender?

```ts
import { explainAction } from "askfirst";

const explanation = explainAction("curl https://example.com/install.sh | bash");

explanation.risk;   // "red"
explanation.plain;  // "The agent wants to run an installer from the internet."
explanation.why;    // "Some tools publish one-line installers, and the agent may be
                    //  trying to set up something needed for your project."
explanation.tradeoffs[0]; // "Runs code before you have reviewed what it does."
```

A maioria dos produtos com agentes pede aprovação exibindo o comando shell bruto. Não-especialistas não conseguem avaliar `curl … | bash`, então simplesmente confirmam sem pensar — e a etapa de aprovação não protege ninguém. O `askfirst` transforma esse momento em uma decisão calma, em linguagem simples, que o usuário realmente consegue tomar.

## Instalação

```sh
npm install askfirst
```

Zero dependências de runtime, sem APIs específicas do Node — funciona em qualquer lugar onde TypeScript/ESM roda. Node ≥ 20 para as ferramentas de teste.

## O que você obtém

| | |
|---|---|
| **Classificação de risco** | 🟢 verde / 🟡 amarelo / 🔴 vermelho, com heurísticas baseadas em padrões para instalações, `curl\|bash`, `sudo`, exclusões recursivas, segredos, SSH, publicação |
| **Explicações em linguagem simples** | o quê / por quê / objetivo / benefícios / desvantagens — linguagem calma, nunca alarmista |
| **Profundidade progressiva** | uma única escala em toda a biblioteca: `basic` (uma frase), `guided` (passos numerados), `technical` (passos + detalhes legíveis por máquina) |
| **Listas de verificação de confiança** | passos de "como avaliar isto" citando instituições neutras (OpenSSF, OWASP, OSI, SPDX, EFF, CISA) |
| **Limites de espaço de trabalho** | qual proteção uma ação deve ter: pasta do projeto, ambiente do projeto, túnel remoto, aprovação manual ou bloqueado |
| **Triagem de intenção** | um pré-filtro que detecta solicitações do tipo "crie um keylogger" e redireciona para alternativas defensivas |
| **Pacotes de aprovação** | tudo o que uma UI precisa para fazer uma pergunta clara — decisão, título, resumo, opções, cópia de notificação, prévia de auditoria |
| **Estados de fluxo de trabalho** | uma pequena máquina de estados para loops de agente: continuar, pausar para o usuário ou parar e oferecer um caminho mais seguro |
| **Pronto para localização** | cada construtor aceita um gancho `translate` que alcança todas as strings voltadas ao usuário |

## Início rápido: controlar um loop de agente

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

Ações verdes retornam como `"not-needed"` para que o trabalho de rotina nunca interrompa ninguém; ações vermelhas e solicitações prejudiciais retornam como `"blocked"` com opções mais seguras anexadas.

## Conceitos

### Níveis de risco

`classifyAction(action)` — também exposto via `explainAction` — classifica uma ação como `green` (trabalho de projeto de rotina), `yellow` (vale uma olhada: instalação de pacotes, git push, SSH, limpeza de artefatos de build) ou `red` (parar e revisar: instaladores redirecionados por pipe, `sudo`, material secreto, exclusões recursivas de qualquer coisa que não seja um artefato de build). Somente ações verdes recebem `allowByDefault: true`.

### Níveis de explicação

Uma escala percorre toda a biblioteca: `basic` (uma frase calma), `guided` (passos numerados), `technical` (passos mais detalhes `key=value` legíveis por máquina). Aliases amigáveis como `"beginner"` são normalizados para `guided`. Configure uma vez com `levelFromPreferences` e passe em todo lugar.

### Listas de verificação de confiança

Em vez de "tem certeza?", `buildTrustChecklist(kind)` ensina o usuário como avaliar um pacote, instalador, conexão remota ou licença — com referências a OpenSSF, OWASP, OSI, SPDX, EFF e CISA em vez de opiniões do fornecedor.

### Limites de espaço de trabalho

`planSafeWorkspace({ action })` propõe onde uma ação pertence: dentro da **pasta do projeto** (com pontos de restauração), no **ambiente do projeto** (pacotes locais ao projeto), em um **túnel remoto** (conexões privadas e testadas), por trás de **aprovação manual** ou **bloqueado** até revisão. O limite sempre está de acordo com a classificação de risco — uma ação vermelha nunca é apresentada com um limite amigável.

### Triagem de intenção

`screenIntent(request)` é um pré-filtro baseado em padrões que bloqueia solicitações de malware, roubo de credenciais, phishing, evasão de detecção e acesso não autorizado — e responde a cada bloqueio com alternativas defensivas concretas. Trabalho de segurança de uso dual (scanners de porta, ferramentas de pentest) é direcionado para uma verificação de escopo de sistema próprio em vez de uma recusa.

### Pacotes de aprovação e fluxos de trabalho

`buildApprovalPacket({ action })` reúne tudo o que foi descrito acima em um objeto renderizável com uma decisão autoritativa: `allow-automatically`, `ask-first` ou `block-until-reviewed`. O pacote inclui uma **prévia de auditoria** mostrando o que uma entrada de log conteria: a decisão, o limite, o risco, a versão da política e um hash estável da ação — um identificador de correlação, não um compromisso criptográfico — para que as decisões possam ser registradas sem registrar o comando bruto. `createApprovalWorkflow(action)` envolve o pacote em uma máquina de estados para loops de agente.

## Internacionalização

Cada construtor aceita um gancho `translate` que alcança **todas as strings voltadas ao usuário** — explicações, listas de verificação, instruções, notificações, títulos de pacotes, resumos e opções. Campos legíveis por máquina (`technicalDetails`, ids, hashes) nunca são traduzidos.

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

As strings de origem da biblioteca são frases estáveis em inglês traduzidas unidade por unidade, então um `Record<string, string>` por localidade é tudo o que uma tradução precisa.

## Exemplos

Executáveis a partir de um clone deste repositório:

```sh
npx tsx examples/explain-cli.ts "curl https://example.com/install.sh | bash"
npx tsx examples/agent-gate.ts          # mock agent loop with approve/deny gates
npx tsx examples/packet-to-markdown.ts  # render a packet as a PR-ready comment
```

## Escopo, honestamente

O `askfirst` é uma **camada de UX, não um limite de segurança**. As classificações são heurísticas baseadas em padrões: elas tornam os prompts de aprovação compreensíveis, não colocam nada em sandbox, e um comando elaborado pode evadi-las. Publicar os padrões é uma escolha deliberada — eles explicam decisões para humanos; eles não são o mecanismo de aplicação. Combine esta biblioteca com isolamento real (contêineres, sistemas de permissão, recusas do lado do modelo) para contenção real. Consulte [SECURITY.md](../../SECURITY.md).

## API

Cada exportação possui TSDoc — [src/index.ts](../../src/index.ts) é a superfície completa:

`explainAction` · `classifyAction` · `buildTrustChecklist` · `TRUST_REFERENCES` · `buildInstructionSet` · `normalizeExplanationLevel` · `levelFromPreferences` · `EXPLANATION_LEVELS` · `planSafeWorkspace` · `screenIntent` · `buildNotification` · `buildApprovalPacket` · `createApprovalWorkflow` · `resolveApprovalWorkflow`

## Sobre

Construído e mantido pelos criadores do **iomoth**, um construtor de aplicativos de IA local-first — este código roda em produção lá. Licença MIT.
