import process from "node:process";
import { handleMiraChatRequest, resetMiraRateLimitForTests } from "../src/server/mira/chatCore.js";
import { readMiraRuntimeConfig } from "../src/server/mira/miraRuntimeConfig.js";
import {
  MIRA_RATE_LIMIT_MAX_REQUESTS,
  MIRA_RATE_LIMIT_WINDOW_MS,
  createMiraMemoryRateLimitStore,
  createMiraSharedRestRateLimitStore,
  readMiraRateLimitConfig,
} from "../src/server/mira/miraRateLimitStore.js";

const failures = [];
const fail = (message) => failures.push(message);

const liveEnv = {
  MIRA_LLM_MODE: "staging_llm",
  MIRA_LLM_PROVIDER: "openai",
  MIRA_LLM_MODEL: "runtime-test-model",
  MIRA_LLM_API_KEY: "runtime-test-secret",
};

const live = readMiraRuntimeConfig(liveEnv);
if (!live.modeWasValid || !live.providerConfigComplete || !live.liveConfigurationValid) {
  fail("runtime-config: valid staging OpenAI configuration must be live-ready.");
}

for (const provider of ["openai", "OpenAI", "OPENAI", " openai "]) {
  const config = readMiraRuntimeConfig({ ...liveEnv, MIRA_LLM_PROVIDER: provider });
  if (config.provider !== "openai" || !config.providerWasValid) {
    fail(`runtime-config: provider ${JSON.stringify(provider)} must normalize to openai.`);
  }
}

for (const mode of ["production_llm", "banana"]) {
  const config = readMiraRuntimeConfig({ ...liveEnv, MIRA_LLM_MODE: mode });
  if (config.modeWasValid || config.mode !== "mock" || config.liveConfigurationValid) {
    fail(`runtime-config: ${mode} must be detectable and safely resolve to mock.`);
  }
}

const unsupported = readMiraRuntimeConfig({ ...liveEnv, MIRA_LLM_PROVIDER: "anthropic" });
if (unsupported.providerWasValid || unsupported.providerConfigComplete) {
  fail("runtime-config: unsupported provider must not appear live-ready.");
}

for (const missing of ["MIRA_LLM_API_KEY", "MIRA_LLM_MODEL"]) {
  const env = { ...liveEnv, [missing]: "" };
  if (readMiraRuntimeConfig(env).providerConfigComplete) {
    fail(`runtime-config: ${missing} is required for live provider readiness.`);
  }
}

if (live.maxTokens !== 600 || live.postValidationEnabled !== true) {
  fail("runtime-config: token and post-validation defaults changed unexpectedly.");
}

const partialShared = readMiraRateLimitConfig({ MIRA_RATE_LIMIT_REST_URL: "https://kv.example" });
if (!partialShared.sharedStoreConfigured || partialShared.sharedStoreConfigComplete) {
  fail("rate-limit-config: partial shared configuration must be detectable as incomplete.");
}

const memory = createMiraMemoryRateLimitStore({ buckets: new Map() });
let result;
for (let index = 0; index <= MIRA_RATE_LIMIT_MAX_REQUESTS; index += 1) {
  result = await memory.consume("same-client", 1000);
}
if (result.allowed || result.retryAfterSeconds !== 60) {
  fail("rate-limit-memory: same key must be limited after 20 requests.");
}
if (!(await memory.consume("different-client", 1000)).allowed) {
  fail("rate-limit-memory: different keys must have independent budgets.");
}
if (!(await memory.consume("same-client", 1000 + MIRA_RATE_LIMIT_WINDOW_MS)).allowed) {
  fail("rate-limit-memory: window must reset after 60 seconds.");
}
memory.reset();
if (!(await memory.consume("same-client", 1000)).allowed) {
  fail("rate-limit-memory: reset must clear deterministic test state.");
}

const sharedCounts = new Map();
const sharedStore = createMiraSharedRestRateLimitStore({
  url: "https://kv.example",
  token: "shared-secret",
  fetchImpl: async (_url, options) => {
    const command = JSON.parse(options.body);
    const key = command[4];
    const count = (sharedCounts.get(key) || 0) + 1;
    sharedCounts.set(key, count);
    return { ok: true, json: async () => ({ result: [count, 60000] }) };
  },
});
for (let index = 0; index <= MIRA_RATE_LIMIT_MAX_REQUESTS; index += 1) {
  result = await sharedStore.consume("shared-client");
}
if (result.allowed || result.retryAfterSeconds !== 60) {
  fail("rate-limit-shared: shared adapter must preserve 20/min observable semantics.");
}

resetMiraRateLimitForTests();
let capturedKey = "";
await handleMiraChatRequest({
  method: "POST",
  headers: {
    "x-forwarded-for": "203.0.113.10, 198.51.100.20",
    "x-real-ip": "192.0.2.10",
  },
  body: { message: "What does OneSmarter do?" },
  logger: null,
  rateLimitStore: {
    kind: "test",
    consume: async (key) => {
      capturedKey = key;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  },
});
if (capturedKey !== "203.0.113.10") {
  fail("rate-limit-key: first x-forwarded-for entry must be used.");
}

await handleMiraChatRequest({
  method: "POST",
  headers: { "x-real-ip": "192.0.2.11" },
  body: { message: "What does OneSmarter do?" },
  logger: null,
  rateLimitStore: {
    kind: "test",
    consume: async (key) => {
      capturedKey = key;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  },
});
if (capturedKey !== "192.0.2.11") {
  fail("rate-limit-key: x-real-ip must be the fallback key.");
}

const failureLogs = [];
const failureFallbackResponse = await handleMiraChatRequest({
  method: "POST",
  headers: { "x-real-ip": "192.0.2.13" },
  body: { message: "What does OneSmarter do?" },
  logger: { log: (line) => failureLogs.push(line) },
  rateLimitStore: {
    kind: "shared_rest",
    sharedStoreConfigured: true,
    sharedStoreConfigComplete: true,
    consume: async () => {
      throw new Error("secret infrastructure detail");
    },
  },
});
if (failureFallbackResponse.status !== 200) {
  fail("rate-limit-failure: shared-store failure must preserve the stable chat response.");
}
const failureDiagnostic =
  failureLogs.find((line) => line.includes("mira_rate_limit_store_failure")) || "";
if (!failureDiagnostic || failureDiagnostic.includes("secret infrastructure detail")) {
  fail("rate-limit-failure: failure must be logged without leaking infrastructure details.");
}

const originalEnv = { ...process.env };
const logs = [];
try {
  Object.assign(process.env, liveEnv);
  await handleMiraChatRequest({
    method: "POST",
    headers: { "x-real-ip": "192.0.2.12" },
    body: { message: "What does OneSmarter do?" },
    logger: { log: (line) => logs.push(line) },
    rateLimitStore: createMiraMemoryRateLimitStore({ buckets: new Map() }),
  });
} finally {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}
const diagnostic = logs.find((line) => line.includes("mira_runtime_configuration")) || "";
if (!diagnostic.includes('"mode":"staging_llm"') || !diagnostic.includes('"provider":"openai"')) {
  fail("runtime-diagnostics: safe resolved mode/provider diagnostic was not logged.");
}
if (diagnostic.includes("runtime-test-secret") || diagnostic.includes("apiKey")) {
  fail("runtime-diagnostics: secret material must never be logged.");
}

if (failures.length) {
  console.error("Mira runtime hardening tests failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Mira runtime hardening tests passed.");
console.log("Validated runtime modes, provider normalization, safe diagnostics, and memory/shared rate-limit semantics.");
