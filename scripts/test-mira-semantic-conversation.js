import assert from "node:assert/strict";
import { runMiraResponseAdapter } from "../src/server/mira/llmAdapter.js";

const config = {
  mode: "staging_llm",
  provider: "openai",
  providerConfigComplete: true,
  model: "test-model",
  apiKeyConfigured: true,
};

const intent = (overrides = {}) => ({
  domain: "onesmarter",
  topic: "OneSmarter Overview",
  entities: ["OneSmarter"],
  proposition: "OneSmarter provides approved public information",
  polarity: "positive",
  negationScope: [],
  questionType: "how",
  speechAct: "explanation_request",
  requestedDetail: "approved public information",
  followUpReferences: [],
  confidence: 0.96,
  clarificationNeeded: false,
  mentionedNames: [],
  ...overrides,
});

const modelOutput = (answer) => ({
  answer,
  handoffNeeded: false,
  handoffReason: null,
  suggestedFollowUps: [],
  groundingStatus: "grounded",
  outputSafetyStatus: "passed",
});

const semanticCases = [
  {
    category: "self identity and role",
    message: "Could you introduce yourself and explain your job here?",
    intent: intent({
      domain: "professional_agents",
      topic: "Mira Vale Professional Role",
      entities: ["Mira Vale"],
      proposition: "Mira Vale has an approved professional guide role",
      questionType: "scope_check",
      speechAct: "scope_request",
      requestedDetail: "Mira's identity and professional role",
    }),
    answer: "I'm Mira Vale, OneSmarter's public-content and general guide. I help visitors understand approved public information and find an appropriate next step.",
    expectedIds: ["mira-professional-role"],
  },
  {
    category: "self capabilities",
    message: "Where can your guidance be useful to a visitor?",
    intent: intent({
      domain: "professional_agents",
      topic: "Mira Vale Professional Role",
      entities: ["Mira Vale"],
      proposition: "Mira can guide visitors through approved OneSmarter information",
      questionType: "scope_check",
      speechAct: "scope_request",
      requestedDetail: "Mira's supported topics",
    }),
    answer: "Mira can explain approved platform, technology-service, business-service, professional-agent, compliance, and Trust Center information.",
    expectedIds: ["mira-professional-role"],
  },
  {
    category: "self limitations",
    message: "Where do the limits of your role begin?",
    intent: intent({
      domain: "professional_agent_boundaries",
      topic: "Mira Vale Professional Role",
      entities: ["Mira Vale"],
      proposition: "Mira has limits on access, actions, private information, and guarantees",
      polarity: "negative",
      negationScope: [{ marker: "limits", scope: "Mira's professional capabilities" }],
      questionType: "scope_check",
      speechAct: "scope_request",
      requestedDetail: "Mira's professional limitations",
    }),
    answer: "Mira does not access customer systems, perform customer actions, provide private customer information, or guarantee business or compliance outcomes.",
    expectedIds: ["mira-professional-role"],
  },
  {
    category: "other agent entity",
    message: "Which responsibilities belong to Theo Mercer?",
    intent: intent({
      domain: "agent_roles",
      topic: "AI Agentic Services",
      entities: ["Theo Mercer"],
      proposition: "Theo Mercer has an approved professional role",
      questionType: "scope_check",
      speechAct: "scope_request",
      requestedDetail: "Theo Mercer's role",
      mentionedNames: ["Theo Mercer"],
    }),
    answer: "Theo Mercer analyzes supplied website or page content and AI readability.",
    expectedIds: ["ai-agentic-services"],
  },
  {
    category: "agent comparison",
    message: "Contrast Ravi's responsibilities with Mira's guidance role.",
    intent: intent({
      domain: "agent_roles",
      topic: "AI Agentic Services",
      entities: ["Ravi Sen", "Mira Vale"],
      proposition: "Ravi Sen and Mira Vale have different professional roles",
      questionType: "comparison",
      speechAct: "comparison_request",
      requestedDetail: "differences between Ravi and Mira",
      mentionedNames: ["Ravi Sen", "Mira Vale"],
    }),
    answer: "Mira Vale is OneSmarter's public-content guide. Ravi Sen explains approved operations, workflow, ticketing, and routing capabilities without accessing customer systems.",
    expectedIds: ["ai-agentic-services", "mira-professional-role"],
  },
  {
    category: "negative proposition",
    message: "Is it false that OneSmarter supports healthcare organizations?",
    intent: intent({
      domain: "healthcare",
      topic: "Claims Processing Services",
      entities: ["OneSmarter", "healthcare organizations", "TPAs"],
      proposition: "OneSmarter does not support healthcare organizations",
      polarity: "negative",
      negationScope: [{ marker: "false", scope: "OneSmarter supports healthcare organizations" }],
      questionType: "negative_confirmation",
      speechAct: "confirmation_request",
      requestedDetail: "whether OneSmarter supports healthcare organizations",
    }),
    answer: "No. OneSmarter supports healthcare and TPA operations through Claims Processing Services and secure workflow capabilities.",
    expectedIds: ["claims-processing-services"],
  },
  {
    category: "negative capability",
    message: "Summarize the boundaries of what OneSmarter provides.",
    intent: intent({
      domain: "company",
      topic: "OneSmarter Overview",
      entities: ["OneSmarter"],
      proposition: "OneSmarter has documented capability boundaries",
      polarity: "negative",
      negationScope: [{ marker: "boundaries", scope: "what OneSmarter provides" }],
      questionType: "scope_check",
      speechAct: "scope_request",
      requestedDetail: "supported non-capabilities without a comprehensive list",
    }),
    answer: "The approved public information does not provide a comprehensive list of everything OneSmarter does not do. It does not guarantee compliance or provide legal or medical advice.",
    expectedIds: ["company-overview"],
  },
  {
    category: "agent live-system boundary",
    message: "Would Ravi be able to alter a ticket inside our live environment?",
    intent: intent({
      domain: "professional_agent_boundaries",
      topic: "AI Agentic Services",
      entities: ["Ravi Sen", "customer ticket", "live environment"],
      proposition: "Ravi Sen can alter a customer ticket in a live environment",
      questionType: "scope_check",
      speechAct: "scope_request",
      requestedDetail: "Ravi's live-system action boundary",
      mentionedNames: ["Ravi Sen"],
    }),
    answer: "Ravi Sen can explain approved operations, workflow, ticketing, and routing capabilities, but he does not access customer systems or alter live tickets.",
    expectedIds: ["ai-agentic-services"],
  },
  {
    category: "agent handoff",
    message: "Which professional role covers inspecting a page's AI readability?",
    intent: intent({
      domain: "agent_roles",
      topic: "AI Agentic Services",
      entities: ["Theo Mercer", "website page"],
      proposition: "Theo Mercer analyzes supplied page content and AI readability",
      questionType: "handoff_request",
      speechAct: "handoff_request",
      requestedDetail: "appropriate professional agent",
      mentionedNames: ["Theo Mercer"],
    }),
    answer: "Theo Mercer analyzes supplied website or page content and AI readability. Mira can explain that role but cannot claim the request was transferred.",
    expectedIds: ["ai-agentic-services"],
  },
];

