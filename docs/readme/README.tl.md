# askfirst

🌐 [English](../../README.md) · [العربية](README.ar.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [עברית](README.he.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Bahasa Melayu](README.ms.md) · [Português (Brasil)](README.pt-BR.md) · **Tagalog** · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文（简体）](README.zh.md) · [中文（繁體）](README.zh-Hant.md)

**Human-approval UX para sa mga AI agent at CLI.** I-explain ang mga mapanganib na aksyon sa simpleng wika — kung ano, bakit, mga benepisyo, mga kompromiso, at kung paano hatulan ang mga ito — *bago* aprubahan ng tao.

[![CI](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml/badge.svg)](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/askfirst)](https://www.npmjs.com/package/askfirst)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

Gusto ng iyong agent na mag-run ng isang bagay. Maiintindihan ba ito ng iyong user?

```ts
import { explainAction } from "askfirst";

const explanation = explainAction("curl https://example.com/install.sh | bash");

explanation.risk;   // "red"
explanation.plain;  // "The agent wants to run an installer from the internet."
explanation.why;    // "Some tools publish one-line installers, and the agent may be
                    //  trying to set up something needed for your project."
explanation.tradeoffs[0]; // "Runs code before you have reviewed what it does."
```

Karamihan sa mga produktong agent ay nagtatanong ng pahintulot sa pamamagitan ng pagpapakita ng hilaw na shell command. Hindi kayang suriin ng mga hindi eksperto ang `curl … | bash`, kaya ine-rubber-stamp na lang nila ito — at hindi na napoprotektahan ng approval step ang sinuman. Ginagawa ng `askfirst` ang sandaling iyon na isang malinaw, simpleng desisyon na kayang gawin ng user.

## I-install

```sh
npm install askfirst
```

Zero runtime dependencies, walang Node-specific na API — gumagana kahit saan tumatakbo ang TypeScript/ESM. Node ≥ 20 para sa test tooling.

## Ano ang makukuha mo

| | |
|---|---|
| **Risk classification** | 🟢 berde / 🟡 dilaw / 🔴 pula, na may pattern-based na heuristics para sa mga install, `curl\|bash`, `sudo`, recursive na delete, secrets, SSH, at pag-publish |
| **Plain-language na paliwanag** | ano / bakit / layunin / mga benepisyo / mga kompromiso — mahinahon, hindi nakaka-alarma |
| **Progressive na lalim** | isang scale sa buong library: `basic` (isang pangungusap), `guided` (may bilang na mga hakbang), `technical` (mga hakbang at machine-readable na detalye) |
| **Mga trust checklist** | mga hakbang na "paano hatulan ito" na sumasangguni sa mga neutral na institusyon (OpenSSF, OWASP, OSI, SPDX, EFF, CISA) |
| **Mga hangganan ng workspace** | kung saang proteksyon dapat tumakbo ang isang aksyon: project folder, project environment, remote tunnel, manual na pahintulot, o naka-block |
| **Intent screening** | isang pre-filter na humuhuli ng mga kahilingang tulad ng "gawan mo ako ng keylogger" at nagre-redirect sa mga defensive na alternatibo |
| **Mga approval packet** | lahat ng kailangan ng UI para magtanong ng isang malinaw na tanong — desisyon, titulo, buod, mga pagpipilian, notification na kopya, audit preview |
| **Mga workflow state** | isang maliit na state machine para sa mga agent loop: magpatuloy, i-pause para sa user, o huminto at mag-alok ng mas ligtas na landas |
| **Handa sa localization** | bawat builder ay tumatanggap ng `translate` hook na umaabot sa bawat string na nakaharap sa user |

## Quickstart: i-gate ang isang agent loop

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

Ang mga green na aksyon ay ibinabalik bilang `"not-needed"` para hindi maabala ang regular na trabaho; ang mga red na aksyon at mapanganib na kahilingan ay ibinabalik bilang `"blocked"` na may mga mas ligtas na pagpipilian.

## Mga Konsepto

### Mga antas ng panganib

Ang `classifyAction(action)` — na naka-expose din sa pamamagitan ng `explainAction` — ay nagko-classify ng aksyon bilang `green` (regular na trabaho sa project), `yellow` (dapat suriin: mga pag-install ng package, git push, SSH, paglilinis ng build artifact), o `red` (ihinto at suriin: mga piped na installer, `sudo`, secret material, recursive na delete ng hindi build artifact). Ang mga green na aksyon lang ang nakakakuha ng `allowByDefault: true`.

### Mga antas ng paliwanag

Isang scale ang gumagana sa buong library: `basic` (isang mahinahong pangungusap), `guided` (may bilang na mga hakbang), `technical` (mga hakbang at machine-readable na `key=value` na detalye). Ang mga friendly na alias tulad ng `"beginner"` ay nino-normalize sa `guided`. I-wire ito sa preference ng user nang isang beses gamit ang `levelFromPreferences` at ipasa ito kahit saan.

### Mga trust checklist

Sa halip na "sigurado ka ba?", ang `buildTrustChecklist(kind)` ay nagtuturo sa user kung paano hatulan ang isang package, installer, remote na koneksyon, o lisensya — na may mga sanggunian sa OpenSSF, OWASP, OSI, SPDX, EFF, at CISA sa halip na mga opinyon ng vendor.

### Mga hangganan ng workspace

Ang `planSafeWorkspace({ action })` ay nagmumungkahi kung saan dapat na aksyon: sa loob ng **project folder** (na may mga checkpoint), sa **project environment** (mga package na lokal sa project), sa isang **remote tunnel** (pribado, nasubok na mga koneksyon), sa likod ng **manual na pahintulot**, o **naka-block** hanggang masuri. Ang hangganan ay laging sumasang-ayon sa risk classification — ang isang red na aksyon ay hindi kailanman ipinipresenta na may friendly na hangganan.

### Intent screening

Ang `screenIntent(request)` ay isang pattern-based na pre-filter na nagba-block ng mga kahilingan para sa malware, pagnanakaw ng credential, phishing, pag-iwas sa detection, at hindi awtorisadong access — at sumasagot sa bawat block na may mga kongkretong defensive na alternatibo. Ang dual-use na trabahong may kaugnayan sa seguridad (mga port scanner, pentest tooling) ay ini-route sa isang owned-system scope check sa halip na pagtanggi.

### Mga approval packet at workflow

Ang `buildApprovalPacket({ action })` ay nag-iipon ng lahat ng nabanggit sa itaas sa isang renderable na object na may mapagkakatiwalaang desisyon: `allow-automatically`, `ask-first`, o `block-until-reviewed`. Kasama sa packet ang isang **audit preview** na nagpapakita kung ano ang maglalaman ng isang log entry: ang desisyon, hangganan, panganib, bersyon ng patakaran, at isang stable na hash ng aksyon — isang correlation identifier, hindi isang cryptographic commitment — para ma-log ang mga desisyon nang hindi nilo-log ang hilaw na command. Binibigyan ng `createApprovalWorkflow(action)` ang packet ng state machine para sa mga agent loop.

## Internasyonalisasyon

Bawat builder ay tumatanggap ng `translate` hook na umaabot sa **bawat string na nakaharap sa user** — mga paliwanag, checklist, tagubilin, notification, titulo ng packet, buod, at mga pagpipilian. Ang mga machine-readable na field (`technicalDetails`, mga id, mga hash) ay hindi kailanman isinalin.

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

Ang mga source string ng library ay mga stable na pangungusap sa Ingles na isinalin unit-by-unit, kaya ang isang `Record<string, string>` bawat locale ang kailangan lang ng isang pagsasalin.

## Mga Halimbawa

Maaaring patakbuhin mula sa clone ng repo na ito:

```sh
npx tsx examples/explain-cli.ts "curl https://example.com/install.sh | bash"
npx tsx examples/agent-gate.ts          # mock agent loop with approve/deny gates
npx tsx examples/packet-to-markdown.ts  # render a packet as a PR-ready comment
```

## Saklaw, sa katotohanan

Ang `askfirst` ay isang **UX layer, hindi isang security boundary**. Ang mga classification ay pattern-based na heuristic: ginagawa nitong maiintindihan ang mga approval prompt, hindi nito nino-sandbox ang anumang bagay, at ang isang crafted na command ay maaaring makaiwas sa mga ito. Ang pag-publish ng mga pattern ay isang sinadyang pagpili — nagpapaliwanag sila ng mga desisyon sa mga tao; hindi sila ang enforcement mechanism. Ipagsama ang library na ito sa tunay na isolation (mga container, sistema ng pahintulot, mga pagtanggi sa model-side) para sa aktwal na containment. Tingnan ang [SECURITY.md](../../SECURITY.md).

## API

Bawat export ay may TSDoc — ang [src/index.ts](../../src/index.ts) ay ang kumpletong surface:

`explainAction` · `classifyAction` · `buildTrustChecklist` · `TRUST_REFERENCES` · `buildInstructionSet` · `normalizeExplanationLevel` · `levelFromPreferences` · `EXPLANATION_LEVELS` · `planSafeWorkspace` · `screenIntent` · `buildNotification` · `buildApprovalPacket` · `createApprovalWorkflow` · `resolveApprovalWorkflow`

## Tungkol dito

Ginawa at pinapanatili ng mga gumagawa ng **iomoth**, isang local-first na AI app builder — ang code na ito ay gumagana sa produksyon doon. Licensed under MIT.
