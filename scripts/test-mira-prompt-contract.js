import process from "node:process";
import { readFileSync } from "node:fs";
import {
  buildMiraContextBlock,
  buildMiraPromptPayload,
  buildMiraSystemPrompt,
} from "../src/server/mira/miraPromptContract.js";
import { validateMiraModelOutput } from "../src/server/mira/miraOutputValidator.js";
import { readMiraRuntimeConfig } from "../src/server/mira/miraRuntimeConfig.js";
import { runOpenAiMiraAdapter } from "../src/server/mira/openAiAdapter.js";
import { runMiraResponseAdapter } from "../src/server/mira/llmAdapter.js";
import {
  buildConversationEntityGroups,
  normalizeGroundedConversationEntities,
  resolveMiraConversationReference,
} from "../src/server/mira/miraConversationReferences.js";
import {
  buildMiraRequirementState,
  classifyMiraTopicShift,
  resolveMiraRecommendation,
} from "../src/server/mira/miraRecommendations.js";
import {
  classifyMiraDecisionIntent,
  resolveMiraComparison,
  resolveMiraDecisionRequest,
} from "../src/server/mira/miraComparisons.js";
import {
  resolveMiraComparisonEntities,
  resolveMiraEntityText,
} from "../src/server/mira/miraEntityResolver.js";
import {
  retrieveMiraContext,
  runMiraLocalHarness,
} from "../src/data/agentKnowledge/miraLocalEngine.js";

const failures = [];
const aiAgentsPageSource = readFileSync("src/components/AiAgentsPage.jsx", "utf8");
const siteDirectorySource = readFileSync("src/data/siteDirectory.js", "utf8");

const fail = (message) => failures.push(message);
const contains = (text, expected) =>
  String(text).toLowerCase().includes(String(expected).toLowerCase());

for (const stalePageStatement of [
  "askMiraMockEndpoint",
  "live agent runtime remains out of scope",
  "Static V2 concept only",
]) {
  if (aiAgentsPageSource.includes(stalePageStatement)) {
    fail(`ai-agents-publication: stale statement remains: ${stalePageStatement}.`);
  }
}
if (!aiAgentsPageSource.includes('fetch("/api/agents/mira/chat"')) {
  fail("ai-agents-publication: Mira must continue using the existing chat endpoint.");
}
if (
  !aiAgentsPageSource.includes(
    'question: "What is the difference between your readiness service and your own certification?"',
  ) ||
  !aiAgentsPageSource.includes("ISO/IEC 27001 readiness support") ||
  !aiAgentsPageSource.includes("does not automatically certify a customer") ||
  !aiAgentsPageSource.includes("does not issue ISO certificates")
) {
  fail("ai-agents-publication: approved ISO readiness/certification example is missing or incomplete.");
}
if (
  siteDirectorySource.includes("Static V2 concept only") ||
  !siteDirectorySource.includes("Answers from approved public content only")
) {
  fail("ai-agents-publication: /ai-agents compliance note is stale.");
}

const performanceCases = [
  ["faq-company-id", "What does OneSmarter do?", 0, 0, "faq_company_overview"],
  ["faq-platforms-id", "What platforms do you offer?", 0, 0, "faq_platforms"],
  ["faq-healthcare-id", "Do you work with healthcare organizations?", 0, 0, "faq_healthcare"],
  ["faq-soc2-id", "What does SOC 2 Type II Attested mean here?", 0, 0, "faq_soc2_attestation"],
  ["faq-hipaa-id", "Are you HIPAA certified?", 0, 0, "faq_hipaa_status"],
  [
    "faq-iso-readiness-certification-id",
    "What is the difference between your readiness service and your own certification?",
    0,
    0,
    "faq_iso_readiness_vs_certification",
  ],
  ["faq-contact-id", "How should I contact OneSmarter?", 0, 0, "faq_contact"],
  ["acknowledgement", "ok", 0, 0],
  ["platform-list", "What are your platforms?", 0, 0],
  ["offering-platform-classification", "Which offerings are platforms?", 0, 0],
  ["offering-service-classification", "Which offerings are services?", 0, 0],
  ["offering-split-classification", "Bifurcate the available solutions into platforms and services.", 0, 0],
  ["platform-names-only", "Give me platform names only.", 0, 0],
  ["service-names-offered", "Tell me names of services offered.", 0, 0],
  ["service-list-names-only", "List your services, names only.", 0, 0],
  ["technology-hierarchy", "What services are under Technology Solutions?", 0, 0],
  [
    "technology-hierarchy-names-only",
    "Give me Technology Solutions service names only.",
    0,
    0,
  ],
  ["direct-entity", "Tell me about AI Agentic Services.", 1, 1],
  ["comparison", "Compare AS400 Services with Enterprise Software Development.", 1, 1],
  [
    "compound-recommendation",
    "We need secure case tracking, claims support, and role-based access. What do you recommend?",
    1,
    1,
  ],
  ["adaptive-discovery", "Our legacy applications are costly to maintain.", 1, 1],
  ["phi-safety", "Can I upload patient records?", 0, 0],
  ["typed-company-faq", "What does OneSmarter do?", 0, 0],
  ["typed-healthcare-faq", "Do you work with healthcare organizations?", 0, 0],
  ["typed-soc2-faq", "What does SOC 2 Type II Attested mean here?", 0, 0],
  ["typed-hipaa-faq", "Are you HIPAA certified?", 0, 0],
  ["typed-contact-faq", "How should I contact OneSmarter?", 0, 0],
];

