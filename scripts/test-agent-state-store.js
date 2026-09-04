import assert from "node:assert/strict";
import { readAgentStateConfig } from "../src/server/agentState/agentStateConfig.js";
import { createAgentStateMemoryStore } from "../src/server/agentState/agentStateMemoryStore.js";
import { createAgentStateSharedRestStore } from "../src/server/agentState/agentStateSharedRestStore.js";
import { createAgentStateStore } from "../src/server/agentState/agentStateStore.js";

const expectedStateKeys = [
  "energyUnits",
  "schemaVersion",
  "updatedAtMs",
];

const memoryRecords = new Map();
const memory = createAgentStateMemoryStore({
  records: memoryRecords,
  initialEnergyUnits: 100,
  ttlSeconds: 10,
});
assert.deepEqual(await memory.readAgentState("elena-cross", 1_000), {
  schemaVersion: 1,
  energyUnits: 100,
  updatedAtMs: 1_000,
});
assert.deepEqual(Object.keys(await memory.readAgentState("elena-cross", 1_001)).sort(), expectedStateKeys);

const firstWork = await memory.applyWork(
  "elena-cross",
  { costUnits: 25, minEnergyUnits: 20, maxEnergyUnits: 100 },
  2_000,
);
assert.equal(firstWork.state.energyUnits, 75);
assert.equal(firstWork.state.lastWorkAtMs, 2_000);
const clampedWork = await memory.applyWork(
  "elena-cross",
  { costUnits: 90, minEnergyUnits: 20, maxEnergyUnits: 100 },
  3_000,
);
assert.equal(clampedWork.state.energyUnits, 20);

const restored = await memory.applyRestoration(
  "elena-cross",
  "cafe-week-1",
  { restoreToEnergyUnits: 80, minEnergyUnits: 20, maxEnergyUnits: 100 },
  4_000,
);
assert.equal(restored.applied, true);
assert.equal(restored.state.energyUnits, 80);
const duplicateRestoration = await memory.applyRestoration(
  "elena-cross",
  "cafe-week-1",
  { restoreToEnergyUnits: 100, minEnergyUnits: 20, maxEnergyUnits: 100 },
  5_000,
);
assert.equal(duplicateRestoration.applied, false);
assert.equal(duplicateRestoration.state.energyUnits, 80);
assert.equal(duplicateRestoration.state.updatedAtMs, 4_000);

await memory.applyWork(
  "theo-mercer",
  { costUnits: 10, minEnergyUnits: 10, maxEnergyUnits: 100 },
  9_000,
);
assert.equal((await memory.readAgentState("theo-mercer", 15_000)).energyUnits, 90);
assert.equal((await memory.readAgentState("theo-mercer", 20_000)).energyUnits, 100);
assert.equal((await memory.readAgentState("elena-cross", 20_000)).energyUnits, 100);
assert.equal(memory.getDiagnostics().durable, false);

const oldSchemaRecords = new Map([
  ["mira-vale", { schemaVersion: 0, energyUnits: 1, updatedAtMs: 1, expiresAtMs: 99_999 }],
]);
const versionAwareMemory = createAgentStateMemoryStore({
  records: oldSchemaRecords,
  initialEnergyUnits: 100,
});
assert.equal((await versionAwareMemory.readAgentState("mira-vale", 2_000)).energyUnits, 100);
assert.equal((await versionAwareMemory.readAgentState("mira-vale", 2_000)).schemaVersion, 1);

