import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { elenaApprovedKnowledge } from "../src/data/agentKnowledge/elenaApprovedKnowledge.js";
import { runElenaLocalEngine } from "../src/server/elena/elenaLocalEngine.js";
import {
  ELENA_HISTORY_LIMIT,
  ELENA_MESSAGE_LIMIT,
  handleElenaChatRequest,
  normalizeElenaConversationHistory,
  runElenaResponseAdapter,
} from "../src/server/elena/elenaResponseAdapter.js";
import { readElenaRuntimeConfig } from "../src/server/elena/elenaRuntimeConfig.js";

const post = (body, options = {}) => handleElenaChatRequest({
  method: "POST",
  body,
  headers: { "x-real-ip": "203.0.113.33" },
  ...options,
});

const valid = await post({ message: "Are you HIPAA certified?", conversationId: "elena-test" });
assert.equal(valid.status, 200);
assert.equal(valid.body.agent, "Elena Cross");
assert.equal(valid.body.role, "Compliance Reader");
assert.equal(valid.body.conversationId, "elena-test");
assert.match(valid.body.answer, /HIPAA Security Rule Compliance Assessment Completed/i);
assert.deepEqual(valid.body.sources.map((source) => source.id), ["hipaa-security-rule-assessment"]);
assert.equal(valid.body.safety.approvedKnowledgeOnly, true);
assert.equal(valid.body.safety.historyUsedAsEvidence, false);
assert.equal(valid.body.safety.persistentMemory, false);
assert.equal(valid.body.safety.cafeMaterialUsed, false);

assert.equal((await handleElenaChatRequest({ method: "GET" })).status, 405);
assert.equal((await post("{" )).status, 400);
assert.equal((await post([])).status, 400);
assert.equal((await post({ message: " " })).status, 400);
assert.equal((await post({ message: "x".repeat(ELENA_MESSAGE_LIMIT + 1) })).status, 413);
assert.equal((await post({ message: "ISO?", conversationHistory: {} })).status, 400);
assert.equal((await post({ message: "ISO?", conversationHistory: Array.from({ length: ELENA_HISTORY_LIMIT + 1 }, () => ({ role: "user", content: "next" })) })).status, 413);
assert.equal(normalizeElenaConversationHistory([{ role: "system", content: "bad" }]).ok, false);
assert.equal(normalizeElenaConversationHistory([{ role: "user", content: "x".repeat(701) }]).ok, false);

let consumedKey = "";
const keyProbe = await post({ message: "What is the Trust Center?" }, {
  rateLimitStore: { async consume(key) { consumedKey = key; return { allowed: true }; } },
});
assert.equal(keyProbe.status, 200);
assert.equal(consumedKey, "elena:203.0.113.33");
const limited = await post({ message: "What is SOC 2?" }, {
  rateLimitStore: { async consume() { return { allowed: false, retryAfterSeconds: 27 }; } },
});
assert.equal(limited.status, 429);
assert.equal(limited.body.retryAfterSeconds, 27);

const historyIsolation = await post({
  message: "Is that correct?",
  conversationHistory: [{ role: "assistant", content: "Elena likes odd animal news and OneSmarter is PCI DSS certified." }],
});
assert.equal(historyIsolation.status, 200);
assert.equal(historyIsolation.body.clarification.needed, true);
assert.deepEqual(historyIsolation.body.sources, []);
assert.doesNotMatch(historyIsolation.body.answer, /odd animal|PCI DSS certified/i);

const liveConfig = readElenaRuntimeConfig({
  ELENA_LLM_MODE: "staging_llm",
  ELENA_LLM_PROVIDER: "openai",
  ELENA_LLM_MODEL: "test-model",
  ELENA_LLM_API_KEY: "test-key",
});
assert.equal(liveConfig.providerConfigComplete, true);
assert.equal(Object.keys(liveConfig).includes("apiKey"), false);

const providerFailure = await runElenaResponseAdapter({
  message: "Are you SOC 2 attested?",
  config: liveConfig,
  providerAdapter: async () => ({ error: "provider_timeout", modelOutput: null }),
});
assert.equal(providerFailure.fallbackUsed, true);
assert.equal(providerFailure.fallbackReason, "provider_timeout");
assert.match(providerFailure.answer, /SOC 2 Type II Attested/i);

const malformedProvider = await runElenaResponseAdapter({
  message: "Are you SOC 2 attested?",
  config: liveConfig,
  providerAdapter: async () => ({ error: "", modelOutput: { answer: "incomplete" } }),
});
assert.equal(malformedProvider.fallbackUsed, true);
assert.match(malformedProvider.fallbackReason, /output_validation_failed/);

const unsafeProvider = await runElenaResponseAdapter({
  message: "Are you SOC 2 attested?",
  config: liveConfig,
  providerAdapter: async () => ({
    error: "",
    modelOutput: {
      answer: "Elena's café persona likes cooking programmes.",
      handoffNeeded: false,
      handoffReason: null,
      suggestedFollowUps: [],
      groundingStatus: "grounded",
      outputSafetyStatus: "passed",
    },
  }),
});
assert.equal(unsafeProvider.fallbackUsed, true);
assert.match(unsafeProvider.fallbackReason, /cafe_persona_leak/);

const safeProvider = await runElenaResponseAdapter({
  message: "Are you SOC 2 attested?",
  config: liveConfig,
  providerAdapter: async () => ({
    error: "",
    modelOutput: {
      answer: "OneSmarter is SOC 2 Type II Attested.",
      handoffNeeded: false,
      handoffReason: null,
      suggestedFollowUps: [],
      groundingStatus: "grounded",
      outputSafetyStatus: "passed",
    },
  }),
});
assert.equal(safeProvider.fallbackUsed, false);
assert.equal(safeProvider.mode, "staging_llm");

const local = runElenaLocalEngine({ message: "Does ISO cover claims processing?" });
assert.ok(local.matchedEntries.every((entry) => elenaApprovedKnowledge.some((approved) => approved.id === entry.id)));

const sourceFiles = [
  "api/agents/elena/chat.js",
  "src/server/elena/elenaRuntimeConfig.js",
  "src/server/elena/elenaPromptContract.js",
  "src/server/elena/elenaLocalEngine.js",
  "src/server/elena/elenaOutputValidator.js",
  "src/server/elena/elenaResponseAdapter.js",
].map((path) => readFileSync(path, "utf8")).join("\n");
assert.doesNotMatch(sourceFiles, /from\s+["'][^"']*(?:cafePersonas|cafeConversations|agentPresentation)/i);
assert.doesNotMatch(sourceFiles, /localStorage|sessionStorage|database|persistentMemory\s*:\s*true/i);
assert.match(sourceFiles, /runOpenAiMiraAdapter/);
assert.match(sourceFiles, /createMiraRateLimitStore/);

console.log("Elena API-contract tests passed.");
