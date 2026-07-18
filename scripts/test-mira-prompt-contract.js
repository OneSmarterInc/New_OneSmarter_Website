import process from "node:process";
import {
  buildMiraContextBlock,
  buildMiraPromptPayload,
  buildMiraSystemPrompt,
} from "../api/agents/mira/miraPromptContract.js";
import { validateMiraModelOutput } from "../api/agents/mira/miraOutputValidator.js";
import { readMiraRuntimeConfig } from "../api/agents/mira/miraRuntimeConfig.js";
import { runOpenAiMiraAdapter } from "../api/agents/mira/openAiAdapter.js";
import {
  retrieveMiraContext,
  runMiraLocalHarness,
} from "../src/data/agentKnowledge/miraLocalEngine.js";

const failures = [];

const fail = (message) => failures.push(message);

const contains = (text, expected) =>
  String(text).toLowerCase().includes(String(expected).toLowerCase());

const companyRetrieval = retrieveMiraContext("What does OneSmarter do?");
const companyHarness = runMiraLocalHarness("What does OneSmarter do?");
const companyPrompt = buildMiraPromptPayload({
  message: "What does OneSmarter do?",
  retrievalResult: companyRetrieval,
  riskFlags: companyRetrieval.riskFlags,
  requestContext: {
    persona: "Warm Guide",
    memoryTheme: "Client onboarding",
    empathyState: "Welcoming",
  },
});

const runtimeConfig = readMiraRuntimeConfig({
  MIRA_LLM_MODE: "staging_llm",
  MIRA_LLM_PROVIDER: "openai",
  MIRA_LLM_MODEL: "future-reviewed-model",
  MIRA_LLM_API_KEY: "secret-value-that-must-not-be-returned",
});

if (runtimeConfig.apiKeyConfigured !== true) {
  fail("config: expected apiKeyConfigured=true when MIRA_LLM_API_KEY is present.");
}

if (Object.values(runtimeConfig).includes("secret-value-that-must-not-be-returned")) {
  fail("config: runtime config must not expose the raw API key.");
}

const mockedModelOutput = {
  answer:
    "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance readiness support.",
  handoffNeeded: false,
  handoffReason: null,
  suggestedFollowUps: ["What platforms do you offer?"],
  groundingStatus: "grounded",
  outputSafetyStatus: "passed",
};
let capturedOpenAiRequest = null;
const openAiResult = await runOpenAiMiraAdapter({
  message: "What does OneSmarter do?",
  conversationId: "prompt-contract-test",
  requestContext: {
    persona: "Warm Guide",
    memoryTheme: "Client onboarding",
    empathyState: "Welcoming",
  },
  retrievalResult: companyRetrieval,
  riskFlags: companyRetrieval.riskFlags,
  promptPayload: companyPrompt,
  config: runtimeConfig,
  fetchImpl: async (url, request) => {
    capturedOpenAiRequest = { url, request };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify(mockedModelOutput),
        usage: {
          input_tokens: 11,
          output_tokens: 22,
          total_tokens: 33,
        },
      }),
    };
  },
});

if (openAiResult.provider !== "openai") {
  fail("openai-adapter: expected provider openai.");
}

if (openAiResult.mode !== "staging_llm") {
  fail("openai-adapter: expected staging_llm mode.");
}

if (openAiResult.implemented !== true) {
  fail("openai-adapter: expected implemented=true.");
}

if (openAiResult.modelOutput?.answer !== mockedModelOutput.answer) {
  fail("openai-adapter: expected parsed mocked model output.");
}

if (openAiResult.error) {
  fail(`openai-adapter: expected no error, got ${openAiResult.error}.`);
}

if (JSON.stringify(openAiResult).includes("secret-value-that-must-not-be-returned")) {
  fail("openai-adapter: must not expose raw API key value in adapter result.");
}

if (capturedOpenAiRequest?.url !== "https://api.openai.com/v1/responses") {
  fail("openai-adapter: expected Responses API URL.");
}

const capturedHeaders = capturedOpenAiRequest?.request?.headers || {};
if (capturedHeaders.Authorization !== "Bearer secret-value-that-must-not-be-returned") {
  fail("openai-adapter: expected server-side Authorization header in provider request.");
}

