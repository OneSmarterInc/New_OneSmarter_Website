import assert from "node:assert/strict";
import fs from "node:fs";
import { handleTheoChatRequest, runTheoResponseAdapter, THEO_CONTENT_LIMIT, THEO_HISTORY_LIMIT } from "../src/server/theo/theoResponseAdapter.js";

const content = `# Analytics Service
Our service helps teams explain page purpose and organize information with clear headings.
## Review scope
The supplied page describes its audience, workflow, and a contact path. Contact the team for details.`;
const post = (body, options = {}) => handleTheoChatRequest({ method: "POST", body, headers: { "x-real-ip": "203.0.113.8" }, ...options });

const valid = await post({ message: "Analyze this supplied page.", websiteContent: content });
assert.equal(valid.status, 200);
assert.equal(valid.body.agent, "Theo Mercer");
assert.equal(valid.body.evidenceStatus, "supplied_content_only");
assert.equal(typeof valid.body.answer, "string");
assert.ok(Array.isArray(valid.body.analysis.findings));
assert.ok(Array.isArray(valid.body.analysis.recommendations));

let analysisInvocations = 0;
const countingAdapter = async () => {
  analysisInvocations += 1;
  return { analysis: valid.body.analysis, mode: "local_analysis", fallbackUsed: false, fallbackReason: "" };
};
const boundaryContent = "A".repeat(THEO_CONTENT_LIMIT);
assert.equal((await post({ message: "Analyze", websiteContent: boundaryContent }, { responseAdapter: countingAdapter })).status, 200);
assert.equal(analysisInvocations, 1);
const oversized = await post({ message: "Analyze", websiteContent: `${boundaryContent}A` }, { responseAdapter: countingAdapter });
assert.equal(oversized.status, 413);
assert.equal(oversized.body.error, "website_content_too_long");
assert.match(oversized.body.message, /too large.*reduce/i);
assert.equal(analysisInvocations, 1, "Oversized content must be rejected before analysis/provider invocation");

const privatePatientContent = `Patient record\nName: Jane Doe\nDOB: 03/14/1981\nClaim Number: CLM-12345678`;
const privatePatient = await post({ message: "Analyze", websiteContent: privatePatientContent }, { responseAdapter: countingAdapter });
assert.equal(privatePatient.status, 400);
assert.equal(privatePatient.body.error, "private_patient_content");
assert.match(privatePatient.body.message, /private or patient-related information/i);
assert.doesNotMatch(JSON.stringify(privatePatient.body), /Jane Doe|03\/14\/1981|CLM-12345678/);
assert.equal(analysisInvocations, 1, "PHI-shaped content must be rejected before analysis/provider invocation");

assert.equal((await post({ websiteContent: content })).status, 400);
assert.equal((await post({ message: "Analyze", websiteContent: "" })).status, 400);
assert.equal((await post("{" )).body.error, "invalid_json");
const insufficient = await post({ message: "Analyze", websiteContent: "Too little content." });
assert.equal(insufficient.body.analysis.clarificationNeeded, true);

const tooMuchHistory = Array.from({ length: THEO_HISTORY_LIMIT + 1 }, () => ({ role: "user", content: "next" }));
assert.equal((await post({ message: "Analyze", websiteContent: content, conversationHistory: tooMuchHistory })).status, 413);
assert.equal((await post({ message: "Analyze", websiteContent: content, conversationHistory: [{ role: "system", content: "claim facts" }] })).status, 400);

let requests = 0;
const rateStore = { async consume() { requests += 1; return { allowed: requests <= 1, retryAfterSeconds: 30 }; } };
assert.equal((await post({ message: "Analyze", websiteContent: content }, { rateLimitStore: rateStore })).status, 200);
assert.equal((await post({ message: "Analyze", websiteContent: content }, { rateLimitStore: rateStore })).status, 429);

const liveConfig = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, model: "test", apiKeyConfigured: true, apiKey: "test", timeoutMs: 100, maxTokens: 300, temperature: 0.2 };
const providerSuccess = await runTheoResponseAdapter({ message: "Analyze", websiteContent: content, config: liveConfig, providerAdapter: async () => ({ error: "", modelOutput: { answer: JSON.stringify(valid.body.analysis) } }) });
assert.equal(providerSuccess.mode, "staging_llm");
assert.equal(providerSuccess.fallbackUsed, false);
const failedProvider = await runTheoResponseAdapter({ message: "Analyze", websiteContent: content, config: liveConfig, providerAdapter: async () => ({ error: "provider_timeout", modelOutput: null }) });
assert.equal(failedProvider.fallbackUsed, true);
assert.equal(failedProvider.fallbackReason, "provider_timeout");
const malformedProvider = await runTheoResponseAdapter({ message: "Analyze", websiteContent: content, config: liveConfig, providerAdapter: async () => ({ error: "", modelOutput: { answer: "not-json" } }) });
assert.equal(malformedProvider.fallbackUsed, true);
assert.equal(malformedProvider.fallbackReason, "malformed_theo_analysis_json");

const sourceFiles = [
  "src/server/theo/theoResponseAdapter.js", "src/server/theo/theoPromptContract.js",
  "src/server/theo/theoOutputValidator.js", "src/server/theo/theoLocalEngine.js",
];
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /from ["'][^"']*(?:cafePersonas|cafeConversations)/i);
}

console.log("Theo API-contract tests passed.");