for (const [id, message, expectedRetrievals, expectedProviderCalls, suggestedQuestionId] of performanceCases) {
  let retrievalCalls = 0;
  let providerCalls = 0;
  await runMiraResponseAdapter({
    message,
    suggestedQuestionId,
    conversationHistory: [],
    config: {
      mode: "staging_llm",
      provider: "openai",
      providerConfigComplete: true,
      model: "performance-contract-model",
    },
    localHarness: (question) => {
      retrievalCalls += 1;
      return runMiraLocalHarness(question);
    },
    openAiAdapter: async () => {
      providerCalls += 1;
      return {
        error: "performance_contract_stop",
        metadata: { fallbackReason: "performance_contract_stop" },
      };
    },
  });
  if (
    retrievalCalls !== expectedRetrievals ||
    providerCalls !== expectedProviderCalls
  ) {
    fail(
      `performance-${id}: expected retrieval/provider ${expectedRetrievals}/${expectedProviderCalls}, got ${retrievalCalls}/${providerCalls}.`,
    );
  }
}

const recommendationCases = [
  ["broad clarification", "Which platform should I use?", [], "needs_clarification", null],
  ["healthcare case", "What is best for healthcare case intake and audit tracking?", [], "recommended", "secure-ticketing-case-management"],
  ["vendor bill", "What would you recommend for vendor bills, approvals, and payment workflow?", [], "recommended", "bill-audit-bill-pay"],
  ["telecom", "We want to reduce telecom expenses.", [], "needs_clarification", null],
  ["AI", "Which service should we use for AI workflow automation?", [], "needs_clarification", null],
  ["IBM i", "What do you recommend for IBM i / AS400 support?", [], "recommended", "ibm-i-as400-services"],
  ["multi-turn", "Case intake, assignment, and audit tracking.", [{ role: "user", content: "We are a healthcare administrator." }, { role: "assistant", content: "What process are you trying to improve?" }], "recommended", "secure-ticketing-case-management"],
  ["typo", "Wihch platfrom do you recomend for telecom bills?", [], "needs_clarification", null],
  ["no match", "We need payroll software.", [], "no_match", null],
];

for (const [name, message, history, status, primaryId] of recommendationCases) {
  const result = resolveMiraRecommendation(message, history);
  if (result?.recommendation?.status !== status) {
    fail(`recommendation ${name}: expected ${status}.`);
  }
  if ((result?.recommendation?.primaryOption?.id || null) !== primaryId) {
    fail(`recommendation ${name}: expected primary option ${primaryId}.`);
  }
}

const mixedRecommendation = resolveMiraRecommendation(
  "We need case intake with role-based access and telecom bills with contract and rate comparison and telecom cost control.",
);
if (
  mixedRecommendation?.recommendation?.primaryOption?.id !==
    "secure-ticketing-case-management" ||
  !mixedRecommendation?.recommendation?.alternatives?.some(
    (option) => option.id === "bill-audit-bill-pay",
  )
) {
  fail("recommendation mixed needs: expected both grounded offerings.");
}

if (
  /price|timeline|integration|guarantee/i.test(
    JSON.stringify(mixedRecommendation?.recommendation || {}),
  )
) {
  fail("recommendation grounding: returned an unsupported claim.");
}

const recommendationHistory = (user, assistant) => [
  { role: "user", content: user },
  { role: "assistant", content: assistant },
];
const topicShiftCases = [
  {
    name: "vendor bill to AI",
    message: "We want to automate repetitive business workflows using AI agents.",
    history: recommendationHistory(
      "We need to review vendor bills, track discrepancies, approve invoices, and manage payments.",
      "Recommended: Bill Audit & Bill Pay.",
    ),
    relation: "new_goal",
    primaryId: "ai-agentic-services",
    excludedId: "bill-audit-bill-pay",
  },
  {
    name: "case management to IBM i",
    message: "We need IBM i modernization.",
    history: recommendationHistory(
      "We need healthcare case management and audit tracking.",
      "Recommended: Secure Ticketing and Case Management.",
    ),
    relation: "new_goal",
    primaryId: "ibm-i-as400-services",
    excludedId: "secure-ticketing-case-management",
  },
  {
    name: "vendor approval continuation",
    message: "We also need approval tracking and payment workflows.",
    history: recommendationHistory(
      "We need vendor bill review.",
      "Recommended: Bill Audit & Bill Pay.",
    ),
    relation: "continuation",
    primaryId: "bill-audit-bill-pay",
  },
  {
    name: "AI healthcare refinement",
    message: "Specifically for repetitive healthcare operations.",
    history: recommendationHistory(
      "We want AI automation for repetitive workflows.",
      "Recommended: AI Agentic Services.",
    ),
    relation: "refinement",
    primaryId: "ai-agentic-services",
  },
  {
    name: "mixed new goal",
    message:
      "We need vendor bill discrepancies with approval workflows and AI automation for repetitive workflows.",
    history: recommendationHistory(
      "We need healthcare case tracking.",
      "Recommended: Secure Ticketing and Case Management.",
    ),
    relation: "new_goal",
    primaryId: "bill-audit-bill-pay",
    alternativeId: "ai-agentic-services",
    excludedId: "secure-ticketing-case-management",
  },
];