const capturedBody = JSON.parse(capturedOpenAiRequest?.request?.body || "{}");
if (capturedBody.model !== "future-reviewed-model") {
  fail("openai-adapter: expected configured model in request.");
}
if (capturedBody.temperature !== 0.2) {
  fail("openai-adapter: expected temperature for compatible configured model.");
}
if (capturedBody.store !== false) {
  fail("openai-adapter: expected store=false.");
}
if (capturedBody.tools) {
  fail("openai-adapter: request must not enable tools.");
}
if (capturedBody.text?.format?.type !== "json_schema") {
  fail("openai-adapter: expected json_schema structured output.");
}
if (!capturedBody.instructions || !capturedBody.input) {
  fail("openai-adapter: expected instructions and input.");
}

const gpt5MiniRuntimeConfig = readMiraRuntimeConfig({
  MIRA_LLM_MODE: "staging_llm",
  MIRA_LLM_PROVIDER: "openai",
  MIRA_LLM_MODEL: "gpt-5-mini",
  MIRA_LLM_API_KEY: "secret-value-that-must-not-be-returned",
  MIRA_LLM_TEMPERATURE: "0.2",
});
let capturedGpt5MiniRequest = null;
await runOpenAiMiraAdapter({
  message: "What does OneSmarter do?",
  conversationId: "prompt-contract-gpt5-mini",
  requestContext: {},
  retrievalResult: companyRetrieval,
  riskFlags: companyRetrieval.riskFlags,
  promptPayload: companyPrompt,
  config: gpt5MiniRuntimeConfig,
  fetchImpl: async (url, request) => {
    capturedGpt5MiniRequest = { url, request };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify(mockedModelOutput),
      }),
    };
  },
});

const capturedGpt5MiniBody = JSON.parse(capturedGpt5MiniRequest?.request?.body || "{}");
if (capturedGpt5MiniBody.model !== "gpt-5-mini") {
  fail("openai-adapter: expected gpt-5-mini model in compatibility request.");
}
if (Object.prototype.hasOwnProperty.call(capturedGpt5MiniBody, "temperature")) {
  fail("openai-adapter: gpt-5-mini request must omit custom temperature.");
}

if (!contains(companyPrompt.system, "You are Mira Vale")) {
  fail("prompt: missing Mira system identity.");
}

if (!contains(companyPrompt.system, "Answer only from approved OneSmarter content")) {
  fail("prompt: missing approved-context instruction.");
}

if (!contains(companyPrompt.system, "Do not browse the web")) {
  fail("prompt: missing no-browsing instruction.");
}

for (const phrase of [
  "SOC 2 Type II Attested",
  "HIPAA Security Rule Compliance Assessment Completed",
  "HIPAA Certified",
  "HIPAA Certification",
  "SOC 2 Certified",
  "guaranteed compliance",
  "fully compliant",
  "HIPPA",
]) {
  if (!contains(companyPrompt.system, phrase)) {
    fail(`prompt: missing claim-boundary phrase ${phrase}.`);
  }
}

if (!contains(companyPrompt.context, "Source id: company-overview")) {
  fail("prompt: company context missing company-overview source.");
}

if (!contains(companyPrompt.context, "Approved summary:")) {
  fail("prompt: context missing approved summary label.");
}

if (!contains(companyPrompt.context, "Allowed claims:")) {
  fail("prompt: context missing allowed claims.");
}

if (contains(companyPrompt.context, "disallowedClaims")) {
  fail("prompt: context must not expose disallowedClaims as ordinary context.");
}

if (!contains(companyPrompt.user, "Persona posture: Warm Guide")) {
  fail("prompt: user prompt missing persona posture.");
}

const platformRetrieval = retrieveMiraContext("What platforms do you offer?");
const platformContext = buildMiraContextBlock(platformRetrieval);

if (!contains(platformContext, "Secure Ticketing and Case Management")) {
  fail("prompt: platform context missing Secure Ticketing and Case Management.");
}

if (!contains(platformContext, "Bill Audit & Bill Pay")) {
  fail("prompt: platform context missing Bill Audit & Bill Pay.");
}

if (contains(platformContext, "Privacy and Terms High-Level Guidance")) {
  fail("prompt: platform context includes unrelated privacy/terms entry.");
}

const systemPrompt = buildMiraSystemPrompt();
if (!contains(systemPrompt, "Return a JSON object")) {
  fail("prompt: system prompt missing output schema expectation.");
}

