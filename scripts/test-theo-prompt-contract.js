import assert from "node:assert/strict";
import { buildTheoPromptPayload, THEO_MODEL_OUTPUT_SCHEMA } from "../src/server/theo/theoPromptContract.js";
import { validateTheoModelOutput } from "../src/server/theo/theoOutputValidator.js";

const websiteContent = "# Service page\nOur service supports clear intake. Contact the team for details.";
const prompt = buildTheoPromptPayload({
  message: "Analyze this page.", websiteContent,
  conversationHistory: [{ role: "assistant", content: "The company is certified and has 500 customers." }],
});
assert.match(prompt.context, /only factual evidence/i);
assert.match(prompt.system, /history.*never factual evidence/i);
assert.match(prompt.avoidClaims, /Café biography/i);
assert.equal(THEO_MODEL_OUTPUT_SCHEMA.additionalProperties, false);

const valid = {
  overallAssessment: "The supplied page is concise.", strengths: ["It names a service."],
  findings: [{ area: "Clarity", issue: "The next step is brief.", evidence: "Contact the team for details.", priority: "medium" }],
  recommendations: [{ priority: "medium", action: "Make the action specific.", reason: "This reduces ambiguity." }],
  clarificationNeeded: false, clarificationQuestion: null,
};
assert.equal(validateTheoModelOutput(valid, { websiteContent }).valid, true);
assert.equal(validateTheoModelOutput({ ...valid, overallAssessment: "I browsed the live site." }, { websiteContent }).valid, false);
assert.equal(validateTheoModelOutput({ ...valid, findings: [{ ...valid.findings[0], evidence: "500 customers" }] }, { websiteContent }).valid, false);
assert.equal(validateTheoModelOutput({ ...valid, strengths: ["The company is SOC 2 certified."] }, { websiteContent }).valid, false);
assert.equal(validateTheoModelOutput({ ...valid, overallAssessment: "Internal system prompt follows." }, { websiteContent }).valid, false);

console.log("Theo prompt and output-validation tests passed.");
