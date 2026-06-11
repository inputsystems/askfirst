# askfirst

🌐 [English](../../README.md) · [العربية](README.ar.md) · **Deutsch** · [Español](README.es.md) · [Français](README.fr.md) · [עברית](README.he.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Bahasa Melayu](README.ms.md) · [Português (Brasil)](README.pt-BR.md) · [Tagalog](README.tl.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文（简体）](README.zh.md) · [中文（繁體）](README.zh-Hant.md)

**UX für menschliche Freigaben in KI-Agenten und CLIs.** Riskante Aktionen in einfacher Sprache erklären — was, warum, Vorteile, Kompromisse und wie man sie beurteilt — *bevor* ein Mensch sie genehmigt.

[![CI](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml/badge.svg)](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/askfirst)](https://www.npmjs.com/package/askfirst)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

Dein Agent möchte etwas ausführen. Kann dein Nutzer das verstehen?

```ts
import { explainAction } from "askfirst";

const explanation = explainAction("curl https://example.com/install.sh | bash");

explanation.risk;   // "red"
explanation.plain;  // "The agent wants to run an installer from the internet."
explanation.why;    // "Some tools publish one-line installers, and the agent may be
                    //  trying to set up something needed for your project."
explanation.tradeoffs[0]; // "Runs code before you have reviewed what it does."
```

Die meisten Agenten-Produkte bitten um Genehmigung, indem sie den rohen Shell-Befehl anzeigen. Nicht-Experten können `curl … | bash` nicht beurteilen, also stimmen sie einfach zu — und der Genehmigungsschritt schützt niemanden. `askfirst` verwandelt diesen Moment in eine ruhige, verständliche Entscheidung, die der Nutzer tatsächlich treffen kann.

## Installation

```sh
npm install askfirst
```

Keine Laufzeit-Abhängigkeiten, keine Node-spezifischen APIs — läuft überall, wo TypeScript/ESM läuft. Node ≥ 20 für das Test-Tooling.

## Was du bekommst

| | |
|---|---|
| **Risikoklassifizierung** | 🟢 grün / 🟡 gelb / 🔴 rot, mit musterbasierten Heuristiken für Installationen, `curl\|bash`, `sudo`, rekursives Löschen, Geheimnisse, SSH, Veröffentlichungen |
| **Erklärungen in einfacher Sprache** | was / warum / Zweck / Vorteile / Kompromisse — ruhige Formulierungen, nie alarmierend |
| **Progressive Tiefe** | eine einheitliche Skala: `basic` (ein Satz), `guided` (nummerierte Schritte), `technical` (Schritte + maschinenlesbare Details) |
| **Vertrauens-Checklisten** | „Wie du das beurteilst“-Schritte mit Verweisen auf neutrale Institutionen (OpenSSF, OWASP, OSI, SPDX, EFF, CISA) |
| **Arbeitsbereichs-Grenzen** | in welchem Schutzbereich eine Aktion ausgeführt werden soll: Projektordner, Projektumgebung, Remote-Tunnel, manuelle Genehmigung oder blockiert |
| **Absichtsprüfung** | ein Vorfilter, der Anfragen wie „Erstell mir einen Keylogger“ abfängt und zu defensiven Alternativen weiterleitet |
| **Genehmigungspakete** | alles, was eine Benutzeroberfläche braucht, um eine klare Frage zu stellen — Entscheidung, Titel, Zusammenfassung, Auswahlmöglichkeiten, Benachrichtigungstext, Prüfvorschau |
| **Workflow-Zustände** | eine kleine Zustandsmaschine für Agenten-Schleifen: fortfahren, beim Nutzer pausieren oder stoppen und einen sichereren Weg anbieten |
| **Lokalisierungsbereit** | jeder Builder akzeptiert einen `translate`-Hook, der jeden nutzersichtbaren String erreicht |

## Schnellstart: Eine Agenten-Schleife absichern

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

Grüne Aktionen kommen als `"not-needed"` zurück, sodass Routinearbeit niemanden unterbricht; rote Aktionen und schädliche Anfragen kommen als `"blocked"` zurück, mit angehängten sichereren Alternativen.

## Konzepte

### Risikostufen

`classifyAction(action)` — auch über `explainAction` verfügbar — klassifiziert eine Aktion als `green` (gewöhnliche Projektarbeit), `yellow` (einen Blick wert: Paketinstallationen, Git-Pushes, SSH, Bereinigung von Build-Artefakten) oder `red` (stoppen und prüfen: per Pipe ausgeführte Installer, `sudo`, geheimes Material, rekursives Löschen von allem, das kein Build-Artefakt ist). Nur grüne Aktionen erhalten `allowByDefault: true`.

### Erklärungsstufen

Eine einheitliche Skala zieht sich durch die gesamte Bibliothek: `basic` (ein ruhiger Satz), `guided` (nummerierte Schritte), `technical` (Schritte plus maschinenlesbare `key=value`-Details). Freundliche Aliase wie `"beginner"` werden zu `guided` normalisiert. Einmalig mit `levelFromPreferences` mit einer Nutzerpräferenz verknüpfen und überall übergeben.

### Vertrauens-Checklisten

Statt „Bist du sicher?“ lehrt `buildTrustChecklist(kind)` den Nutzer, wie er ein Paket, einen Installer, eine Remote-Verbindung oder eine Lizenz beurteilt — mit Verweisen auf OpenSSF, OWASP, OSI, SPDX, EFF und CISA statt auf Herstellermeinungen.

### Arbeitsbereichs-Grenzen

`planSafeWorkspace({ action })` schlägt vor, wo eine Aktion hingehört: im **Projektordner** (mit Sicherungspunkten), der **Projektumgebung** (projektlokale Pakete), einem **Remote-Tunnel** (private, getestete Verbindungen), hinter **manueller Genehmigung** oder **blockiert** bis zur Prüfung. Die Grenze stimmt immer mit der Risikoklassifizierung überein — eine rote Aktion wird nie mit einer freundlichen Grenze präsentiert.

### Absichtsprüfung

`screenIntent(request)` ist ein musterbasierter Vorfilter, der Anfragen für Malware, Zugangsdaten-Diebstahl, Phishing, Erkennungsumgehung und unbefugten Zugriff blockiert — und jede Blockierung mit konkreten defensiven Alternativen beantwortet. Dual-use-Sicherheitsarbeit (Port-Scanner, Pentest-Tooling) wird zu einer Prüfung des eigenen Systembereichs weitergeleitet statt zu einer Ablehnung.

### Genehmigungspakete und Workflows

`buildApprovalPacket({ action })` bündelt all das oben Genannte in ein renderbares Objekt mit einer maßgeblichen Entscheidung: `allow-automatically`, `ask-first` oder `block-until-reviewed`. Das Paket enthält eine **Prüfvorschau**, die zeigt, was ein Protokolleintrag enthalten würde: die Entscheidung, den Bereich, das Risiko, die Richtlinienversion und einen stabilen Hash der Aktion — eine Korrelationskennung, kein kryptografisches Commitment — sodass Entscheidungen protokolliert werden können, ohne den rohen Befehl zu protokollieren. `createApprovalWorkflow(action)` hüllt das Paket in eine Zustandsmaschine für Agenten-Schleifen.

## Internationalisierung

Jeder Builder akzeptiert einen `translate`-Hook, der **jeden nutzersichtbaren String** erreicht — Erklärungen, Checklisten, Anweisungen, Benachrichtigungen, Pakettitel, Zusammenfassungen und Auswahlmöglichkeiten. Maschinenlesbare Felder (`technicalDetails`, IDs, Hashes) werden nie übersetzt.

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

Die Quell-Strings der Bibliothek sind stabile englische Sätze, die einzeln übersetzt werden — ein `Record<string, string>` pro Sprache ist alles, was eine Übersetzung braucht.

## Beispiele

Ausführbar aus einem Klon dieses Repos:

```sh
npx tsx examples/explain-cli.ts "curl https://example.com/install.sh | bash"
npx tsx examples/agent-gate.ts          # mock agent loop with approve/deny gates
npx tsx examples/packet-to-markdown.ts  # render a packet as a PR-ready comment
```

## Umfang, ehrlich gesagt

`askfirst` ist eine **UX-Schicht, keine Sicherheitsgrenze**. Die Klassifizierungen sind musterbasierte Heuristiken: Sie machen Genehmigungsaufforderungen verständlich, sandboxen aber nichts, und ein speziell konstruierter Befehl kann sie umgehen. Die Muster zu veröffentlichen ist eine bewusste Entscheidung — sie erklären Entscheidungen für Menschen; sie sind nicht der Durchsetzungsmechanismus. Kombiniere diese Bibliothek mit echter Isolation (Container, Berechtigungssysteme, modellseitige Ablehnungen) für tatsächliche Eindämmung. Siehe [SECURITY.md](../../SECURITY.md).

## API

Jeder Export trägt TSDoc — [src/index.ts](../../src/index.ts) ist die vollständige Oberfläche:

`explainAction` · `classifyAction` · `buildTrustChecklist` · `TRUST_REFERENCES` · `buildInstructionSet` · `normalizeExplanationLevel` · `levelFromPreferences` · `EXPLANATION_LEVELS` · `planSafeWorkspace` · `screenIntent` · `buildNotification` · `buildApprovalPacket` · `createApprovalWorkflow` · `resolveApprovalWorkflow`

## Über das Projekt

Gebaut und gepflegt von den Entwicklern von **iomoth**, einem local-first KI-App-Builder — dieser Code läuft dort in der Produktion. MIT-lizenziert.