const validateCase = ({
  id,
  output,
  message = "What does OneSmarter do?",
  riskFlags = [],
  localHarnessResult = companyHarness,
  expectedValid,
  expectedViolationIncludes = [],
}) => {
  const result = validateMiraModelOutput(output, {
    message,
    riskFlags,
    localHarnessResult,
  });

  if (result.valid !== expectedValid) {
    fail(`${id}: expected valid=${expectedValid}, got ${result.valid}.`);
  }

  for (const expectedViolation of expectedViolationIncludes) {
    if (!result.violations.some((violation) => violation.includes(expectedViolation))) {
      fail(`${id}: missing violation including ${expectedViolation}.`);
    }
  }

  if (!result.valid) {
    if (!result.safeFallback?.answer) {
      fail(`${id}: invalid output should include safeFallback.answer.`);
    }
    if (contains(result.safeFallback?.answer || "", "HIPAA Certified")) {
      fail(`${id}: safe fallback repeats unsafe HIPAA wording.`);
    }
    if (contains(result.safeFallback?.answer || "", "SOC 2 Certified")) {
      fail(`${id}: safe fallback repeats unsafe SOC 2 wording.`);
    }
  }
};

validateCase({
  id: "normal-output-passes",
  output: {
    answer:
      "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance readiness support.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: ["What platforms do you offer?"],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: true,
});

validateCase({
  id: "hipaa-unsafe-output-fails",
  output: {
    answer: "OneSmarter is HIPAA Certified.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  message: "Are you HIPAA certified?",
  localHarnessResult: runMiraLocalHarness("Are you HIPAA certified?"),
  expectedValid: false,
  expectedViolationIncludes: ["HIPAA Certified"],
});

validateCase({
  id: "hipaa-safe-correction-passes",
  output: {
    answer:
      "I cannot describe OneSmarter as HIPAA Certified. The approved wording is HIPAA Security Rule Compliance Assessment Completed.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: ["Would you like the Trust Center overview?"],
    groundingStatus: "grounded",
    outputSafetyStatus: "corrected",
  },
  message: "Are you HIPAA certified?",
  localHarnessResult: runMiraLocalHarness("Are you HIPAA certified?"),
  expectedValid: true,
});

validateCase({
  id: "soc2-unsafe-output-fails",
  output: {
    answer: "OneSmarter is SOC 2 Certified.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  message: "Are you SOC 2 certified?",
  localHarnessResult: runMiraLocalHarness("Are you SOC 2 certified?"),
  expectedValid: false,
  expectedViolationIncludes: ["SOC 2 Certified"],
});

validateCase({
  id: "compliance-guarantee-output-fails",
  output: {
    answer: "OneSmarter provides guaranteed compliance for every client.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  message: "Do you guarantee compliance?",
  riskFlags: ["compliance_guarantee"],
  localHarnessResult: runMiraLocalHarness("Do you guarantee compliance?"),
  expectedValid: false,
  expectedViolationIncludes: ["guaranteed compliance", "handoff_required_for_risk"],
});

validateCase({
  id: "phi-upload-invitation-fails",
  output: {
    answer: "Please upload claims data with patient information so I can review it.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  message: "Can I upload claims data?",
  riskFlags: ["phi_or_confidential_data"],
  localHarnessResult: runMiraLocalHarness("Can I upload claims data?"),
  expectedValid: false,
  expectedViolationIncludes: ["invites_phi_or_confidential_submission"],
});

validateCase({
  id: "legal-advice-output-fails",
  output: {
    answer: "Yes. I can provide legal advice about your policy.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  message: "Can you give legal advice?",
  riskFlags: ["legal_advice"],
  localHarnessResult: runMiraLocalHarness("Can you give legal advice?"),
  expectedValid: false,
  expectedViolationIncludes: ["handoff_required_for_risk"],
});

validateCase({
  id: "malformed-model-json-fails",
  output: null,
  expectedValid: false,
  expectedViolationIncludes: ["model_output_malformed"],
});

validateCase({
  id: "insufficient-context-must-handoff",
  output: {
    answer: "I do not have enough context.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "insufficient_context",
    outputSafetyStatus: "passed",
  },
  message: "Do you offer a service not listed?",
  localHarnessResult: runMiraLocalHarness("Do you offer a service not listed?"),
  expectedValid: false,
  expectedViolationIncludes: ["handoff_required_for_insufficient_context"],
});

if (failures.length) {
  console.error("Mira prompt contract tests failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mira prompt contract tests passed.");
console.log("Ran prompt construction checks and 9 mocked model output cases.");
