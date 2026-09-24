import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const privacy = readFileSync(new URL("../src/components/Privacy.jsx", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
for (const [component, disclosure] of [["<Analytics", "Vercel Analytics"], ["<SpeedInsights", "Vercel Speed Insights"]]) {
  if (main.includes(component)) assert.ok(privacy.includes(disclosure), `${component} requires privacy disclosure`);
}
for (const preserved of ["Google Analytics 4", "Google Consent Mode", "limited cookieless measurement signals", "Cookie Settings"]) {
  assert.ok(privacy.includes(preserved));
}
assert.ok(privacy.split("\n").map((line) => line.trim()).join(" ").includes("not controlled by the Google Analytics cookie choices"));
assert.ok(privacy.includes("https://vercel.com/docs/analytics/privacy-policy"));
assert.ok(privacy.includes("https://vercel.com/docs/speed-insights/privacy-policy"));
console.log("Privacy disclosures passed: installed Vercel services disclosed separately; Google consent wording retained.");
