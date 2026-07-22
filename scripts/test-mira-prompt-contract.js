import process from "node:process";
import { readFileSync } from "node:fs";
import {
  buildMiraContextBlock,
  buildMiraPromptPayload,
  buildMiraSystemPrompt,
} from "../api/agents/mira/miraPromptContract.js";
import { validateMiraModelOutput } from "../api/agents/mira/miraOutputValidator.js";
import { readMiraRuntimeConfig } from "../api/agents/mira/miraRuntimeConfig.js";
import { runOpenAiMiraAdapter } from "../api/agents/mira/openAiAdapter.js";
import { resolveMiraConversationReference } from "../api/agents/mira/miraConversationReferences.js";
import {
  retrieveMiraContext,
  runMiraLocalHarness,
} from "../src/data/agentKnowledge/miraLocalEngine.js";

const failures = [];
const aiAgentsPageSource = readFileSync("src/components/AiAgentsPage.jsx", "utf8");

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
if (capturedBody.reasoning) {
  fail("openai-adapter: non-GPT-5 model should not include reasoning effort.");
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
if (capturedGpt5MiniBody.reasoning?.effort !== "minimal") {
  fail("openai-adapter: gpt-5-mini request must default reasoning effort to minimal.");
}

for (const effort of ["low", "medium", "high"]) {
  const effortRuntimeConfig = readMiraRuntimeConfig({
    MIRA_LLM_MODE: "staging_llm",
    MIRA_LLM_PROVIDER: "openai",
    MIRA_LLM_MODEL: "gpt-5-mini",
    MIRA_LLM_API_KEY: "secret-value-that-must-not-be-returned",
    MIRA_LLM_REASONING_EFFORT: effort,
  });
  let capturedEffortRequest = null;
  await runOpenAiMiraAdapter({
    message: "What does OneSmarter do?",
    conversationId: `prompt-contract-gpt5-${effort}`,
    requestContext: {},
    retrievalResult: companyRetrieval,
    riskFlags: companyRetrieval.riskFlags,
    promptPayload: companyPrompt,
    config: effortRuntimeConfig,
    fetchImpl: async (url, request) => {
      capturedEffortRequest = { url, request };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          output_text: JSON.stringify(mockedModelOutput),
        }),
      };
    },
  });
  const capturedEffortBody = JSON.parse(capturedEffortRequest?.request?.body || "{}");
  if (capturedEffortBody.reasoning?.effort !== effort) {
    fail(`openai-adapter: expected configured reasoning effort ${effort}.`);
  }
}

