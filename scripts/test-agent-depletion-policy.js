import assert from "node:assert/strict";
import {
  AGENT_CAFE_RESTORATION_UNITS,
  AGENT_CONCISE_BAND_MAX,
  AGENT_MAX_ENERGY,
  AGENT_MIN_USEFUL_ENERGY,
  AGENT_PASSIVE_RECOVERY_UNITS_PER_HOUR,
  AGENT_VERBOSITY_BANDS,
  AGENT_WORK_COSTS,
  getAgentVerbosityBand,
  getAgentWorkOperation,
  getConciseResponseGuidance,
  getRecoveredEnergyUnits,
} from "../src/server/agentState/agentDepletionPolicy.js";
import {
  chargeSuccessfulAgentWork,
  readAgentDepletionContext,
  restoreAgentForCafeEvent,
} from "../src/server/agentState/agentDepletionRuntime.js";
import { createAgentStateMemoryStore } from "../src/server/agentState/agentStateMemoryStore.js";
import { createAgentStateStore } from "../src/server/agentState/agentStateStore.js";
import { runMiraResponseAdapter } from "../src/server/mira/llmAdapter.js";
import { handleMiraChatRequest } from "../src/server/mira/chatCore.js";
import { runTheoResponseAdapter, handleTheoChatRequest } from "../src/server/theo/theoResponseAdapter.js";
import { buildTheoPromptPayload } from "../src/server/theo/theoPromptContract.js";
import { runElenaResponseAdapter, handleElenaChatRequest } from "../src/server/elena/elenaResponseAdapter.js";
import { buildElenaPromptPayload } from "../src/server/elena/elenaPromptContract.js";

assert.equal(AGENT_MAX_ENERGY, 100);
assert.equal(AGENT_MIN_USEFUL_ENERGY, 40);
assert.equal(AGENT_CONCISE_BAND_MAX, 69);
assert.equal(AGENT_PASSIVE_RECOVERY_UNITS_PER_HOUR, 2);
assert.equal(AGENT_CAFE_RESTORATION_UNITS, 20);
assert.deepEqual(AGENT_WORK_COSTS, {
  "mira-vale": 5,
  "theo-mercer": 8,
  "elena-cross": 6,
  "ravi-sen": 6,
});
assert.equal(getAgentVerbosityBand(100), AGENT_VERBOSITY_BANDS.NORMAL);
assert.equal(getAgentVerbosityBand(70), AGENT_VERBOSITY_BANDS.NORMAL);
assert.equal(getAgentVerbosityBand(69), AGENT_VERBOSITY_BANDS.CONCISE);
assert.equal(getAgentVerbosityBand(40), AGENT_VERBOSITY_BANDS.CONCISE);
assert.match(getConciseResponseGuidance("concise"), /Preserve every fact.*safety/is);

const policyMemory = createAgentStateMemoryStore({ initialEnergyUnits: 100, ttlSeconds: 86_400 });
assert.equal((await policyMemory.readAgentState("mira-vale", 0)).energyUnits, 100);
for (let index = 0; index < 20; index += 1) {
  await chargeSuccessfulAgentWork({
    agentId: "mira-vale",
    stateStore: policyMemory,
    nowMs: index + 1,
  });
}
assert.equal((await policyMemory.readAgentState("mira-vale", 30)).energyUnits, 40);

const recoveryMemory = createAgentStateMemoryStore({ initialEnergyUnits: 60, ttlSeconds: 86_400 });
await recoveryMemory.readAgentState("elena-cross", 0);
const recoveredWork = await recoveryMemory.applyWork(
  "elena-cross",
  { ...getAgentWorkOperation("elena-cross"), costUnits: 0 },
  5 * 3_600_000,
);
assert.equal(recoveredWork.state.energyUnits, 70);
assert.equal(getRecoveredEnergyUnits(recoveredWork.state, 30 * 3_600_000), 100);
assert.equal((await readAgentDepletionContext({
  agentId: "elena-cross",
  stateStore: recoveryMemory,
  nowMs: 10 * 3_600_000,
})).verbosityBand, "normal");

