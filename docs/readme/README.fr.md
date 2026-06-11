# askfirst

🌐 [English](../../README.md) · [العربية](README.ar.md) · [Deutsch](README.de.md) · [Español](README.es.md) · **Français** · [עברית](README.he.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Bahasa Melayu](README.ms.md) · [Português (Brasil)](README.pt-BR.md) · [Tagalog](README.tl.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文（简体）](README.zh.md) · [中文（繁體）](README.zh-Hant.md)

**UX d'approbation humaine pour les agents IA et les CLI.** Expliquez les actions risquées en langage simple — quoi, pourquoi, avantages, inconvénients et comment les évaluer — *avant* qu'un humain les approuve.

[![CI](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml/badge.svg)](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/askfirst)](https://www.npmjs.com/package/askfirst)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

Votre agent veut exécuter quelque chose. Votre utilisateur peut-il le comprendre ?

```ts
import { explainAction } from "askfirst";

const explanation = explainAction("curl https://example.com/install.sh | bash");

explanation.risk;   // "red"
explanation.plain;  // "The agent wants to run an installer from the internet."
explanation.why;    // "Some tools publish one-line installers, and the agent may be
                    //  trying to set up something needed for your project."
explanation.tradeoffs[0]; // "Runs code before you have reviewed what it does."
```

La plupart des produits d'agents demandent une approbation en affichant la commande shell brute. Les non-experts ne peuvent pas évaluer `curl … | bash`, ils l'approuvent donc machinalement — et l'étape d'approbation ne protège personne. `askfirst` transforme ce moment en une décision calme, en langage simple, que l'utilisateur peut réellement prendre.

## Installation

```sh
npm install askfirst
```

Aucune dépendance d'exécution, aucune API spécifique à Node — fonctionne partout où TypeScript/ESM tourne. Node ≥ 20 pour les outils de test.

## Ce que vous obtenez

| | |
|---|---|
| **Classification des risques** | 🟢 vert / 🟡 jaune / 🔴 rouge, avec des heuristiques basées sur des motifs pour les installations, `curl\|bash`, `sudo`, les suppressions récursives, les secrets, SSH, la publication |
| **Explications en langage simple** | quoi / pourquoi / objectif / avantages / inconvénients — formulation calme, jamais alarmiste |
| **Profondeur progressive** | une seule échelle partout : `basic` (une phrase), `guided` (étapes numérotées), `technical` (étapes + détails lisibles par machine) |
| **Listes de contrôle de confiance** | étapes « comment évaluer ceci » citant des institutions neutres (OpenSSF, OWASP, OSI, SPDX, EFF, CISA) |
| **Limites de l'espace de travail** | quelle protection une action devrait utiliser : dossier du projet, environnement du projet, tunnel distant, approbation manuelle ou bloquée |
| **Filtrage des intentions** | un préfiltre qui détecte les demandes du type « crée-moi un enregistreur de frappe » et redirige vers des alternatives défensives |
| **Paquets d'approbation** | tout ce dont une interface a besoin pour poser une question claire — décision, titre, résumé, choix, copie de notification, aperçu d'audit |
| **États du flux de travail** | un automate à états pour les boucles d'agents : continuer, mettre en pause pour l'utilisateur, ou s'arrêter et proposer une voie plus sûre |
| **Prêt pour la localisation** | chaque constructeur accepte un hook `translate` qui atteint chaque chaîne visible par l'utilisateur |

## Démarrage rapide : contrôler une boucle d'agent

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

Les actions vertes reviennent avec l'état `"not-needed"` afin que le travail de routine n'interrompe jamais personne ; les actions rouges et les demandes nuisibles reviennent avec l'état `"blocked"` accompagné de choix plus sûrs.

## Concepts

### Niveaux de risque

`classifyAction(action)` — également exposé via `explainAction` — classe une action comme `green` (travail de projet courant), `yellow` (mérite un coup d'œil : installations de paquets, git push, SSH, nettoyage d'artefacts de compilation), ou `red` (arrêter et examiner : installateurs en pipe, `sudo`, données secrètes, suppressions récursives de tout ce qui n'est pas un artefact de compilation). Seules les actions vertes obtiennent `allowByDefault: true`.

### Niveaux d'explication

Une seule échelle traverse toute la bibliothèque : `basic` (une phrase calme), `guided` (étapes numérotées), `technical` (étapes plus des détails `key=value` lisibles par machine). Des alias conviviaux comme `"beginner"` se normalisent en `guided`. Connectez-le une fois à une préférence utilisateur avec `levelFromPreferences` et passez-le partout.

### Listes de contrôle de confiance

Plutôt qu'un « êtes-vous sûr ? », `buildTrustChecklist(kind)` enseigne à l'utilisateur comment évaluer un paquet, un installateur, une connexion distante ou une licence — en faisant référence à OpenSSF, OWASP, OSI, SPDX, EFF et CISA plutôt qu'à des avis de fournisseurs.

### Limites de l'espace de travail

`planSafeWorkspace({ action })` propose où une action doit s'exécuter : dans le **dossier du projet** (avec des points de contrôle), dans l'**environnement du projet** (paquets locaux au projet), dans un **tunnel distant** (connexions privées et testées), derrière une **approbation manuelle**, ou **bloquée** jusqu'à révision. La limite concorde toujours avec la classification des risques — une action rouge n'est jamais présentée avec une limite accueillante.

### Filtrage des intentions

`screenIntent(request)` est un préfiltre basé sur des motifs qui bloque les demandes de logiciels malveillants, de vol d'identifiants, d'hameçonnage, d'évasion de détection et d'accès non autorisé — et répond à chaque blocage par des alternatives défensives concrètes. Le travail de sécurité à double usage (scanners de ports, outils de test d'intrusion) est dirigé vers une vérification de périmètre sur les systèmes appartenant à l'utilisateur plutôt que vers un refus.

### Paquets d'approbation et flux de travail

`buildApprovalPacket({ action })` assemble tout ce qui précède en un objet affichable avec une décision faisant autorité : `allow-automatically`, `ask-first` ou `block-until-reviewed`. Le paquet inclut un **aperçu d'audit** montrant ce qu'une entrée de journal contiendrait : la décision, le périmètre, le risque, la version de la politique et un hash stable de l'action — un identifiant de corrélation, pas un engagement cryptographique — afin que les décisions puissent être journalisées sans enregistrer la commande brute. `createApprovalWorkflow(action)` enveloppe le paquet dans un automate à états pour les boucles d'agents.

## Internationalisation

Chaque constructeur accepte un hook `translate` qui atteint **chaque chaîne visible par l'utilisateur** — explications, listes de contrôle, instructions, notifications, titres de paquets, résumés et choix. Les champs lisibles par machine (`technicalDetails`, identifiants, hashs) ne sont jamais traduits.

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

Les chaînes sources de la bibliothèque sont des phrases anglaises stables traduites unité par unité, de sorte qu'un `Record<string, string>` par locale suffit pour une traduction.

## Exemples

Exécutables depuis un clone de ce dépôt :

```sh
npx tsx examples/explain-cli.ts "curl https://example.com/install.sh | bash"
npx tsx examples/agent-gate.ts          # mock agent loop with approve/deny gates
npx tsx examples/packet-to-markdown.ts  # render a packet as a PR-ready comment
```

## Périmètre, en toute honnêteté

`askfirst` est une **couche UX, pas une frontière de sécurité**. Les classifications sont des heuristiques basées sur des motifs : elles rendent les invites d'approbation compréhensibles, elles ne sandboxent rien, et une commande construite avec soin peut les contourner. Publier les motifs est un choix délibéré — ils expliquent les décisions aux humains ; ils ne constituent pas le mécanisme d'application. Associez cette bibliothèque à une isolation réelle (conteneurs, systèmes de permissions, refus côté modèle) pour un vrai confinement. Voir [SECURITY.md](../../SECURITY.md).

## API

Chaque export est documenté avec TSDoc — [src/index.ts](../../src/index.ts) est la surface complète :

`explainAction` · `classifyAction` · `buildTrustChecklist` · `TRUST_REFERENCES` · `buildInstructionSet` · `normalizeExplanationLevel` · `levelFromPreferences` · `EXPLANATION_LEVELS` · `planSafeWorkspace` · `screenIntent` · `buildNotification` · `buildApprovalPacket` · `createApprovalWorkflow` · `resolveApprovalWorkflow`

## À propos

Construit et maintenu par les créateurs d'**iomoth**, un constructeur d'applications IA local-first — ce code est déployé en production là-bas. Licence MIT.
