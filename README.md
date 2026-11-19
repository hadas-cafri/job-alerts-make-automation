# Job alerts from email → Airtable (Make automation)

אוטומציה ב-[Make](https://www.make.com) שקוראת מיילים של התראות משרות, מחליטה אם המשרה מתאימה לכללים של המשתמשת, ורק אם כן כותבת אותה כשורה חדשה ב-Airtable. היא חלק מדאשבורד אישי לחיפוש עבודה ([My-New-Job](https://github.com/hadas-cafri/My-New-Job)).

*English: a Make scenario that reads job-alert emails, decides whether a job fits a fixed set of rules, and writes only the fitting ones to Airtable as new rows. Exported as a Blueprint (JSON) so it can be imported into another Make account.*

## מה היא עושה

```
Gmail (Watch emails) → Text parser → Airtable (Search records) → Numeric aggregator → Router → Airtable (Create a record)
   התראה חדשה          חילוץ שדות       האם המשרה כבר קיימת?        0 = לא קיימת       החלטה       שורה חדשה
```

| # | רכיב ב-Make | תפקיד |
|---|---|---|
| 1 | **Gmail ← Watch emails** | קורא מיילים חדשים בתיבה ייעודית שמקבלת רק התראות משרות |
| 2 | **Text parser ← Match pattern** | מחלץ מה-HTML של המייל: מזהה משרה, כותרת, חברה, עיר, סוג העסקה |
| 3 | **Airtable ← Search records** | בודק אם `External ID` (למשל `Drushim:39028226`) כבר קיים בטבלה |
| 4 | **Tools ← Numeric aggregator** | מוציא תוצאה גם כשהחיפוש חזר ריק (אחרת Make עוצר), `0` = המשרה חדשה |
| 5 | **Router** (2 מסלולים עם פילטרים) | ההחלטה: משרת Product Manager → `Fit`; ארכיטקט/מומחה פתרונות → `Maybe`; אחרת לא נכתב כלום |
| 6 | **Airtable ← Create a record** (×2) | כותב שורה אחת, רק למשרה חדשה שעברה את ההחלטה |

הכללים המלאים בתיעוד: [`docs/decision-rules.md`](docs/decision-rules.md).

## בטיחות

- **אין כפילויות:** משרה שכבר ב-Airtable (לפי `External ID`) לא נכתבת שוב. נבדק עם הרצה כפולה על אותו מייל.
- **לא נוגעת בסטטוס שלך:** נכתבת רק משרה חדשה, עם `Status = New`. שורה קיימת לא משתנה לעולם.
- **לא מגישה מועמדות:** האוטומציה רק יוצרת שורה. ההגשה תמיד ידנית.
- **אין סודות בקובץ:** חיבורי Gmail ו-Airtable הוסרו מה-Blueprint (`__IMTCONN__: null`), מזהי ה-Base וה-Table הוחלפו ב-`YOUR_BASE_ID` / `YOUR_TABLE_ID`, ותוויות החיבורים נוקו.

## איך מייבאים

1. ב-Make: **Create a new scenario ← ⋯ (More) ← Import Blueprint** ובחרי את `blueprints/job-alerts-gmail-to-airtable.blueprint.json`.
2. **Gmail:** צרי חיבור לחשבון Gmail ייעודי להתראות (מומלץ חשבון נפרד, ולהתחיל מהרשאת הקריאה בלבד).
3. **Airtable:** צרי חיבור עם טוקן מוגבל לבסיס אחד (`data.records:read`, `data.records:write`, `schema.bases:read`).
4. בכל מודול Airtable בחרי Base ו-Table משלך. ב-**Create a record** בחרי שוב את השדות (מזהי השדות בקובץ שייכים לבסיס המקורי).
5. בטבלה נדרשים השדות: `External ID`, `Title`, `Company`, `Location`, `Location OK` (תיבת סימון), `Office Requirement`, `Apply URL`, `Source`, `Status`, `Triage` (`Fit` / `Maybe` / `Not fit`), `Posted Date`, `First Seen`, `Last Seen`.
6. **השאירי את התרחיש כבוי (Inactive)** עד שבדקת. בדיקה: **Run once**, ובמודול ה-Gmail קליק ימני ← **Choose where to start** ← בחירת מייל התראה.

> **לא נבדק:** ייבוא הקובץ המנוקה לחשבון Make אחר. ה-Blueprint המקורי נבנה ונבדק בחשבון אחד (חיפוש, החלטה וכתיבה אומתו מול Airtable אמיתי), והמנוקה נבדק רק מול טסט הכללים שלמטה.

## מגבלות ידועות

- **נתמך רק פורמט אחד:** התראת "משרה חדשה" יחידה מדרושים (Drushim). התראות מרובות משרות ו-LinkedIn דורשות תבנית חילוץ נפרדת.
- משרות מחוץ לאזורי ההגעה **לא נכתבות** (הדאשבורד הראשי שומר אותן ומסתיר).
- `Office Requirement` נכתב `Unknown` גם כשהמייל אומר "היברידי", ו-`Description` לא נכתב.
- בשם החברה עלול להיות תו בלתי נראה (`U+200F`) בסוף.
- שמות הערים ברשימה הם רשימת הערים הספציפית של המשתמשת, ויש לערוך אותה בפילטרים של שני המסלולים.

## טסט

```
node tests/check-blueprint.mjs
```

קורא את התבניות מתוך ה-Blueprint עצמו ובודק אותן על קטע מייל לדוגמה (`docs/drushim-alert-sample-fragment.html`, בשני כתיבים של ה-HTML) ועל 10 מקרי החלטה. אין תלויות.

## מבנה

```
blueprints/   קובץ ה-Blueprint (JSON, מנוקה)
docs/         כללי ההחלטה + קטע מייל לדוגמה
tests/        בדיקת התבניות
```