const cafeMemory = createAgentStateMemoryStore({ initialEnergyUnits: 60 });
const firstCafeRestore = await restoreAgentForCafeEvent({
  agentId: "elena-cross",
  restorationId: "cafe:2026-09-07:approved-conversation",
  stateStore: cafeMemory,
  nowMs: 1_000,
});
const duplicateCafeRestore = await restoreAgentForCafeEvent({
  agentId: "elena-cross",
  restorationId: "cafe:2026-09-07:approved-conversation",
  stateStore: cafeMemory,
  nowMs: 2_000,
});
assert.equal(firstCafeRestore.applied, true);
assert.equal(firstCafeRestore.state.energyUnits, 80);
assert.equal(duplicateCafeRestore.applied, false);
assert.equal(duplicateCafeRestore.state.energyUnits, 80);

const failedShared = {
  async readAgentState() { throw new Error("down"); },
  async applyWork() { throw new Error("down"); },
  async applyRestoration() { throw new Error("down"); },
};
const fallbackStore = createAgentStateStore({
  config: {
    backend: "shared_rest",
    sharedStoreConfigured: true,
    sharedStoreConfigComplete: true,
    ttlSeconds: 60,
    schemaVersion: 1,
  },
  sharedStore: failedShared,
  initialEnergyUnits: 100,
});
assert.equal((await readAgentDepletionContext({
  agentId: "theo-mercer",
  stateStore: fallbackStore,
  nowMs: 1,
})).verbosityBand, "normal");
assert.equal(fallbackStore.getDiagnostics().degradedFallbackUsed, true);

const normalMira = await runMiraResponseAdapter({
  message: "What is OneSmarter?",
  config: { mode: "mock" },
  verbosityBand: "normal",
});
const conciseMira = await runMiraResponseAdapter({
  message: "What is OneSmarter?",
  config: { mode: "mock" },
  verbosityBand: "concise",
});
assert.equal(conciseMira.answerSeed, normalMira.answerSeed);
assert.match(conciseMira.answerSeed, /OneSmarter/i);

const theoInput = {
  message: "Review this page for clarity.",
  websiteContent: "OneSmarter provides secure technology and business workflow services for organizations.",
  config: { mode: "mock" },
};
const normalTheo = await runTheoResponseAdapter({ ...theoInput, verbosityBand: "normal" });
const conciseTheo = await runTheoResponseAdapter({ ...theoInput, verbosityBand: "concise" });
assert.deepEqual(conciseTheo.analysis.findings, normalTheo.analysis.findings);
assert.deepEqual(conciseTheo.analysis.recommendations, normalTheo.analysis.recommendations);
assert.ok(conciseTheo.analysis.findings.length > 0);
assert.match(buildTheoPromptPayload({
  ...theoInput,
  verbosityBand: "concise",
}).system, /Keep every required finding, evidence item, recommendation/i);

const elenaInput = { message: "Are you HIPAA certified?", config: { mode: "mock" } };
const normalElena = await runElenaResponseAdapter({ ...elenaInput, verbosityBand: "normal" });
const conciseElena = await runElenaResponseAdapter({ ...elenaInput, verbosityBand: "concise" });
assert.equal(conciseElena.answer, normalElena.answer);
assert.match(conciseElena.answer, /does not present itself as HIPAA certified/i);
assert.match(buildElenaPromptPayload({
  message: elenaInput.message,
  matchedEntries: conciseElena.matchedEntries,
  verbosityBand: "concise",
}).system, /Preserve every required compliance qualification, refusal, claim boundary/i);

const createTrackingStore = (energyUnits = 100) => {
  const calls = { reads: 0, work: [] };
  return {
    calls,
    async readAgentState(_agentId, nowMs) {
      calls.reads += 1;
      return { schemaVersion: 1, energyUnits, updatedAtMs: nowMs };
    },
    async applyWork(agentId, operation) {
      calls.work.push({ agentId, operation });
      return { applied: true, state: { schemaVersion: 1, energyUnits, updatedAtMs: 1 } };
    },
  };
};
const allowRateLimit = { async consume() { return { allowed: true }; } };

