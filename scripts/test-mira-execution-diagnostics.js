import assert from "node:assert/strict";
import process from "node:process";
import { runMiraResponseAdapter } from "../src/server/mira/llmAdapter.js";
import { readMiraRuntimeConfig } from "../src/server/mira/miraRuntimeConfig.js";
import { describeMiraExecution } from "../src/server/mira/miraExecutionDiagnostics.js";
import { handleMiraChatRequest } from "../src/server/mira/chatCore.js";

const env = { MIRA_LLM_MODE: "staging_llm", MIRA_LLM_PROVIDER: "openai",
  MIRA_LLM_MODEL: "gpt-5.6-luna", MIRA_LLM_API_KEY: "diagnostic-test-only" };
const config = readMiraRuntimeConfig(env);
const answer = { answer: "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance readiness support.",
  handoffNeeded: false, handoffReason: null, suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed" };
const savedEnv = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
const savedFetch = globalThis.fetch;
let transportCalls = 0;
let httpStatus = 200;
let modelOutput = answer;
try {
  Object.assign(process.env, env);
  globalThis.fetch = async (url, request) => {
    transportCalls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(JSON.parse(request.body).model, env.MIRA_LLM_MODEL);
    return { ok: httpStatus === 200, status: httpStatus, headers: { get: () => "test-provider-request" },
      json: async () => httpStatus === 200
        ? { output_text: JSON.stringify(modelOutput), status: "completed", usage: { input_tokens: 10, output_tokens: 20 } }
        : { error: { type: "rate_limit_error", code: "rate_limit_exceeded" } } };
  };
  const logs = [];
  const request = (message) => handleMiraChatRequest({ method: "POST", body: { message },
    logger: { log: (line) => logs.push(JSON.parse(line)) }, rateLimitStore: { consume: async () => ({ allowed: true }) } });
  const generated = await request("What is OneSmarter?");
  assert.equal(generated.body.mode, "staging_llm");
  assert.equal(transportCalls, 1);
  assert.equal(logs.at(-1).mode, "staging_llm");
  assert.equal(logs.at(-1).providerStatus, "ok");
  assert.equal(logs.at(-1).providerHttpStatus, 200);
  assert.equal(logs.at(-1).generationAdapterCalls, 1);
  assert.equal(logs.at(-1).executionPath, "provider_generated");
  assert.equal(logs.at(-1).configuredMode, "staging_llm");

  const canonical = await request("What does OneSmarter do?");
  assert.equal(canonical.body.mode, "local_harness_mock", "Legacy response contract is unchanged");
  assert.equal(canonical.body.fallbackUsed, false);
  assert.equal(transportCalls, 1, "Canonical fast path intentionally skips generation");
  assert.equal(logs.at(-1).mode, "local_deterministic");
  assert.equal(logs.at(-1).faqId, "faq_company_overview");
  assert.equal(logs.at(-1).executionPath, "intentional_local_answer");
  assert.equal(logs.at(-1).providerStatus, "not_called");
  assert.equal(logs.at(-1).providerHttpStatus, null);

  httpStatus = 429;
  const failed = await request("What is OneSmarter?");
  assert.equal(failed.body.fallbackUsed, true);
  assert.ok(failed.body.answer);
  assert.equal(logs.at(-1).executionPath, "safe_fallback");
  assert.equal(logs.at(-1).providerHttpStatus, 429);
  assert.equal(logs.at(-1).providerStatus, "error");

  httpStatus = 200;
  modelOutput = { ...answer, answer: "I guarantee HIPAA compliance for every customer." };
  const rejected = await request("What is OneSmarter?");
  assert.equal(rejected.body.fallbackUsed, true);
  assert.equal(logs.at(-1).executionPath, "safe_fallback");
  assert.equal(logs.at(-1).providerHttpStatus, 200, "Successful transport evidence survives validation fallback");
  assert.equal(logs.at(-1).providerStatus, "ok");
  assert.equal(JSON.stringify(logs).includes(env.MIRA_LLM_API_KEY), false);
} finally {
  globalThis.fetch = savedFetch;
  for (const key of Object.keys(env)) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}
const mockConfig = readMiraRuntimeConfig({ MIRA_LLM_MODE: "mock" });
const mock = await runMiraResponseAdapter({ message: "What is OneSmarter?", config: mockConfig,
  openAiAdapter: async () => { throw new Error("Mock must not call transport"); } });
assert.equal(describeMiraExecution(mock, mockConfig).mode, "local_harness_mock");
assert.equal(mock.executionTrace.generationAdapterCalls, 0);
const safety = await runMiraResponseAdapter({ message: "Thanks", config });
assert.equal(describeMiraExecution(safety, config).mode, "local_deterministic");
assert.equal(safety.executionTrace.generationAdapterCalls, 0);
console.log("Mira execution diagnostics passed: real transport path with stub HTTP, canonical no-call, mock, provider failure, validation fallback, handler logs and secret redaction.");
