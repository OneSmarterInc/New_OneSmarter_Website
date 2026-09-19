import assert from "node:assert/strict";
import { runMiraLocalHarness } from "../src/data/agentKnowledge/miraLocalEngine.js";
import { runMiraResponseAdapter } from "../src/server/mira/llmAdapter.js";

const config = {
  mode: "staging_llm",
  provider: "openai",
  providerConfigComplete: true,
  model: "test-model",
  apiKeyConfigured: true,
};

const intentFor = (domain, overrides = {}) => ({
  domain,
  topic: "general concept",
  entities: [],
  proposition: "the visitor requests general information",
  polarity: "positive",
  negationScope: [],
  questionType: "status",
  speechAct: "question",
  requestedDetail: "a concise explanation",
  followUpReferences: [],
  confidence: 0.94,
  clarificationNeeded: false,
  mentionedNames: [],
  ...overrides,
});

const runCase = async ({ message, intent, expected, generated = false, history = [] }) => {
  let generationCalls = 0;
  const result = await runMiraResponseAdapter({
    message,
    conversationHistory: history,
    config,
    semanticIntentProvider: async () => ({ intent }),
    openAiAdapter: async () => {
      generationCalls += 1;
      return {
        modelOutput: {
          answer: "In general usage, a platform is a foundation on which related tools or services can operate. This is general information, not a statement about OneSmarter.",
          handoffNeeded: true,
          handoffReason: "general_information_only",
          suggestedFollowUps: [],
          groundingStatus: "insufficient_context",
          outputSafetyStatus: "passed",
        },
      };
    },
  });
  assert.equal(generationCalls, generated ? 1 : 0, message);
  assert.doesNotMatch(result.answerSeed, /That request is outside Mira's approved public-content scope/i, message);
  assert.match(result.answerSeed, expected, message);
  return result;
};

await runCase({
  message: "In plain language, what does reciprocity mean?",
  intent: intentFor("general_definition", { topic: "reciprocity", requestedDetail: "plain-language meaning of reciprocity" }),
  expected: /platform|general information/i,
  generated: true,
});

await runCase({
  message: "Is it sensible to avoid personal details in public conversations?",
  intent: intentFor("privacy_general", { topic: "safe sharing of private information", questionType: "positive_yes_no" }),
  expected: /avoid sharing|privacy guidance/i,
});

await runCase({
  message: "zxqv plmno",
  intent: intentFor("meaningless_input", { topic: "", proposition: "", requestedDetail: "", confidence: 0.2, clarificationNeeded: true }),
  expected: /clear question|rephrase/i,
});

await runCase({
  message: "Who is Jordan from my office?",
  intent: intentFor("person_specific", { topic: "Jordan", entities: ["Jordan"], mentionedNames: ["Jordan"] }),
  expected: /person or organization/i,
});

await runCase({
  message: "Choose an AI operating model for our company.",
  intent: intentFor("customer_strategy", { topic: "customer-specific AI operating model", questionType: "recommendation_request", speechAct: "recommendation_request" }),
  expected: /customer-specific strategy|scoped discussion/i,
});

await runCase({
  message: "What is tomorrow's weather?",
  intent: intentFor("unrelated_factual", { topic: "tomorrow's weather", questionType: "status" }),
  expected: /tomorrow's weather|outside Mira/i,
});

await runCase({
  message: "Does OneSmarter support an unlisted proprietary connector?",
  intent: intentFor("unsupported_factual_request", {
    topic: "OneSmarter Overview",
    entities: ["OneSmarter"],
    proposition: "OneSmarter supports an unlisted proprietary connector",
    requestedDetail: "whether an unlisted proprietary connector is supported",
  }),
  expected: /whether an unlisted proprietary connector is supported/i,
});

const acknowledgement = await runCase({
  message: "Much appreciated.",
  intent: intentFor("conversational_acknowledgement", { topic: "acknowledgement", questionType: "unknown", speechAct: "unknown" }),
  expected: /sure|welcome|glad|happy/i,
});
assert.equal(acknowledgement.semanticAcknowledgementHandled, true);

const supported = runMiraLocalHarness("What is OneSmarter?");
assert.equal(supported.matchedEntries.length > 0, true);
assert.match(supported.answerSeed, /OneSmarter/i);

const runGroundedSemanticCase = async ({ message, intent, expectedIds, expectedBoundary }) => {
  const result = await runMiraResponseAdapter({
    message,
    conversationHistory: [],
    config,
    semanticIntentProvider: async () => ({ intent }),
    openAiAdapter: async () => ({ error: "offline" }),
  });
  const ids = result.matchedEntries.map(({ id }) => id);
  expectedIds.forEach((id) => assert.equal(ids.includes(id), true, `${message}: ${id}`));
  assert.doesNotMatch(result.answerSeed, /platforms, services, compliance posture/i, message);
  if (expectedBoundary) assert.match(result.answerSeed, expectedBoundary, message);
  return result;
};

await runGroundedSemanticCase({
  message: "Would these capabilities help a communications provider manage recurring carrier costs?",
  intent: intentFor("business_services", {
    topic: "Bill Audit & Bill Pay",
    entities: ["communications provider", "recurring carrier costs"],
    proposition: "Bill Audit and Bill Pay may support recurring carrier cost review",
    questionType: "positive_yes_no",
    requestedDetail: "applicability to recurring carrier expense review",
  }),
  expectedIds: ["bill-audit-bill-pay"],
});

await runGroundedSemanticCase({
  message: "How are sensitive clinical records handled in the workflow platform?",
  intent: intentFor("platforms", {
    topic: "Secure Ticketing and Case Management",
    entities: ["sensitive clinical records", "workflow platform"],
    proposition: "Secure Ticketing supports sensitive clinical-record workflows",
    questionType: "how",
    requestedDetail: "approved safeguards for sensitive workflows",
  }),
  expectedIds: ["secure-ticketing-case-management"],
  expectedBoundary: /PHI-sensitive|HIPAA-regulated/i,
});

await runGroundedSemanticCase({
  message: "Does the information-security credential extend to the claims service?",
  intent: intentFor("compliance", {
    topic: "ISO/IEC 27001 Certified|Claims Processing Services",
    entities: ["ISO/IEC 27001", "Claims Processing Services"],
    proposition: "OneSmarter's ISO certification covers Claims Processing Services",
    questionType: "scope_check",
    requestedDetail: "relationship between certified scope and claims services",
  }),
  expectedIds: ["iso-27001-certified", "claims-processing-services"],
  expectedBoundary: /does not automatically cover claims processing|certified scope/i,
});

const providerFailureWithEvidence = await runMiraResponseAdapter({
  message: "Does OneSmarter offer telecom expense management?",
  conversationHistory: [],
  config,
  semanticIntentProvider: async () => { throw new Error("offline"); },
  openAiAdapter: async () => ({ error: "offline" }),
});
assert.equal(
  providerFailureWithEvidence.matchedEntries.some(({ id }) => id === "bill-audit-bill-pay"),
  true,
);
assert.doesNotMatch(providerFailureWithEvidence.answerSeed, /outside Mira's approved/i);

const businessConversationCases = [
  {
    category: "healthcare applicability",
    message: "Could a neighborhood medical practice use anything you offer?",
    intent: intentFor("healthcare", {
      topic: "Claims Processing Services",
      entities: ["medical practice", "OneSmarter"],
      proposition: "OneSmarter capabilities may apply to a medical practice",
      questionType: "recommendation_request",
      speechAct: "recommendation_request",
      requestedDetail: "approved healthcare applicability",
    }),
    expectedId: "claims-processing-services",
  },
  {
    category: "existing-system modernization",
    message: "Could your team modernize software that another vendor originally delivered?",
    intent: intentFor("technology_solutions", {
      topic: "Technology Solutions Overview",
      entities: ["existing software", "Technology Solutions"],
      proposition: "Technology Solutions may support modernization of existing software",
      questionType: "positive_yes_no",
      requestedDetail: "approved modernization capability and customer-specific boundary",
    }),
    expectedId: "technology-solutions-overview",
  },
  {
    category: "ticketing differentiation",
    message: "What value could your case-management offering add if our team already uses a help desk?",
    intent: intentFor("platforms", {
      topic: "Secure Ticketing and Case Management",
      entities: ["existing help desk", "Secure Ticketing and Case Management"],
      proposition: "Secure Ticketing and Case Management may add approved workflow capabilities alongside an existing help desk",
      questionType: "why",
      requestedDetail: "approved differentiators without claiming an undocumented migration or integration",
    }),
    expectedId: "secure-ticketing-case-management",
  },
];

for (const testCase of businessConversationCases) {
  const result = await runMiraResponseAdapter({
    message: testCase.message,
    conversationHistory: [],
    config,
    semanticIntentProvider: async () => ({ intent: testCase.intent }),
    openAiAdapter: async () => ({ error: "offline" }),
  });
  assert.equal(
    result.matchedEntries.some(({ id }) => id === testCase.expectedId),
    true,
    `${testCase.category}: exact approved evidence`,
  );
  assert.equal(result.semanticIntentSupplement?.topic, testCase.intent.topic, testCase.category);
  assert.doesNotMatch(result.answerSeed, /I can help with platforms, services, compliance posture/i, testCase.category);
}

let discoveryGenerationCalls = 0;
const discovery = await runMiraResponseAdapter({
  message: "Which useful areas have I not explored with you yet?",
  conversationHistory: [],
  config,
  semanticIntentProvider: async () => ({
    intent: intentFor("onesmarter", {
      topic: "Mira Vale Professional Role",
      entities: ["Mira Vale", "OneSmarter"],
      proposition: "Mira can suggest approved areas for further discovery",
      questionType: "recommendation_request",
      speechAct: "recommendation_request",
      requestedDetail: "useful approved topics to explore",
    }),
  }),
  openAiAdapter: async () => {
    discoveryGenerationCalls += 1;
    return {
      modelOutput: {
        answer: "You could explore OneSmarter's approved platforms, technology and business services, professional agents, compliance posture, or Trust Center information.",
        handoffNeeded: false,
        handoffReason: null,
        suggestedFollowUps: [],
        groundingStatus: "grounded",
        outputSafetyStatus: "passed",
      },
    };
  },
});
assert.equal(discoveryGenerationCalls, 1);
assert.equal(discovery.semanticIntentSupplement?.questionType, "recommendation_request");
assert.doesNotMatch(discovery.answerSeed, /^Sure\.?$/i);

let semanticRetryCalls = 0;
const retriedNegativeQuestion = await runMiraResponseAdapter({
  message: "Is it inaccurate to say you have no healthcare operations support?",
  conversationHistory: [],
  config,
  semanticIntentProvider: async () => {
    semanticRetryCalls += 1;
    if (semanticRetryCalls === 1) return {};
    return {
      intent: intentFor("healthcare", {
        topic: "Claims Processing Services",
        entities: ["OneSmarter", "health-plan operations"],
        proposition: "OneSmarter services never support health-plan operations",
        polarity: "negative",
        negationScope: [{ marker: "never", scope: "support health-plan operations" }],
        questionType: "negative_confirmation",
        speechAct: "confirmation_request",
        requestedDetail: "whether approved services support health-plan operations",
      }),
    };
  },
  openAiAdapter: async () => ({ error: "offline" }),
});
assert.equal(semanticRetryCalls, 2);
assert.equal(retriedNegativeQuestion.semanticIntentSupplement?.polarity, "negative");
assert.equal(
  retriedNegativeQuestion.matchedEntries.some(({ id }) => id === "claims-processing-services"),
  true,
);

console.log("Mira contextual scope tests passed.");
