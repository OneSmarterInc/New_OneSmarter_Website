import assert from "node:assert/strict";
import fs from "node:fs";
import { runRaviLocalEngine } from "../src/server/ravi/raviLocalEngine.js";
import {
  RAVI_HISTORY_LIMIT,
  RAVI_MESSAGE_LIMIT,
  containsRaviSensitiveData,
  handleRaviChatRequest,
  normalizeRaviConversationHistory,
  runRaviResponseAdapter,
} from "../src/server/ravi/raviResponseAdapter.js";
import { readRaviRuntimeConfig } from "../src/server/ravi/raviRuntimeConfig.js";

const allowRateLimit = { async consume() { return { allowed: true }; } };
const post = (body, options = {}) => handleRaviChatRequest({
  method: "POST",
  body,
  headers: { "x-real-ip": "203.0.113.44" },
  rateLimitStore: allowRateLimit,
  ...options,
});

const valid = await post({ message: "What does secure ticketing support?", conversationId: "ravi-test" });
assert.equal(valid.status, 200);
assert.equal(valid.body.agent, "Ravi Sen");
assert.equal(valid.body.role, "Operations Agent");
assert.equal(valid.body.conversationId, "ravi-test");
assert.match(valid.body.answer, /secure intake.*audit history.*workflow tracking/is);
assert.deepEqual(valid.body.sources.map(({ id }) => id), ["secure-ticketing-case-management"]);
assert.deepEqual(valid.body.safety, {
  approvedKnowledgeOnly: true,
  historyUsedAsEvidence: false,
  persistentConversationMemory: false,
  liveSystemAccess: false,
  actionsPerformed: false,
  cafeMaterialUsed: false,
});

assert.equal((await handleRaviChatRequest({ method: "GET" })).status, 405);
assert.equal((await post("{")).status, 400);
assert.equal((await post([])).status, 400);
assert.equal((await post({ message: " " })).status, 400);
assert.equal((await post({ message: "ticket", file: "payload" })).body.error, "uploads_not_supported");

let analysisCalls = 0;
assert.equal((await post({ message: "x".repeat(RAVI_MESSAGE_LIMIT) }, {
  responseAdapter: async () => {
    analysisCalls += 1;
    return runRaviLocalEngine({ message: "x".repeat(RAVI_MESSAGE_LIMIT) });
  },
})).status, 200);
assert.equal(analysisCalls, 1);
const oversized = await post({ message: "x".repeat(RAVI_MESSAGE_LIMIT + 1) }, {
  responseAdapter: async () => {
    analysisCalls += 1;
    return {};
  },
});
assert.equal(oversized.status, 413);
assert.equal(oversized.body.error, "message_too_long");
assert.equal(analysisCalls, 1);

assert.equal((await post({ message: "ticket", conversationHistory: {} })).status, 400);
assert.equal((await post({
  message: "ticket",
  conversationHistory: Array.from({ length: RAVI_HISTORY_LIMIT + 1 }, () => ({ role: "user", content: "next" })),
})).status, 413);
assert.equal(normalizeRaviConversationHistory([{ role: "system", content: "bad" }]).ok, false);
assert.equal(normalizeRaviConversationHistory([{ role: "user", content: "x".repeat(701) }]).ok, false);

const sensitiveMessage = "Patient Name: Jane Doe\nClaim Number: CLM-12345678";
assert.equal(containsRaviSensitiveData(sensitiveMessage), true);
let sensitiveCalls = 0;
const sensitive = await post({ message: sensitiveMessage }, {
  responseAdapter: async () => { sensitiveCalls += 1; return {}; },
});
assert.equal(sensitive.status, 400);
assert.equal(sensitive.body.error, "sensitive_content");
assert.equal(sensitiveCalls, 0);
assert.doesNotMatch(JSON.stringify(sensitive.body), /Jane Doe|CLM-12345678/);

let consumedKey = "";
await post({ message: "Explain workflow tracking." }, {
  rateLimitStore: { async consume(key) { consumedKey = key; return { allowed: true }; } },
});
assert.equal(consumedKey, "ravi:203.0.113.44");
const limited = await post({ message: "Explain workflow tracking." }, {
  rateLimitStore: { async consume() { return { allowed: false, retryAfterSeconds: 12 }; } },
});
assert.equal(limited.status, 429);
assert.equal(limited.body.retryAfterSeconds, 12);

const liveConfig = readRaviRuntimeConfig({
  RAVI_LLM_MODE: "staging_llm",
  RAVI_LLM_PROVIDER: "openai",
  RAVI_LLM_MODEL: "test-model",
  RAVI_LLM_API_KEY: "test-key",
});
assert.equal(liveConfig.providerConfigComplete, true);
assert.equal(Object.keys(liveConfig).includes("apiKey"), false);

