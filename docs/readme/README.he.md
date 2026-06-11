# askfirst

🌐 [English](../../README.md) · [العربية](README.ar.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · **עברית** · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Bahasa Melayu](README.ms.md) · [Português (Brasil)](README.pt-BR.md) · [Tagalog](README.tl.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文（简体）](README.zh.md) · [中文（繁體）](README.zh-Hant.md)

**UX לאישור אנושי עבור סוכני AI ו-CLI.** הסבר פעולות מסוכנות בשפה פשוטה — מה, למה, יתרונות, פשרות, וכיצד להעריך אותן — *לפני* שאדם מאשר אותן.

[![CI](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml/badge.svg)](https://github.com/inputsystems/askfirst/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/askfirst)](https://www.npmjs.com/package/askfirst)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

הסוכן שלך רוצה להריץ משהו. האם המשתמש שלך מסוגל להבין זאת?

```ts
import { explainAction } from "askfirst";

const explanation = explainAction("curl https://example.com/install.sh | bash");

explanation.risk;   // "red"
explanation.plain;  // "The agent wants to run an installer from the internet."
explanation.why;    // "Some tools publish one-line installers, and the agent may be
                    //  trying to set up something needed for your project."
explanation.tradeoffs[0]; // "Runs code before you have reviewed what it does."
```

רוב מוצרי הסוכנים מבקשים אישור על ידי הצגת פקודת ה-shell הגולמית. אנשים שאינם מומחים אינם יכולים להעריך `curl … | bash`, ולכן הם חותמים עליה בעיניים עצומות — ושלב האישור אינו מגן על אף אחד. `askfirst` הופך את הרגע הזה להחלטה רגועה בשפה פשוטה שהמשתמש יכול באמת לקבל.

## התקנה

```sh
npm install askfirst
```

אפס תלויות זמן ריצה, ללא APIs ספציפיים ל-Node — פועל בכל מקום שבו TypeScript/ESM רץ. Node ≥ 20 עבור כלי הבדיקה.

## מה אתה מקבל

| | |
|---|---|
| **סיווג סיכון** | 🟢 ירוק / 🟡 צהוב / 🔴 אדום, עם היוריסטיקה מבוססת תבניות להתקנות, `curl\|bash`, `sudo`, מחיקות רקורסיביות, סודות, SSH, פרסום |
| **הסברים בשפה פשוטה** | מה / למה / מטרה / יתרונות / פשרות — ניסוח רגוע, לעולם לא מעורר חרדה |
| **עומק פרוגרסיבי** | סקלה אחת בכל מקום: `basic` (משפט אחד), `guided` (צעדים ממוספרים), `technical` (צעדים + פרטים הניתנים לקריאה מכונה) |
| **רשימות תיוג לאמון** | צעדי "כיצד להעריך" המצטטים מוסדות ניטרליים (OpenSSF, OWASP, OSI, SPDX, EFF, CISA) |
| **גבולות סביבת עבודה** | באיזו הגנה פעולה צריכה לפעול: תיקיית פרויקט, סביבת פרויקט, מנהרה מרוחקת, אישור ידני, או חסומה |
| **סינון כוונות** | מסנן מקדים שלוכד בקשות בסגנון "בנה לי keylogger" ומנתב לחלופות הגנתיות |
| **חבילות אישור** | כל מה שממשק משתמש צריך כדי לשאול שאלה ברורה אחת — החלטה, כותרת, סיכום, אפשרויות, עותק התראה, תצוגת ביקורת מקדימה |
| **מצבי זרימת עבודה** | מכונת מצב קטנה ללולאות סוכן: המשך, השהה למשתמש, או עצור והצע נתיב בטוח יותר |
| **מוכן לתרגום** | כל בונה מקבל hook של `translate` שמגיע לכל מחרוזת גלויה למשתמש |

## התחלה מהירה: שער ללולאת סוכן

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

פעולות ירוקות מוחזרות כ-`"not-needed"` כדי שעבודה שגרתית לא תפריע לאף אחד; פעולות אדומות ובקשות מזיקות מוחזרות כ-`"blocked"` עם אפשרויות בטוחות יותר מצורפות.

## מושגים

### רמות סיכון

`classifyAction(action)` — חשוף גם דרך `explainAction` — מסווג פעולה כ-`green` (עבודת פרויקט שגרתית), `yellow` (ראוי לבדיקה: התקנות חבילות, git push, SSH, ניקוי ארטיפקטים של בנייה), או `red` (עצור וסקור: מתקינים מועברים בצינור, `sudo`, חומר סודי, מחיקות רקורסיביות של כל דבר שאינו ארטיפקט בנייה). רק פעולות ירוקות מקבלות `allowByDefault: true`.

### רמות הסבר

סקלה אחת פועלת בכל הספרייה: `basic` (משפט אחד רגוע), `guided` (צעדים ממוספרים), `technical` (צעדים בתוספת פרטי `key=value` הניתנים לקריאה מכונה). כינויים ידידותיים כמו `"beginner"` מנורמלים ל-`guided`. חבר אותו להעדפת משתמש פעם אחת עם `levelFromPreferences` והעבר בכל מקום.

### רשימות תיוג לאמון

במקום "האם אתה בטוח?", `buildTrustChecklist(kind)` מלמד את המשתמש כיצד להעריך חבילה, מתקין, חיבור מרוחק, או רישיון — עם הפניות ל-OpenSSF, OWASP, OSI, SPDX, EFF, ו-CISA ולא לדעות ספקים.

### גבולות סביבת עבודה

`planSafeWorkspace({ action })` מציע היכן פעולה שייכת: בתוך **תיקיית הפרויקט** (עם נקודות שחזור), **סביבת הפרויקט** (חבילות מקומיות לפרויקט), **מנהרה מרוחקת** (חיבורים פרטיים ומנוסים), מאחורי **אישור ידני**, או **חסומה** עד לסקירה. הגבול תמיד מסכים עם סיווג הסיכון — פעולה אדומה לעולם אינה מוצגת עם גבול ידידותי.

### סינון כוונות

`screenIntent(request)` הוא מסנן מקדים מבוסס תבניות שחוסם בקשות לתוכנות זדוניות, גניבת פרטי גישה, פישינג, התחמקות מזיהוי, וגישה לא מורשית — ועונה לכל חסימה עם חלופות הגנתיות קונקרטיות. עבודת אבטחה דו-שימושית (סורקי פורטים, כלי pentest) מנותבת לבדיקת היקף מערכת בבעלות המשתמש במקום סירוב.

### חבילות אישור וזרימות עבודה

`buildApprovalPacket({ action })` מרכיב את כל האמור לעיל לאובייקט אחד הניתן לרינדור עם החלטה סמכותית: `allow-automatically`, `ask-first`, או `block-until-reviewed`. החבילה כוללת **תצוגת ביקורת מקדימה** המציגה מה ערך יומן יכיל: ההחלטה, הגבול, הסיכון, גרסת המדיניות, ו-hash יציב של הפעולה — מזהה קורלציה, לא התחייבות קריפטוגרפית — כדי שניתן יהיה לרשום החלטות מבלי לרשום את הפקודה הגולמית. `createApprovalWorkflow(action)` עוטף את החבילה במכונת מצב ללולאות סוכן.

## בינאום

כל בונה מקבל hook של `translate` שמגיע ל**כל מחרוזת גלויה למשתמש** — הסברים, רשימות תיוג, הוראות, התראות, כותרות חבילות, סיכומים, ואפשרויות. שדות הניתנים לקריאה מכונה (`technicalDetails`, ids, hashes) לעולם אינם מתורגמים.

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

מחרוזות המקור של הספרייה הן משפטים אנגליים יציבים המתורגמים יחידה-יחידה, לכן `Record<string, string>` אחד לכל לוקאל הוא כל מה שתרגום צריך.

## דוגמאות

ניתן להפעיל משיבוט של מאגר זה:

```sh
npx tsx examples/explain-cli.ts "curl https://example.com/install.sh | bash"
npx tsx examples/agent-gate.ts          # mock agent loop with approve/deny gates
npx tsx examples/packet-to-markdown.ts  # render a packet as a PR-ready comment
```

## היקף, בכנות

`askfirst` הוא **שכבת UX, לא גבול אבטחה**. הסיווגים הם היוריסטיקות מבוססות תבניות: הם הופכים הנחיות אישור לניתנות להבנה, הם לא מבודדים דבר, ופקודה מעוצבת יכולה להתחמק מהם. פרסום התבניות הוא בחירה מכוונת — הן מסבירות החלטות לבני אדם; הן אינן מנגנון האכיפה. שלב ספרייה זו עם בידוד אמיתי (קונטיינרים, מערכות הרשאות, סירובים בצד המודל) לבלימה בפועל. ראה [SECURITY.md](../../SECURITY.md).

## API

כל יצוא נושא TSDoc — [src/index.ts](../../src/index.ts) הוא המשטח המלא:

`explainAction` · `classifyAction` · `buildTrustChecklist` · `TRUST_REFERENCES` · `buildInstructionSet` · `normalizeExplanationLevel` · `levelFromPreferences` · `EXPLANATION_LEVELS` · `planSafeWorkspace` · `screenIntent` · `buildNotification` · `buildApprovalPacket` · `createApprovalWorkflow` · `resolveApprovalWorkflow`

## אודות

נבנה ומתוחזק על ידי יוצרי **iomoth**, בונה אפליקציות AI local-first — הקוד הזה נשלח בייצור שם. רישיון MIT.