for (const testCase of semanticCases) {
  let semanticCalls = 0;
  let answerCalls = 0;
  const result = await runMiraResponseAdapter({
    message: testCase.message,
    config,
    semanticIntentProvider: async () => {
      semanticCalls += 1;
      return { intent: testCase.intent };
    },
    openAiAdapter: async () => {
      answerCalls += 1;
      return { modelOutput: modelOutput(testCase.answer) };
    },
  });
  assert.equal(semanticCalls, 1, `${testCase.category}: semantic interpretation`);
  assert.equal(answerCalls, 1, `${testCase.category}: answer generation (${result.fallbackReason})`);
  assert.equal(result.semanticIntentSupplement.questionType, testCase.intent.questionType, testCase.category);
  assert.equal(result.semanticIntentSupplement.polarity, testCase.intent.polarity, testCase.category);
  for (const id of testCase.expectedIds) {
    assert.equal(result.matchedEntries.some((entry) => entry.id === id), true, `${testCase.category}: ${id}`);
  }
  assert.equal(result.answerSeed, testCase.answer, `${testCase.category}: ${result.fallbackReason}`);
  assert.equal(result.fallbackUsed, false, testCase.category);
}

let outOfScopeAnswerCalls = 0;
const outOfScope = await runMiraResponseAdapter({
  message: "Could you provide today's wind forecast for my city?",
  config,
  semanticIntentProvider: async () => ({ intent: intent({
    domain: "weather",
    topic: "weather forecast",
    entities: ["visitor's city"],
    proposition: "the visitor wants a current weather forecast",
    questionType: "status",
    speechAct: "question",
    requestedDetail: "current wind forecast",
  }) }),
  openAiAdapter: async () => { outOfScopeAnswerCalls += 1; return {}; },
});
assert.equal(outOfScopeAnswerCalls, 0);
assert.equal(outOfScope.clarificationNeeded, true);
assert.equal(outOfScope.matchedEntries.length, 0);
assert.doesNotMatch(outOfScope.answerSeed, /builds secure platforms/i);