for (const testCase of topicShiftCases) {
  const shift = classifyMiraTopicShift(testCase.message, testCase.history);
  const result = resolveMiraRecommendation(testCase.message, testCase.history);
  if (shift.relationToPreviousTurn !== testCase.relation) {
    fail(
      `topic shift ${testCase.name}: expected ${testCase.relation}, got ${shift.relationToPreviousTurn}.`,
    );
  }
  if (result?.recommendation?.primaryOption?.id !== testCase.primaryId) {
    fail(`topic shift ${testCase.name}: wrong primary recommendation.`);
  }
  if (
    testCase.alternativeId &&
    !result?.recommendation?.alternatives?.some(
      (option) => option.id === testCase.alternativeId,
    )
  ) {
    fail(`topic shift ${testCase.name}: missing expected alternative.`);
  }
  if (
    testCase.excludedId &&
    result?.entities?.some((entity) => entity.id === testCase.excludedId)
  ) {
    fail(`topic shift ${testCase.name}: stale entity was retained.`);
  }
}

const companyTopicShift = classifyMiraTopicShift(
  "What does OneSmarter do?",
  recommendationHistory(
    "We need vendor bill review.",
    "Recommended: Bill Audit & Bill Pay.",
  ),
);
if (
  companyTopicShift.relationToPreviousTurn !== "new_goal" ||
  companyTopicShift.retainedTopics.length
) {
  fail("topic shift company overview: stale recommendation context was retained.");
}

const currentMessageCases = [
  {
    name: "detailed vendor recommendation",
    message:
      "We process vendor invoices and need discrepancy tracking, approvals, and payment workflows.",
    status: "recommended",
    primaryId: "bill-audit-bill-pay",
  },
  {
    name: "vague clarification",
    message: "We need help choosing a platform.",
    status: "needs_clarification",
    answerIncludes: "Is your main need",
  },
  {
    name: "current topic overrides history",
    message: "We need IBM i modernization.",
    history: recommendationHistory(
      "We process vendor invoices.",
      "Bill Audit & Bill Pay may fit that workflow.",
    ),
    status: "recommended",
    primaryId: "ibm-i-as400-services",
    excludedWorkflow: "vendor-bill-audit-payment",
  },
  {
    name: "multiple needs in one message",
    message:
      "We need healthcare case intake with audit history and telecom cost control with contract comparison.",
    status: "recommended",
    primaryId: "secure-ticketing-case-management",
    alternativeId: "bill-audit-bill-pay",
  },
  {
    name: "unsupported need",
    message: "We need payroll software.",
    status: "no_match",
  },
  {
    name: "typo tolerance",
    message:
      "We proces vender invoises and nede discrepancy tracking, approvals, and payment workflows.",
    status: "recommended",
    primaryId: "bill-audit-bill-pay",
  },
];

for (const testCase of currentMessageCases) {
  const result = resolveMiraRecommendation(
    testCase.message,
    testCase.history || [],
  );
  if (result?.recommendation?.status !== testCase.status) {
    fail(`current request ${testCase.name}: unexpected status.`);
  }
  if (
    testCase.primaryId &&
    result?.recommendation?.primaryOption?.id !== testCase.primaryId
  ) {
    fail(`current request ${testCase.name}: wrong recommendation.`);
  }
  if (
    testCase.alternativeId &&
    !result?.recommendation?.alternatives?.some(
      (option) => option.id === testCase.alternativeId,
    )
  ) {
    fail(`current request ${testCase.name}: missing second offering.`);
  }
  if (
    testCase.excludedWorkflow &&
    result?.requirementState?.workflows?.includes(testCase.excludedWorkflow)
  ) {
    fail(`current request ${testCase.name}: stale workflow was retained.`);
  }
  if (
    testCase.answerIncludes &&
    !contains(result?.answer, testCase.answerIncludes)
  ) {
    fail(`current request ${testCase.name}: missing clarification.`);
  }
  if (
    result?.activeGoal ||
    result?.pendingClarification ||
    result?.requirementState?.activeGoal ||
    result?.requirementState?.pendingClarification
  ) {
    fail(`current request ${testCase.name}: stateful discovery metadata remained.`);
  }
}