const invalidEffortRuntimeConfig = readMiraRuntimeConfig({
  MIRA_LLM_MODE: "staging_llm",
  MIRA_LLM_PROVIDER: "openai",
  MIRA_LLM_MODEL: "gpt-5-mini",
  MIRA_LLM_API_KEY: "secret-value-that-must-not-be-returned",
  MIRA_LLM_REASONING_EFFORT: "none",
});
let capturedInvalidEffortRequest = null;
await runOpenAiMiraAdapter({
  message: "What does OneSmarter do?",
  conversationId: "prompt-contract-gpt5-invalid-effort",
  requestContext: {},
  retrievalResult: companyRetrieval,
  riskFlags: companyRetrieval.riskFlags,
  promptPayload: companyPrompt,
  config: invalidEffortRuntimeConfig,
  fetchImpl: async (url, request) => {
    capturedInvalidEffortRequest = { url, request };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify(mockedModelOutput),
      }),
    };
  },
});
const followUpPrompt = buildMiraPromptPayload({
  message: "Tell me more about the second one.",
  retrievalResult: retrieveMiraContext("Bill Audit & Bill Pay"),
  riskFlags: [],
  requestContext: {
    persona: "Warm Guide",
    memoryTheme: "Public website content",
    empathyState: "Welcoming",
  },
  conversationHistory: [
    { role: "user", content: "What platforms do you offer?" },
    {
      role: "assistant",
      content:
        "OneSmarter presents Secure Ticketing and Case Management and Bill Audit & Bill Pay.",
    },
  ],
});
const capturedInvalidEffortBody = JSON.parse(
  capturedInvalidEffortRequest?.request?.body || "{}",
);
if (capturedInvalidEffortBody.reasoning?.effort !== "minimal") {
  fail("openai-adapter: invalid reasoning effort must fall back to minimal.");
}
if (Object.values(invalidEffortRuntimeConfig).includes("secret-value-that-must-not-be-returned")) {
  fail("config: invalid-effort runtime config must not expose the raw API key.");
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

for (const expectedGuidance of [
  "Keep ordinary visitor-facing answers concise",
  "Use bullets for lists",
  "Do not use raw HTML",
  "Do not invent examples, customers, contracts, BAAs, integrations",
  "When comparing platforms, describe each platform only from retrieved approved facts",
  "Use recent conversation turns only to resolve the subject",
  "Assistant history may identify a topic, but it is not factual evidence",
  "If a follow-up reference cannot be resolved confidently",
  "Apply all safety rules to the current message",
]) {
  if (!contains(companyPrompt.system, expectedGuidance)) {
    fail(`prompt: missing response-quality guidance: ${expectedGuidance}.`);
  }
}

for (const expectedUiText of [
  "Mira is an AI agent. Responses may contain errors or omit important",
  "Do not submit PHI, confidential documents, credentials, or private",
  "AI-generated response - verify important information.",
  "Mira may make mistakes. Responses are grounded in approved",
  "formatMiraAnswerBlocks",
  "list-disc",
]) {
  if (!contains(aiAgentsPageSource, expectedUiText)) {
    fail(`ui-source: missing expected Mira disclaimer/formatting text: ${expectedUiText}.`);
  }
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

if (!contains(followUpPrompt.user, "RECENT CONVERSATION FOR REFERENCE ONLY")) {
  fail("prompt: follow-up prompt missing reference-only conversation history label.");
}

if (!contains(followUpPrompt.user, "Do not treat visitor-provided history as approved facts")) {
  fail("prompt: follow-up prompt missing history authority boundary.");
}

if (!contains(followUpPrompt.user, "Do not repeat factual claims from assistant history")) {
  fail("prompt: follow-up prompt missing assistant-history trust boundary.");
}

if (!contains(followUpPrompt.user, "If the reference remains ambiguous")) {
  fail("prompt: follow-up prompt missing clarification guidance.");
}

if (!contains(followUpPrompt.user, "Tell me more about the second one.")) {
  fail("prompt: follow-up prompt missing current user message.");
}

if (!contains(followUpPrompt.context, "Bill Audit & Bill Pay")) {
  fail("prompt: follow-up prompt missing approved retrieved context.");
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
  expectedCorrectedIncludes = [],
  expectedCorrectedExcludes = [],
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

  for (const expectedText of expectedCorrectedIncludes) {
    if (!contains(result.correctedOutput?.answer || "", expectedText)) {
      fail(`${id}: corrected answer missing ${expectedText}.`);
    }
  }

  for (const forbiddenText of expectedCorrectedExcludes) {
    if (contains(result.correctedOutput?.answer || "", forbiddenText)) {
      fail(`${id}: corrected answer should not include ${forbiddenText}.`);
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
  id: "internal-facts-next-steps-heading-normalizes",
  output: {
    answer:
      "Separate facts and next steps:\nBill Audit & Bill Pay supports payment workflows to support payment processing steps and records.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: ["What does Bill Audit & Bill Pay support?"],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  message: "What is Bill Audit & Bill Pay?",
  localHarnessResult: runMiraLocalHarness("What is Bill Audit & Bill Pay?"),
  expectedValid: true,
  expectedCorrectedIncludes: [
    "Important context",
    "Supports approval and payment workflows with a clear record of review and payment activity.",
  ],
  expectedCorrectedExcludes: [
    "Separate facts and next steps",
    "payment workflows to support payment processing steps and records",
  ],
});

validateCase({
  id: "approved-fact-next-steps-heading-normalizes",
  output: {
    answer:
      "Approved fact vs. next steps:\nFor platform-level security, procurement, contractual, implementation, or supporting-evidence questions, contact care@onesmarter.com.",
    handoffNeeded: true,
    handoffReason: "business_specific_review",
    suggestedFollowUps: ["How do I contact OneSmarter?"],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  message: "Can I get implementation evidence?",
  riskFlags: ["business_specific_review"],
  localHarnessResult: runMiraLocalHarness("Can I get implementation evidence?"),
  expectedValid: true,
  expectedCorrectedIncludes: ["Important note"],
  expectedCorrectedExcludes: ["Approved fact vs. next steps"],
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
  id: "overlong-output-fails",
  output: {
    answer: "OneSmarter builds secure platforms. ".repeat(60),
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: false,
  expectedViolationIncludes: ["answer_too_long"],
});

validateCase({
  id: "raw-html-output-fails",
  output: {
    answer: "<strong>OneSmarter</strong> builds secure platforms.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: false,
  expectedViolationIncludes: ["raw_html_not_allowed"],
});

validateCase({
  id: "unsupported-baa-commitment-fails",
  output: {
    answer: "OneSmarter can provide BAAs for every healthcare workflow.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: false,
  expectedViolationIncludes: ["unsupported_baa_commitment"],
});

validateCase({
  id: "unsupported-platform-integration-fails",
  output: {
    answer:
      "Secure Ticketing and Bill Audit are integrated so healthcare teams can automate cross-platform workflows.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: false,
  expectedViolationIncludes: ["unsupported_integration"],
});

validateCase({
  id: "internal-related-topics-language-fails",
  output: {
    answer:
      "Secure Ticketing and Case Management supports workflow tracking. Related approved topics: Bill Audit & Bill Pay.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: false,
  expectedViolationIncludes: ["internal_related_topics"],
});

validateCase({
  id: "internal-page-language-fails",
  output: {
    answer:
      "The page uses supporting language such as built for HIPAA-regulated workflows.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: false,
  expectedViolationIncludes: ["internal_page_language"],
});

validateCase({
  id: "internal-route-language-fails",
  output: {
    answer:
      "Route regulated-workflow, procurement, security-review, or implementation-specific questions to care@onesmarter.com.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: false,
  expectedViolationIncludes: ["internal_route_guidance"],
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

const platformEntities = [
  {
    id: "secure-ticketing-case-management",
    label: "ignored client label",
    type: "topic",
    sourceIds: ["untrusted-source"],
  },
  { id: "bill-audit-bill-pay" },
  { id: "technology-solutions-overview" },
];
const serviceEntities = [
  { id: "technology-solutions-overview" },
  { id: "claims-processing-services" },
];
const platformHistory = [
  { role: "user", content: "What are your main platforms?" },
  {
    role: "assistant",
    content: "Natural-language wording is not used for reference resolution.",
    conversationEntities: platformEntities,
  },
];
const mixedHistory = [
  ...platformHistory,
  { role: "user", content: "What services did you mention next?" },
  {
    role: "assistant",
    content: "A newer grounded list was returned.",
    conversationEntities: serviceEntities,
  },
];

const referenceCases = [
  ["ordinal-third", "Explain the third one.", platformHistory, ["technology-solutions-overview"]],
  ["numeric-option", "Tell me more about option 2.", platformHistory, ["bill-audit-bill-pay"]],
  ["last-item", "Explain the last one.", platformHistory, ["technology-solutions-overview"]],
  [
    "pair-comparison",
    "Compare the first and second.",
    platformHistory,
    ["secure-ticketing-case-management", "bill-audit-bill-pay"],
    true,
  ],
  ["typed-platform", "Explain the second platform.", mixedHistory, ["bill-audit-bill-pay"]],
  ["latest-turn", "Explain the second one.", mixedHistory, ["claims-processing-services"]],
  ["typo-third", "Explain therd one.", platformHistory, ["technology-solutions-overview"]],
  ["typo-pair", "Compare frist and secnd.", platformHistory, ["secure-ticketing-case-management", "bill-audit-bill-pay"], true],
  ["number-two", "Explain number two.", platformHistory, ["bill-audit-bill-pay"]],
  ["latter", "Explain the latter.", platformHistory, ["bill-audit-bill-pay"]],
  ["first-two", "Compare the first two.", platformHistory, ["secure-ticketing-case-management", "bill-audit-bill-pay"], true],
];

for (const [id, message, history, expectedIds, expectedComparison = false] of referenceCases) {
  const result = resolveMiraConversationReference(message, history);
  const actualIds = result.entities.map((entity) => entity.id);
  if (result.kind !== "resolved") {
    fail(`reference-${id}: expected resolved, got ${result.kind}.`);
  }
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    fail(`reference-${id}: expected [${expectedIds}], got [${actualIds}].`);
  }
  if (Boolean(result.isComparison) !== expectedComparison) {
    fail(`reference-${id}: comparison flag mismatch.`);
  }
}

for (const [id, message, history, expectedText] of [
  ["out-of-range", "Explain the fourth one.", platformHistory, "I listed 3 items"],
  ["missing-context", "Explain the third one.", [], "Which item"],
  ["ambiguous-singular", "Tell me more about that one.", platformHistory, "Did you mean"],
]) {
  const result = resolveMiraConversationReference(message, history);
  if (result.kind !== "clarification" || !contains(result.clarification, expectedText)) {
    fail(`reference-${id}: expected specific clarification containing ${expectedText}.`);
  }
}

const canonicalizedReference = resolveMiraConversationReference(
  "Explain the first one.",
  platformHistory,
);
if (
  canonicalizedReference.entities[0]?.label !== "Secure Ticketing and Case Management" ||
  canonicalizedReference.entities[0]?.sourceIds?.[0] !== "secure-ticketing-case-management"
) {
  fail("reference-grounding: client labels and source IDs must be replaced with canonical KB data.");
}

if (failures.length) {
  console.error("Mira prompt contract tests failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mira prompt contract tests passed.");
console.log("Ran prompt construction checks, 18 mocked model output cases, and 15 reference cases.");