const miraStore = createTrackingStore();
const miraSuccess = await handleMiraChatRequest({
  method: "POST",
  body: { message: "What is OneSmarter?" },
  headers: { "x-real-ip": "203.0.113.1" },
  rateLimitStore: allowRateLimit,
  agentStateStore: miraStore,
  logger: { log() {} },
});
assert.equal(miraSuccess.status, 200);
assert.equal(miraStore.calls.work.length, 1);
assert.equal(miraStore.calls.work[0].operation.costUnits, 5);
await handleMiraChatRequest({
  method: "POST",
  body: { message: "x".repeat(1_001) },
  rateLimitStore: allowRateLimit,
  agentStateStore: miraStore,
  logger: { log() {} },
});
assert.equal(miraStore.calls.work.length, 1);
await handleMiraChatRequest({
  method: "POST",
  body: { message: "What is OneSmarter?" },
  rateLimitStore: { async consume() { return { allowed: false, retryAfterSeconds: 10 }; } },
  agentStateStore: miraStore,
  logger: { log() {} },
});
assert.equal(miraStore.calls.work.length, 1);

const theoStore = createTrackingStore(60);
const theoSuccess = await handleTheoChatRequest({
  method: "POST",
  body: { message: theoInput.message, websiteContent: theoInput.websiteContent },
  rateLimitStore: allowRateLimit,
  agentStateStore: theoStore,
});
assert.equal(theoSuccess.status, 200);
assert.equal(theoStore.calls.work.length, 1);
await handleTheoChatRequest({
  method: "POST",
  body: {
    message: theoInput.message,
    websiteContent: "Patient Name: Jane Doe\nMRN: MRN-123456",
  },
  rateLimitStore: allowRateLimit,
  agentStateStore: theoStore,
});
assert.equal(theoStore.calls.work.length, 1);
assert.equal(theoStore.calls.work[0].operation.costUnits, 8);
await handleTheoChatRequest({
  method: "POST",
  body: { message: theoInput.message, websiteContent: theoInput.websiteContent },
  rateLimitStore: allowRateLimit,
  agentStateStore: theoStore,
  responseAdapter: async () => ({
    analysis: normalTheo.analysis,
    mode: "local_analysis",
    fallbackUsed: true,
    fallbackReason: "provider_error",
  }),
});
assert.equal(theoStore.calls.work.length, 1);

const elenaStore = createTrackingStore(60);
const elenaSuccess = await handleElenaChatRequest({
  method: "POST",
  body: { message: "Are you HIPAA certified?" },
  rateLimitStore: allowRateLimit,
  agentStateStore: elenaStore,
});
assert.equal(elenaSuccess.status, 200);
assert.equal(elenaStore.calls.work.length, 1);
await handleElenaChatRequest({
  method: "POST",
  body: { message: "Are you HIPAA certified?" },
  rateLimitStore: allowRateLimit,
  agentStateStore: elenaStore,
  isRequestAborted: () => true,
});
assert.equal(elenaStore.calls.work.length, 1);
await handleElenaChatRequest({
  method: "POST",
  body: { message: "x".repeat(1_001) },
  rateLimitStore: allowRateLimit,
  agentStateStore: elenaStore,
});
assert.equal(elenaStore.calls.work.length, 1);
assert.equal(elenaStore.calls.work[0].operation.costUnits, 6);
await handleElenaChatRequest({
  method: "POST",
  body: { message: "asdf random text hello banana test" },
  rateLimitStore: allowRateLimit,
  agentStateStore: elenaStore,
});
assert.equal(elenaStore.calls.work.length, 1);

for (const store of [miraStore, theoStore, elenaStore]) {
  assert.doesNotMatch(JSON.stringify(store.calls.work), /message|conversation|website|patient|answer/i);
}

console.log("Agent depletion policy tests passed.");
console.log("Validated centralized values, bands, passive recovery, floor, safe fallback, unchanged facts/safety, successful-only charging, and no double charge.");