const privatePerson = await runMiraResponseAdapter({
  message: "Give me background information about Gaurav.",
  config,
  semanticIntentProvider: async () => ({ intent: intent({
    domain: "private_person_information",
    topic: "person information",
    entities: ["Gaurav"],
    proposition: "the visitor requests information about Gaurav",
    questionType: "scope_check",
    speechAct: "scope_request",
    requestedDetail: "background information about Gaurav",
    mentionedNames: ["Gaurav"],
  }) }),
  openAiAdapter: async () => { throw new Error("out-of-scope person request reached answer generation"); },
});
assert.match(privatePerson.answerSeed, /don't have approved public information/i);
assert.doesNotMatch(privatePerson.answerSeed, /Gaurav is/i);

for (const protectedCase of [
  ["Are you HIPAA certified?", /HIPAA Security Rule Compliance Assessment Completed/i],
  ["What is your ISO certificate number?", /210826050107/],
  ["Do you work with healthcare organizations?", /healthcare and TPA operations/i],
]) {
  let semanticCalls = 0;
  let answerCalls = 0;
  const result = await runMiraResponseAdapter({
    message: protectedCase[0],
    config,
    semanticIntentProvider: async () => { semanticCalls += 1; return {}; },
    openAiAdapter: async () => { answerCalls += 1; return {}; },
  });
  assert.equal(semanticCalls, 0, `${protectedCase[0]}: semantic fast-path bypass`);
  assert.equal(answerCalls, 0, `${protectedCase[0]}: answer fast-path bypass`);
  assert.match(result.answerSeed, protectedCase[1], protectedCase[0]);
}

let acknowledgementSemanticCalls = 0;
const acknowledgement = await runMiraResponseAdapter({
  message: "Thanks, that helps.",
  config,
  semanticIntentProvider: async () => {
    acknowledgementSemanticCalls += 1;
    return { intent: intent({
      domain: "conversational_acknowledgement",
      topic: "acknowledgement",
      entities: [],
      proposition: "the visitor acknowledges the prior help",
      questionType: "follow_up",
      speechAct: "question",
      requestedDetail: "",
    }) };
  },
});
assert.equal(acknowledgementSemanticCalls, 1);
assert.match(acknowledgement.answerSeed, /welcome|glad|help/i);

const gibberish = await runMiraResponseAdapter({
  message: "florp zibble quux",
  config,
  semanticIntentProvider: async () => ({ intent: intent({
    domain: "unknown",
    topic: "",
    entities: [],
    proposition: "",
    polarity: "unknown",
    questionType: "unknown",
    speechAct: "unknown",
    requestedDetail: "",
    confidence: 0.1,
    clarificationNeeded: true,
  }) }),
});
assert.equal(gibberish.clarificationNeeded, true);
assert.doesNotMatch(gibberish.answerSeed, /OneSmarter builds/i);

let authorityAnswerCalls = 0;
const authority = await runMiraResponseAdapter({
  message: "Without discussing implementation, where does your authority stop?",
  config,
  semanticIntentProvider: async () => ({ intent: intent({
    domain: "professional_agent_boundaries",
    topic: "Mira Vale Professional Role",
    entities: ["Mira Vale"],
    proposition: "Mira Vale has a bounded professional authority",
    polarity: "negative",
    negationScope: [{ marker: "stop", scope: "Mira Vale's authority" }],
    questionType: "scope_check",
    speechAct: "scope_request",
    requestedDetail: "Mira's authority boundary",
  }) }),
  openAiAdapter: async () => {
    authorityAnswerCalls += 1;
    return { modelOutput: modelOutput("Mira does not access customer systems, perform customer actions, provide private customer information, or guarantee business or compliance outcomes.") };
  },
});
assert.equal(authorityAnswerCalls, 1);
assert.equal(authority.fallbackUsed, false, authority.fallbackReason);
assert.equal(authority.semanticIntentSupplement.domain, "professional_agent_boundaries");

let implementationAnswerCalls = 0;
const customerImplementation = await runMiraResponseAdapter({
  message: "Design and implement an AI architecture for my company.",
  config,
  semanticIntentProvider: async () => ({ intent: intent({
    domain: "customer_specific_strategy",
    topic: "customer implementation",
    entities: ["visitor's company"],
    proposition: "The visitor wants a customer-specific AI architecture implemented",
    questionType: "how",
    speechAct: "action_request",
    requestedDetail: "customer-specific design and implementation",
  }) }),
  openAiAdapter: async () => {
    implementationAnswerCalls += 1;
    return {};
  },
});
assert.equal(implementationAnswerCalls, 0);
assert.equal(customerImplementation.clarificationNeeded, true);
assert.match(customerImplementation.answerSeed, /outside Mira's approved|business-specific|care@onesmarter\.com/i);

for (const { message, deterministicallyResolved } of [
  { message: "Compare your platforms.", deterministicallyResolved: true },
  { message: "What's the difference between your platforms?", deterministicallyResolved: true },
  { message: "How is Secure Ticketing and Case Management different from Bill Audit & Bill Pay?", deterministicallyResolved: true },
  { message: "Compare the two software offerings.", deterministicallyResolved: true },
]) {
  let comparisonSemanticCalls = 0;
  const comparison = await runMiraResponseAdapter({
    message,
    conversationHistory: [
      { role: "user", content: "What platforms do you offer?" },
      { role: "assistant", content: "Secure Ticketing and Case Management, and Bill Audit & Bill Pay." },
    ],
    config,
    semanticIntentProvider: async () => {
      comparisonSemanticCalls += 1;
      return { intent: intent({ clarificationNeeded: true, confidence: 0.4 }) };
    },
    openAiAdapter: async () => ({ modelOutput: modelOutput([
      "Secure Ticketing and Case Management supports secure intake, assignment, tracking, escalation, communication, and auditable closure.",
      "Bill Audit & Bill Pay supports invoice intake, validation, discrepancies, approvals, payments, reconciliation, reporting, and telecom expense management.",
    ].join(" ")) }),
  });
  if (deterministicallyResolved) {
    assert.equal(comparison.comparison?.status, "complete", message);
    assert.equal(comparison.clarificationNeeded, false, message);
    assert.equal(comparisonSemanticCalls, 0, `${message}: authoritative comparison should be preserved`);
  }
}

for (const testCase of [
  {
    message: "Would it be wrong to say your services are irrelevant to health-plan operations?",
    intent: intent({
      domain: "healthcare",
      topic: "Business Services Overview",
      entities: ["OneSmarter", "health-plan operations"],
      proposition: "OneSmarter services are irrelevant to healthcare operations",
      polarity: "negative",
      negationScope: [{ marker: "irrelevant", scope: "healthcare support" }],
      questionType: "negative_confirmation",
      speechAct: "confirmation_request",
      requestedDetail: "whether OneSmarter supports healthcare operations and claims workflows",
    }),
    answer: "No. OneSmarter supports healthcare and TPA operations through claims workflow modernization, claims technology support, portals, integration, reporting, and operational visibility.",
    expectedEvidence: "claims-processing-services",
  },
  {
    message: "What makes the premise that you avoid payer operations inaccurate?",
    intent: intent({
      domain: "healthcare",
      topic: "Business Services Overview",
      entities: ["OneSmarter", "payer operations"],
      proposition: "OneSmarter avoids healthcare payer operations",
      polarity: "negative",
      negationScope: [{ marker: "avoid", scope: "payer operations" }],
      questionType: "why",
      speechAct: "explanation_request",
      requestedDetail: "why the premise conflicts with approved healthcare and claims support",
    }),
    answer: "That premise is inaccurate because OneSmarter supports healthcare and TPA operations through approved claims workflow modernization and claims technology services.",
    expectedEvidence: "claims-processing-services",
  },
]) {
  const result = await runMiraResponseAdapter({
    message: testCase.message,
    config,
    semanticIntentProvider: async () => ({ intent: testCase.intent }),
    openAiAdapter: async () => ({ modelOutput: modelOutput(testCase.answer) }),
  });
  assert.equal(result.semanticIntentSupplement.questionType, testCase.intent.questionType);
  assert.equal(result.semanticIntentSupplement.polarity, "negative");
  assert.notEqual(result.matchedEntries[0]?.id, "business-services-overview", testCase.message);
  assert.equal(result.matchedEntries.some(({ id }) => id === testCase.expectedEvidence), true, testCase.message);
  assert.equal(result.fallbackUsed, false, `${testCase.message}: ${result.fallbackReason}`);
}

const serviceComparison = await runMiraResponseAdapter({
  message: "How do your engineering-oriented capabilities differ from your back-office support?",
  config,
  semanticIntentProvider: async () => ({ intent: intent({
    domain: "onesmarter",
    topic: "Technology Solutions Overview | Business Services Overview",
    entities: ["Technology Solutions", "Business Services"],
    proposition: "OneSmarter technology solutions and business services have different scopes",
    questionType: "comparison",
    speechAct: "comparison_request",
    requestedDetail: "differences between technology delivery and finance, HR, payment, and benefits support",
  }) }),
  openAiAdapter: async () => ({ modelOutput: modelOutput("Technology Solutions covers approved cloud, enterprise, AI, data, software, healthcare technology, and legacy-system capabilities. Business Services covers approved finance, HR, payment, benefits, and back-office workflows.") }),
});
assert.equal(serviceComparison.semanticIntentSupplement.questionType, "comparison");
assert.equal(serviceComparison.matchedEntries.some(({ id }) => id === "technology-solutions-overview"), true);
assert.equal(serviceComparison.matchedEntries.some(({ id }) => id === "business-services-overview"), true);
assert.equal(serviceComparison.fallbackUsed, false, serviceComparison.fallbackReason);

const genericPlatformComparison = await runMiraResponseAdapter({
  message: "Could you contrast the pair of software platforms you present?",
  config,
  semanticIntentProvider: async () => ({ intent: intent({
    domain: "platforms",
    topic: "Technology Solutions Overview",
    entities: ["OneSmarter software platforms"],
    proposition: "The visitor wants the approved software platforms compared",
    questionType: "comparison",
    speechAct: "comparison_request",
    requestedDetail: "differences between the approved platforms",
    confidence: 0.86,
    clarificationNeeded: true,
  }) }),
  openAiAdapter: async () => ({ modelOutput: modelOutput("Secure Ticketing and Case Management supports controlled case workflows. Bill Audit & Bill Pay supports invoice, approval, payment, reconciliation, reporting, and telecom-expense workflows.") }),
});
assert.equal(genericPlatformComparison.comparison?.status, "complete");
assert.equal(genericPlatformComparison.clarificationNeeded, false);
assert.equal(genericPlatformComparison.matchedEntries.some(({ id }) => id === "secure-ticketing-case-management"), true);
assert.equal(genericPlatformComparison.matchedEntries.some(({ id }) => id === "bill-audit-bill-pay"), true);

console.log("Mira semantic-conversation supplement tests passed.");