const createRedisRestMock = () => {
  const records = new Map();
  const calls = [];
  const response = (result) => ({ ok: true, async json() { return { result }; } });
  const initialize = (key, schemaVersion, initialEnergy, nowMs, ttlMs) => {
    const existing = records.get(key);
    if (!existing || existing.schemaVersion !== schemaVersion || nowMs >= existing.expiresAtMs) {
      const state = {
        schemaVersion,
        energyUnits: initialEnergy,
        updatedAtMs: nowMs,
        lastWorkAtMs: "",
        lastCafeRestorationId: "",
        expiresAtMs: nowMs + ttlMs,
      };
      records.set(key, state);
      return state;
    }
    return existing;
  };
  const resultFor = (state, applied) => [
    state.schemaVersion,
    state.energyUnits,
    state.updatedAtMs,
    state.lastWorkAtMs,
    state.lastCafeRestorationId,
    applied,
  ];

  const fetchImpl = async (url, options) => {
    const command = JSON.parse(options.body);
    calls.push({ url, options, command });
    const script = command[1];
    const key = command[3];
    const args = command.slice(4);
    const schemaVersion = Number(args[0]);
    const initialEnergy = Number(args[1]);
    const nowMs = Number(args[2]);
    if (script.includes("agent-state:read")) {
      const ttlMs = Number(args[3]);
      return response(resultFor(initialize(key, schemaVersion, initialEnergy, nowMs, ttlMs), 1));
    }
    if (script.includes("agent-state:work")) {
      const [cost, min, max, ttlMs] = args.slice(3).map(Number);
      const state = initialize(key, schemaVersion, initialEnergy, nowMs, ttlMs);
      state.energyUnits = Math.max(min, Math.min(max, state.energyUnits - cost));
      state.updatedAtMs = nowMs;
      state.lastWorkAtMs = nowMs;
      state.expiresAtMs = nowMs + ttlMs;
      return response(resultFor(state, 1));
    }
    if (script.includes("agent-state:restore")) {
      const restorationId = args[3];
      const restoreTo = Number(args[4]);
      const min = Number(args[5]);
      const max = Number(args[6]);
      const ttlMs = Number(args[7]);
      const state = initialize(key, schemaVersion, initialEnergy, nowMs, ttlMs);
      if (state.lastCafeRestorationId === restorationId) {
        return response(resultFor(state, 0));
      }
      state.energyUnits = Math.max(min, Math.min(max, restoreTo));
      state.updatedAtMs = nowMs;
      state.lastCafeRestorationId = restorationId;
      state.expiresAtMs = nowMs + ttlMs;
      return response(resultFor(state, 1));
    }
    throw new Error("unexpected_script");
  };
  return { records, calls, fetchImpl };
};

const redisMock = createRedisRestMock();
const shared = createAgentStateSharedRestStore({
  url: "https://state.example.test",
  token: "secret-token",
  fetchImpl: redisMock.fetchImpl,
  initialEnergyUnits: 100,
  ttlSeconds: 10,
});
assert.equal((await shared.readAgentState("elena-cross", 1_000)).energyUnits, 100);
assert.equal(redisMock.calls[0].command[0], "EVAL");
assert.equal(redisMock.calls[0].command[3], "onesmarter:agent-state:v1:elena-cross");
assert.match(redisMock.calls[0].options.headers.Authorization, /secret-token/);

const concurrentUpdates = await Promise.all([
  shared.applyWork("elena-cross", { costUnits: 10, minEnergyUnits: 20, maxEnergyUnits: 100 }, 2_000),
  shared.applyWork("elena-cross", { costUnits: 15, minEnergyUnits: 20, maxEnergyUnits: 100 }, 2_001),
  shared.applyWork("elena-cross", { costUnits: 20, minEnergyUnits: 20, maxEnergyUnits: 100 }, 2_002),
]);
assert.equal(concurrentUpdates.at(-1).state.energyUnits, 55);
assert.equal((await shared.readAgentState("elena-cross", 2_003)).energyUnits, 55);
assert.equal((await shared.applyWork(
  "elena-cross",
  { costUnits: 100, minEnergyUnits: 20, maxEnergyUnits: 100 },
  3_000,
)).state.energyUnits, 20);

