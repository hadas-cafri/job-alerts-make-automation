// Runs the regular expressions that are INSIDE the Make blueprint against a sample email fragment
// and a set of job titles/locations, so the decision rules can be checked without Make.
// Usage: node tests/check-blueprint.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const bp = JSON.parse(readFileSync(new URL("blueprints/job-alerts-gmail-to-airtable.blueprint.json", root), "utf8"));
const html = readFileSync(new URL("docs/drushim-alert-sample-fragment.html", root), "utf8");

const parser = bp.flow.find((m) => m.module === "regexp:Parser");
const router = bp.flow.find((m) => m.module === "builtin:BasicRouter");
const route = (name) => router.routes.map((r) => r.flow[0]).find((m) => m.filter.name === name);

// 1) Extraction from the email (groups: 1 job id, 2 title, 3 company, 4 city, 5 employment type)
const m = html.match(new RegExp(parser.parameters.pattern));
assert.ok(m, "parser pattern must match the sample email");
assert.equal(m[1], "39028226");
assert.equal(m[2], "מנהל/ת פרויקטים טכנולוגיים — מערכות מידע");
assert.equal(m[4], "לוד");
assert.equal(m[5], "משרה מלאה,היברידי");

// Same pattern after Gmail rewrites a manually forwarded message (double quotes, normalised styles)
const fwd = html.replace(/'/g, '"').replace(/#e1e1e1/g, "rgb(225, 225, 225)").replace(/&tid=7/g, "&amp;tid=7");
assert.deepEqual(fwd.match(new RegExp(parser.parameters.pattern)).slice(1, 6), m.slice(1, 6));

// 2) Decision: which route would a job take?
const cond = (r, op, idx) => r.filter.conditions[0].filter((c) => c.o === op)[idx].b;
const fit = route("Fit - Product Manager"), maybe = route("Maybe - Solution role");
const re = (s) => new RegExp(s, "i");
const PM = re(cond(fit, "text:pattern:ci", 0));
const EXCLUDE = re(cond(fit, "text:notpattern:ci", 0));
const LOC = re(cond(fit, "text:pattern:ci", 1));
const SA = re(cond(maybe, "text:pattern:ci", 0));

const decide = (title, where) => {
  if (EXCLUDE.test(title) || !LOC.test(where)) return "skip";
  if (PM.test(title)) return "Fit";
  if (SA.test(title)) return "Maybe";
  return "skip";
};
const cases = [
  ["מנהל/ת פרויקטים טכנולוגיים — מערכות מידע", "לוד | משרה מלאה,היברידי", "skip"],
  ["Senior Product Manager", "תל אביב-יפו | היברידי", "Fit"],
  ["מנהל/ת מוצר", "חיפה | עבודה מהבית", "Fit"],
  ["מנהלת מוצר דיגיטל", "חיפה | משרה מלאה", "skip"],
  ["Product Marketing Manager", "רעננה | משרה מלאה", "skip"],
  ["Solutions Architect", "רחובות | משרה מלאה", "Maybe"],
  ["ארכיטקט/ית פתרונות", "פתח תקוה | משרה מלאה", "Maybe"],
  ["Product Manager / Solution Architect", "רעננה | משרה מלאה", "Fit"],
  ["Technical Product Manager", "תל אביב | משרה מלאה", "skip"],
  ["Principal Product Manager", "תל אביב | משרה מלאה", "skip"],
];
for (const [t, w, want] of cases) assert.equal(decide(t, w), want, `${t} | ${w}`);
console.log(`OK: extraction (2 HTML variants) and ${cases.length} decision cases pass`);