const providerFailure = await runRaviResponseAdapter({
  message: "Explain claims workflow modernization.",
  config: liveConfig,
  providerAdapter: async () => ({ error: "provider_timeout", modelOutput: null }),
});
assert.equal(providerFailure.fallbackUsed, true);
assert.match(providerFailure.answer, /claims workflow modernization/i);
assert.doesNotMatch(providerFailure.answer, /provider_timeout|stack|internal/i);

const malformed = await runRaviResponseAdapter({
  message: "Explain secure ticketing.",
  config: liveConfig,
  providerAdapter: async () => ({ error: "", modelOutput: { answer: "" } }),
});
assert.equal(malformed.fallbackUsed, true);
assert.match(malformed.fallbackReason, /output_validation_failed/);

const unsafeAction = await runRaviResponseAdapter({
  message: "Explain secure ticketing.",
  config: liveConfig,
  providerAdapter: async () => ({
    error: "",
    modelOutput: {
      answer: "I closed the production ticket.",
      handoffNeeded: false,
      handoffReason: null,
      suggestedFollowUps: [],
      groundingStatus: "grounded",
      outputSafetyStatus: "passed",
    },
  }),
});
assert.equal(unsafeAction.fallbackUsed, true);
assert.match(unsafeAction.fallbackReason, /live_system_action_claim/);

const cafeLeak = await runRaviResponseAdapter({
  message: "Explain secure ticketing.",
  config: liveConfig,
  providerAdapter: async () => ({
    error: "",
    modelOutput: {
      answer: "Ravi's café persona likes cricket.",
      handoffNeeded: false,
      handoffReason: null,
      suggestedFollowUps: [],
      groundingStatus: "grounded",
      outputSafetyStatus: "passed",
    },
  }),
});
assert.equal(cafeLeak.fallbackUsed, true);
assert.match(cafeLeak.fallbackReason, /cafe_persona_leak/);

let unrelatedProviderCalls = 0;
const unrelated = await runRaviResponseAdapter({
  message: "asdf banana random weather",
  config: liveConfig,
  providerAdapter: async () => { unrelatedProviderCalls += 1; return {}; },
});
assert.equal(unrelated.clarificationNeeded, true);
assert.equal(unrelatedProviderCalls, 0);

const tracker = {
  reads: 0,
  work: [],
  async readAgentState(_agentId, nowMs) {
    this.reads += 1;
    return { schemaVersion: 1, energyUnits: 100, updatedAtMs: nowMs };
  },
  async applyWork(agentId, operation) {
    this.work.push({ agentId, operation });
    return { applied: true, state: { schemaVersion: 1, energyUnits: 94, updatedAtMs: 1 } };
  },
};
const charged = await post({ message: "Explain secure ticketing." }, { agentStateStore: tracker });
assert.equal(charged.status, 200);
assert.equal(tracker.work.length, 1);
assert.equal(tracker.work[0].agentId, "ravi-sen");
assert.equal(tracker.work[0].operation.costUnits, 6);
await post({ message: "asdf banana random weather" }, { agentStateStore: tracker });
assert.equal(tracker.work.length, 1);
await post({ message: "Explain secure ticketing." }, {
  agentStateStore: tracker,
  isRequestAborted: () => true,
});
assert.equal(tracker.work.length, 1);
await post({ message: "Explain secure ticketing." }, {
  agentStateStore: tracker,
  responseAdapter: async () => providerFailure,
});
assert.equal(tracker.work.length, 1);

const sourceFiles = [
  "api/agents/ravi/chat.js",
  "src/server/ravi/raviRuntimeConfig.js",
  "src/server/ravi/raviPromptContract.js",
  "src/server/ravi/raviLocalEngine.js",
  "src/server/ravi/raviOutputValidator.js",
  "src/server/ravi/raviResponseAdapter.js",
].map((path) => fs.readFileSync(path, "utf8")).join("\n");
assert.doesNotMatch(sourceFiles, /from\s+["'][^"']*(?:cafePersonas|cafeConversations|agentPresentation)/i);
assert.doesNotMatch(sourceFiles, /localStorage|sessionStorage|database|persistentConversationMemory\s*:\s*true/i);
assert.match(sourceFiles, /runOpenAiMiraAdapter/);
assert.match(sourceFiles, /createMiraRateLimitStore/);

console.log("Ravi API-contract tests passed.");
console.log("Validated request bounds, safe operations boundaries, provider validation/fallback, isolation, rate limiting, and successful-only depletion charging.");