const sharedRestoration = await shared.applyRestoration(
  "elena-cross",
  "cafe-week-2",
  { restoreToEnergyUnits: 90, minEnergyUnits: 20, maxEnergyUnits: 100 },
  4_000,
);
assert.equal(sharedRestoration.applied, true);
assert.equal(sharedRestoration.state.energyUnits, 90);
const sharedDuplicate = await shared.applyRestoration(
  "elena-cross",
  "cafe-week-2",
  { restoreToEnergyUnits: 100, minEnergyUnits: 20, maxEnergyUnits: 100 },
  5_000,
);
assert.equal(sharedDuplicate.applied, false);
assert.equal(sharedDuplicate.state.energyUnits, 90);
assert.equal((await shared.readAgentState("elena-cross", 14_001)).energyUnits, 100);
assert.equal((await shared.readAgentState("theo-mercer", 6_000)).energyUnits, 100);
assert.equal(shared.getDiagnostics().schemaVersion, 1);

const partialConfig = readAgentStateConfig({
  AGENT_STATE_BACKEND: "shared_rest",
  AGENT_STATE_REST_URL: "https://state.example.test",
});
assert.equal(partialConfig.backend, "memory");
assert.equal(partialConfig.sharedStoreConfigured, true);
assert.equal(partialConfig.sharedStoreConfigComplete, false);
assert.equal("token" in JSON.parse(JSON.stringify(partialConfig)), false);
assert.equal("url" in JSON.parse(JSON.stringify(partialConfig)), false);

const mismatchedCredentialPair = readAgentStateConfig({
  AGENT_STATE_REST_URL: "https://agent-state.example.test",
  MIRA_RATE_LIMIT_REST_TOKEN: "rate-limit-secret",
});
assert.equal(mismatchedCredentialPair.sharedStoreConfigComplete, false);
assert.equal(mismatchedCredentialPair.backend, "memory");

const fallbackConfig = readAgentStateConfig({
  AGENT_STATE_BACKEND: "shared_rest",
  MIRA_RATE_LIMIT_REST_URL: "https://existing.example.test",
  MIRA_RATE_LIMIT_REST_TOKEN: "existing-secret",
  AGENT_STATE_TTL_SECONDS: "60",
});
assert.equal(fallbackConfig.backend, "shared_rest");
assert.equal(fallbackConfig.sharedStoreConfigComplete, true);
assert.equal(fallbackConfig.ttlSeconds, 60);

const failedSharedStore = {
  async readAgentState() { throw new Error("shared_down"); },
  async applyWork() { throw new Error("shared_down"); },
  async applyRestoration() { throw new Error("shared_down"); },
};
const resilientStore = createAgentStateStore({
  config: fallbackConfig,
  sharedStore: failedSharedStore,
  initialEnergyUnits: 100,
});
assert.equal((await resilientStore.readAgentState("elena-cross", 1_000)).energyUnits, 100);
assert.deepEqual(resilientStore.getDiagnostics(), {
  backend: "shared_rest",
  activeBackend: "memory",
  sharedStoreConfigured: true,
  sharedStoreConfigComplete: true,
  degradedFallbackUsed: true,
  schemaVersion: 1,
  operationCode: "shared_failed_memory_used",
});
assert.doesNotMatch(
  JSON.stringify(resilientStore.getDiagnostics()),
  /secret|https:|token|visitor|message|conversation|phi|ip address/i,
);

const storedState = redisMock.records.get("onesmarter:agent-state:v1:elena-cross");
assert.deepEqual(
  Object.keys(storedState).sort(),
  [
    "energyUnits",
    "expiresAtMs",
    "lastCafeRestorationId",
    "lastWorkAtMs",
    "schemaVersion",
    "updatedAtMs",
  ],
);
assert.doesNotMatch(JSON.stringify(storedState), /message|conversation|website|patient|customer|answer|biography/i);

console.log("Agent-state persistence foundation tests passed.");
console.log("Validated memory/shared initialization, atomic updates, clamping, restoration idempotency, TTL, isolation, safe configuration, diagnostics, privacy, concurrency, and degraded fallback.");