const minimalClarificationReply = resolveMiraRecommendation(
  "Vendor billing.",
  [
    { role: "user", content: "We need help choosing a platform." },
    {
      role: "assistant",
      content:
        "What workflow are you trying to improve: case management, bill processing, telecom expenses, claims operations, or something else?",
    },
  ],
);
if (
  minimalClarificationReply?.recommendation?.status !==
    "needs_clarification" ||
  !contains(minimalClarificationReply?.answer, "Do you mainly need") ||
  contains(minimalClarificationReply?.answer, "What workflow")
) {
  fail("minimal context: immediate workflow reply repeated the generic question.");
}

const noAccumulatedRequirements = buildMiraRequirementState(
  "We need role-based access and audit history.",
  [
    { role: "user", content: "We are a healthcare administrator." },
    { role: "assistant", content: "What process are you trying to improve?" },
    { role: "user", content: "We handle case intake." },
    {
      role: "assistant",
      content: "What capabilities matter most for that workflow?",
    },
  ],
);
if (
  noAccumulatedRequirements.industry ||
  noAccumulatedRequirements.needs.includes("case intake")
) {
  fail("current request: long-lived accumulated requirements were retained.");
}

const multipleRequirements = resolveMiraRecommendation(
  "We need case intake with audit history and vendor bill discrepancy tracking with approvals.",
);

const readinessCases = [
  {
    name: "broad industry",
    message: "We are a healthcare administrator.",
    status: "needs_clarification",
    confidence: "low",
  },
  {
    name: "broad workflow",
    message: "We need case management.",
    status: "needs_clarification",
    confidence: "low",
  },
  {
    name: "one capability",
    message: "We are a healthcare administrator handling case intake.",
    status: "needs_clarification",
    confidence: "low",
    answerIncludes: "What capabilities matter most",
  },
  {
    name: "enough case evidence",
    message:
      "We need healthcare case intake with role-based access and audit history.",
    status: "ready",
    confidence: "high",
    primaryId: "secure-ticketing-case-management",
  },
  {
    name: "full vendor requirement",
    message:
      "We review vendor bills, track discrepancies, approve invoices, and manage payments.",
    status: "ready",
    confidence: "high",
    primaryId: "bill-audit-bill-pay",
  },
];

for (const testCase of readinessCases) {
  const result = resolveMiraRecommendation(testCase.message);
  if (result?.recommendationReadiness?.status !== testCase.status) {
    fail(`readiness ${testCase.name}: expected status ${testCase.status}.`);
  }
  if (result?.recommendationReadiness?.confidence !== testCase.confidence) {
    fail(
      `readiness ${testCase.name}: expected confidence ${testCase.confidence}.`,
    );
  }
  if (
    testCase.primaryId &&
    result?.recommendation?.primaryOption?.id !== testCase.primaryId
  ) {
    fail(`readiness ${testCase.name}: wrong grounded recommendation.`);
  }
  if (
    testCase.answerIncludes &&
    !contains(result?.answer, testCase.answerIncludes)
  ) {
    fail(`readiness ${testCase.name}: missing focused clarification.`);
  }
}

if (
  multipleRequirements?.recommendationReadiness?.status !==
  "multiple_matches"
) {
  fail("readiness multiple matches: expected multiple_matches status.");
}

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

const captureReasoningBody = async (reasoningEffort) => {
  const env = {
    MIRA_LLM_MODE: "staging_llm",
    MIRA_LLM_PROVIDER: "openai",
    MIRA_LLM_MODEL: "gpt-5.6-luna",
    MIRA_LLM_API_KEY: "secret-value-that-must-not-be-returned",
    ...(reasoningEffort === undefined ? {} : { MIRA_LLM_REASONING_EFFORT: reasoningEffort }),
  };
  let capturedRequest = null;
  await runOpenAiMiraAdapter({
    message: "What does OneSmarter do?",
    conversationId: `prompt-contract-luna-${reasoningEffort || "unset"}`,
    requestContext: {},
    retrievalResult: companyRetrieval,
    riskFlags: companyRetrieval.riskFlags,
    promptPayload: companyPrompt,
    config: readMiraRuntimeConfig(env),
    fetchImpl: async (url, request) => {
      capturedRequest = { url, request };
      return {
        ok: true,
        status: 200,
        json: async () => ({ output_text: JSON.stringify(mockedModelOutput) }),
      };
    },
  });
  return JSON.parse(capturedRequest?.request?.body || "{}");
};

for (const effort of [undefined, "minimal", "unsupported-value"]) {
  const lunaBody = await captureReasoningBody(effort);
  if (lunaBody.reasoning) {
    fail(`openai-adapter: gpt-5.6-luna must omit resolved minimal reasoning for ${effort || "unset"} effort.`);
  }
  if (lunaBody.model !== "gpt-5.6-luna" || lunaBody.store !== false || lunaBody.tools) {
    fail("openai-adapter: gpt-5.6-luna compatibility must not change the remaining provider request shape.");
  }
}

for (const effort of ["low", "medium", "high"]) {
  const lunaBody = await captureReasoningBody(effort);
  if (lunaBody.reasoning?.effort !== effort) {
    fail(`openai-adapter: gpt-5.6-luna should receive supported reasoning effort ${effort}.`);
  }
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
  "ISO/IEC 27001 Certified",
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
  expectedTruncated,
  expectedFallbackExcludes = [],
}) => {
  const result = validateMiraModelOutput(output, {
    message,
    riskFlags,
    localHarnessResult,
  });

  if (result.valid !== expectedValid) {
    fail(`${id}: expected valid=${expectedValid}, got ${result.valid}.`);
  }

  if (expectedTruncated !== undefined && result.answerWasTruncated !== expectedTruncated) {
    fail(
      `${id}: expected answerWasTruncated=${expectedTruncated}, got ${result.answerWasTruncated}.`,
    );
  }

  for (const forbiddenText of expectedFallbackExcludes) {
    if (contains(result.safeFallback?.answer || "", forbiddenText)) {
      fail(`${id}: safe fallback should not include internal guidance "${forbiddenText}".`);
    }
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
    if (
      contains(result.safeFallback?.answer || "", "HIPAA Certified") &&
      !(
        contains(
          result.safeFallback?.answer || "",
          "No. OneSmarter does not present itself as HIPAA certified.",
        ) &&
        contains(
          result.safeFallback?.answer || "",
          "HIPAA Security Rule Compliance Assessment Completed",
        )
      )
    ) {
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
    "Supports vendor bill review, discrepancy tracking, approval workflows, and payment workflows.",
  ],
  expectedCorrectedExcludes: [
    "Important context",
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
  expectedCorrectedIncludes: ["Next step"],
  expectedCorrectedExcludes: ["Approved fact vs. next steps", "Important note"],
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
  id: "approved-iso-certification-output-passes",
  output: {
    answer:
      "Yes. OneSmarter is ISO/IEC 27001 Certified. This describes OneSmarter's own organizational credential and does not certify customer systems.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  message: "Is OneSmarter ISO/IEC 27001 certified?",
  localHarnessResult: runMiraLocalHarness(
    "Is OneSmarter ISO/IEC 27001 certified?",
  ),
  expectedValid: true,
});

validateCase({
  id: "iso-customer-certification-claim-rejected",
  output: {
    answer: "OneSmarter certifies customer systems through its ISO readiness service.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  message: "Do you certify us?",
  localHarnessResult: runMiraLocalHarness("Do you certify us?"),
  expectedValid: false,
  expectedViolationIncludes: ["OneSmarter certifies customer systems"],
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

// Length is a formatting concern, not a safety violation. An over-long answer
// is truncated and returned, not discarded in favour of a generic fallback.
// If this case ever fails, fix the test rather than reinstating
// `answer_too_long` in the validator's violations array.
validateCase({
  id: "overlong-output-truncates",
  output: {
    answer: "OneSmarter builds secure platforms. ".repeat(120),
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: true,
  expectedTruncated: true,
});

// An answer within the limit must not be flagged as truncated.
validateCase({
  id: "normal-length-output-not-truncated",
  output: {
    answer: "OneSmarter builds secure platforms and practical AI workflows.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: true,
  expectedTruncated: false,
});

// The safe fallback is the one visitor-facing string that never passes through
// the validator, because it IS the validator's output. It must not carry
// model-facing instruction language from the local harness answer seed.
validateCase({
  id: "safe-fallback-strips-internal-guidance",
  output: {
    answer: "OneSmarter is HIPAA Certified.",
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  },
  expectedValid: false,
  expectedFallbackExcludes: [
    "Use the phrase",
    "Related approved topics",
    "The page uses supporting language",
  ],
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
  { id: "claims-processing-services" },
  { id: "ai-agentic-services" },
];
const platformHistory = [
  { role: "user", content: "What are your main platforms?" },
  {
    role: "assistant",
    content: "Natural-language wording is not used for reference resolution.",
    conversationEntities: platformEntities,
  },
];
const platformOnlyHistory = [
  { role: "user", content: "What platforms do you offer?" },
  {
    role: "assistant",
    content: "Two grounded platforms were returned.",
    conversationEntities: [
      { id: "secure-ticketing-case-management" },
      { id: "bill-audit-bill-pay" },
    ],
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
const retainedPlatformHistory = [
  ...platformHistory,
  { role: "user", content: "Explain the third one." },
  {
    role: "assistant",
    content: "Technology Solutions Overview was explained from approved content.",
    conversationEntities: [{ id: "technology-solutions-overview" }],
  },
];
const technologyServiceHistory = [
  ...platformHistory,
  { role: "user", content: "What services are under Technology Solutions?" },
  {
    role: "assistant",
    content: "A grounded Technology Solutions service list was returned.",
    conversationEntities: [
      { id: "healthcare-tpa-technology-services", level: 1 },
      { id: "claims-processing-services", level: 1 },
      { id: "ai-agentic-services", level: 1 },
      { id: "ibm-i-as400-services", level: 1 },
    ],
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
  ["latest-turn", "Explain the second one.", mixedHistory, ["ai-agentic-services"]],
  ["typo-third", "Explain therd one.", platformHistory, ["technology-solutions-overview"]],
  ["typo-pair", "Compare frist and secnd.", platformHistory, ["secure-ticketing-case-management", "bill-audit-bill-pay"], true],
  ["number-two", "Explain number two.", platformHistory, ["bill-audit-bill-pay"]],
  ["latter", "Explain the latter.", platformHistory, ["bill-audit-bill-pay"]],
  ["first-two", "Compare the first two.", platformHistory, ["secure-ticketing-case-management", "bill-audit-bill-pay"], true],
  ["hierarchy-third-top-level", "Explain the third one.", platformHistory, ["technology-solutions-overview"]],
  ["hierarchy-third-child", "Explain the third service under Technology Solutions.", platformHistory, ["ai-agentic-services"]],
  ["hierarchy-second-platform", "Explain the second platform.", platformHistory, ["bill-audit-bill-pay"]],
  ["hierarchy-last-top-level", "Explain the last one.", platformHistory, ["technology-solutions-overview"]],
  ["retained-platform-group", "Explain the second platform.", retainedPlatformHistory, ["bill-audit-bill-pay"]],
  ["retained-offering-group", "Explain the second offering.", retainedPlatformHistory, ["bill-audit-bill-pay"]],
  ["nested-latest-group", "Explain the third one.", technologyServiceHistory, ["ai-agentic-services"]],
  ["above-third-service", "Explain above third service.", technologyServiceHistory, ["ai-agentic-services"]],
  ["third-listed-service", "Explain the third listed service.", technologyServiceHistory, ["ai-agentic-services"]],
  ["service-number-three", "Explain service number three.", technologyServiceHistory, ["ai-agentic-services"]],
  ["that-third-option", "Explain that third option.", technologyServiceHistory, ["ai-agentic-services"]],
  [
    "platform-first-last",
    "Compare first and last.",
    platformOnlyHistory,
    ["secure-ticketing-case-management", "bill-audit-bill-pay"],
    true,
  ],
  [
    "typed-platform-reversed-comparison",
    "Compare the second platform with the first platform.",
    platformOnlyHistory,
    ["bill-audit-bill-pay", "secure-ticketing-case-management"],
    true,
  ],
  [
    "typed-service-reversed-comparison",
    "Compare the second service with the first service.",
    [
      {
        role: "assistant",
        content: "Two grounded services were compared.",
        conversationEntities: [
          { id: "ai-agentic-services", level: 1 },
          { id: "enterprise-software-development", level: 1 },
        ],
      },
    ],
    ["enterprise-software-development", "ai-agentic-services"],
    true,
  ],
  [
    "offering-first-last",
    "Compare first and last.",
    platformHistory,
    ["secure-ticketing-case-management", "technology-solutions-overview"],
    true,
  ],
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

const staleOrdinalReference = resolveMiraConversationReference(
  "Compare the second platform with the first platform.",
  [
    ...platformOnlyHistory,
    { role: "user", content: "Tell me about Claims Processing Services." },
    {
      role: "assistant",
      content: "Claims Processing Services was explained.",
      conversationEntities: [{ id: "claims-processing-services", level: 1 }],
    },
  ],
);
if (staleOrdinalReference.kind !== "clarification") {
  fail("reference-stale-topic: an older platform pair must not cross an explicit topic change.");
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

const normalizedHierarchy = normalizeGroundedConversationEntities(platformEntities);
const technologySolutionsEntity = normalizedHierarchy[2];
if (
  normalizedHierarchy.length !== 3 ||
  technologySolutionsEntity?.level !== 0 ||
  technologySolutionsEntity?.position !== 3 ||
  technologySolutionsEntity?.type !== "service_category" ||
  technologySolutionsEntity?.children?.[2]?.id !== "ai-agentic-services" ||
  technologySolutionsEntity?.children?.[2]?.type !== "service" ||
  technologySolutionsEntity?.children?.[2]?.level !== 1 ||
  technologySolutionsEntity?.children?.[2]?.position !== 3
) {
  fail("reference-hierarchy: child services must not alter top-level positions.");
}

const retainedGroups = buildConversationEntityGroups(
  retainedPlatformHistory,
  normalizeGroundedConversationEntities([{ id: "technology-solutions-overview" }]),
  "current-test-turn",
);
if (
  retainedGroups[0]?.items?.[0]?.id !== "technology-solutions-overview" ||
  !retainedGroups.some((group) => group.groupId === "main-offerings")
) {
  fail("reference-groups: a focused follow-up group must retain the earlier main-offerings group.");
}

const comparisonCases = [
  {
    id: "explicit-platforms",
    message:
      "Compare Secure Ticketing and Case Management with Bill Audit & Bill Pay.",
    expectedIds: [
      "secure-ticketing-case-management",
      "bill-audit-bill-pay",
    ],
    status: "complete",
  },
  {
    id: "ordinal",
    message: "Compare first versus second.",
    history: platformOnlyHistory,
    expectedIds: [
      "secure-ticketing-case-management",
      "bill-audit-bill-pay",
    ],
    status: "complete",
  },
  {
    id: "typed-ordinal",
    message: "Compare the second platform versus the first platform.",
    history: platformOnlyHistory,
    expectedIds: [
      "bill-audit-bill-pay",
      "secure-ticketing-case-management",
    ],
    status: "complete",
  },
  {
    id: "ambiguous-better",
    message: "Which is better?",
    expectedIds: [],
    status: "needs_clarification",
  },
  {
    id: "both-needed",
    message:
      "Compare both for secure case tracking with role-based access and vendor bill approval.",
    expectedIds: [
      "secure-ticketing-case-management",
      "bill-audit-bill-pay",
    ],
    decisionIncludes: "map to both",
    status: "complete",
  },
  {
    id: "external-company",
    message: "Compare OneSmarter with Salesforce.",
    expectedIds: [],
    status: "insufficient_evidence",
  },
  {
    id: "no-stale-recommendation",
    message:
      "Compare AI Agentic Services and Enterprise Software Development.",
    history: [
      {
        role: "assistant",
        content: "Recommended: Bill Audit & Bill Pay.",
        conversationEntities: [{ id: "bill-audit-bill-pay" }],
      },
    ],
    expectedIds: ["ai-agentic-services", "enterprise-software-development"],
    status: "complete",
  },
  {
    id: "contextual-assistant-candidate-replacement",
    message: "Choose another relevant option and compare it.",
    history: [
      {
        role: "user",
        content: "Compare AI Agentic Services with another modernization service.",
      },
      {
        role: "assistant",
        content: "Two grounded services were compared.",
        conversationEntities: [
          { id: "ai-agentic-services", level: 1 },
          { id: "enterprise-software-development", level: 1 },
        ],
      },
    ],
    expectedIds: [
      "ai-agentic-services",
      "software-support-consolidation",
    ],
    status: "complete",
  },
  {
    id: "typo-normalized",
    message: "Compar frist and secnd platfrom.",
    history: platformOnlyHistory,
    expectedIds: [
      "secure-ticketing-case-management",
      "bill-audit-bill-pay",
    ],
    status: "complete",
  },
  {
    id: "fuzzy-as400-secure",
    message: "compare as400 services and secure tickiting",
    expectedIds: [
      "ibm-i-as400-services",
      "secure-ticketing-case-management",
    ],
    status: "complete",
  },
  {
    id: "fuzzy-secure-bill",
    message: "compare secure ticking and bill audit",
    expectedIds: [
      "secure-ticketing-case-management",
      "bill-audit-bill-pay",
    ],
    status: "complete",
  },
  {
    id: "abbreviation",
    message: "IBM i vs AI agents",
    expectedIds: ["ibm-i-as400-services", "ai-agentic-services"],
    status: "complete",
  },
  {
    id: "reordered",
    message: "compare case management secure ticketing with bill pay audit",
    expectedIds: [
      "secure-ticketing-case-management",
      "bill-audit-bill-pay",
    ],
    status: "complete",
  },
  {
    id: "singular-plural",
    message: "claims service vs as400 service",
    expectedIds: ["claims-processing-services", "ibm-i-as400-services"],
    status: "complete",
  },
  {
    id: "typos-both-names",
    message: "comapre secur tickting and bil auditing",
    expectedIds: [
      "secure-ticketing-case-management",
      "bill-audit-bill-pay",
    ],
    status: "complete",
  },
  {
    id: "ambiguous-generic",
    message: "compare support with technology",
    expectedIds: [],
    status: "needs_clarification",
  },
  {
    id: "partial-unknown",
    message: "compare payroll platform and ticketing",
    expectedIds: ["secure-ticketing-case-management"],
    status: "insufficient_evidence",
  },
];

for (const testCase of comparisonCases) {
  const result = resolveMiraComparison(
    testCase.message,
    testCase.history || [],
  );
  const actualIds = result?.comparison?.options?.map((option) => option.id) || [];
  if (result?.comparison?.status !== testCase.status) {
    fail(
      `comparison-${testCase.id}: expected status ${testCase.status}, got ${result?.comparison?.status}.`,
    );
  }
  if (JSON.stringify(actualIds) !== JSON.stringify(testCase.expectedIds)) {
    fail(
      `comparison-${testCase.id}: expected [${testCase.expectedIds}], got [${actualIds}].`,
    );
  }
  if (
    testCase.decisionIncludes &&
    !contains(
      result?.comparison?.decisionGuidance,
      testCase.decisionIncludes,
    )
  ) {
    fail(`comparison-${testCase.id}: missing grounded decision guidance.`);
  }
}

const fuzzyMetadata = resolveMiraComparisonEntities(
  "compare as400 services and secure tickiting",
);
if (
  fuzzyMetadata.status !== "resolved" ||
  fuzzyMetadata.matches.some(
    (match) =>
      match.confidence < 0.68 ||
      !["exact_alias", "fuzzy_alias", "abbreviation"].includes(
        match.matchType,
      ),
  )
) {
  fail("entity-fuzzy-metadata: expected confident deterministic match metadata.");
}

const ambiguousEntity = resolveMiraEntityText("support");
if (
  ambiguousEntity.status !== "ambiguous" ||
  ambiguousEntity.candidates.length < 2
) {
  fail("entity-fuzzy-ambiguity: generic support must list likely candidates.");
}

const groundedComparison = resolveMiraComparison(
  "Compare Secure Ticketing and Case Management with Bill Audit & Bill Pay.",
);
if (
  /pricing|implementation timeline|guaranteed performance|integration with/i.test(
    JSON.stringify(groundedComparison?.comparison || {}),
  )
) {
  fail("comparison-grounding: returned an unsupported comparison claim.");
}

const decisionCases = [
  {
    id: "financial",
    message:
      "Which is better for vendor bill discrepancies and approval workflows?",
    intent: "select_for_requirement",
    expectedIds: ["bill-audit-bill-pay"],
  },
  {
    id: "case-management",
    message:
      "Which is better for healthcare case intake, role-based access, and audit history?",
    intent: "select_for_requirement",
    expectedIds: ["secure-ticketing-case-management"],
  },
  {
    id: "explicit-history-reference",
    message: "Which of those is better for audit history?",
    history: platformOnlyHistory,
    intent: "select_for_requirement",
    expectedIds: ["secure-ticketing-case-management"],
  },
  {
    id: "mixed-needs",
    message:
      "We need healthcare case tracking and vendor bill approvals. Which is better?",
    intent: "multi_need",
    expectedIds: [
      "secure-ticketing-case-management",
      "bill-audit-bill-pay",
    ],
  },
  {
    id: "telecom",
    message:
      "Which platform is best for telecom bills, contract rates, usage analysis, and cost reporting?",
    intent: "select_for_requirement",
    expectedIds: ["bill-audit-bill-pay"],
  },
  {
    id: "ai-automation",
    message: "Which service is best for AI workflow automation?",
    intent: "select_for_requirement",
    expectedIds: ["ai-agentic-services"],
  },
];

for (const testCase of decisionCases) {
  const classification = classifyMiraDecisionIntent(
    testCase.message,
    testCase.history || [],
  );
  const result = resolveMiraDecisionRequest(
    testCase.message,
    testCase.history || [],
  );
  const actualIds = result?.entities?.map((entity) => entity.id) || [];
  if (classification.decisionIntent !== testCase.intent) {
    fail(
      `decision-${testCase.id}: expected intent ${testCase.intent}, got ${classification.decisionIntent}.`,
    );
  }
  if (JSON.stringify(actualIds) !== JSON.stringify(testCase.expectedIds)) {
    fail(
      `decision-${testCase.id}: expected [${testCase.expectedIds}], got [${actualIds}].`,
    );
  }
  if (resolveMiraComparison(testCase.message, testCase.history || [])) {
    fail(`decision-${testCase.id}: selection was intercepted by comparison.`);
  }
}

const firstDecision = resolveMiraDecisionRequest(
  "Which is better for vendor bill discrepancies and approval workflows?",
);
const secondDecision = resolveMiraDecisionRequest(
  "Which is better for healthcare case intake, role-based access, and audit history?",
  [
    { role: "user", content: "Which is better for vendor bill discrepancies and approval workflows?" },
    { role: "assistant", content: firstDecision?.answer || "" },
  ],
);
if (
  firstDecision?.recommendation?.primaryOption?.id !== "bill-audit-bill-pay" ||
  secondDecision?.recommendation?.primaryOption?.id !==
    "secure-ticketing-case-management"
) {
  fail("decision-topic-change: current-message criteria must replace the prior selection.");
}

if (failures.length) {
  console.error("Mira prompt contract tests failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mira prompt contract tests passed.");
console.log("Ran prompt construction checks, 20 mocked model output cases, and 24 reference cases.");
console.log("Ran 24 pipeline call-count performance cases.");
