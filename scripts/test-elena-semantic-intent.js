import assert from "node:assert/strict";
import { runElenaResponseAdapter } from "../src/server/elena/elenaResponseAdapter.js";
import { readElenaRuntimeConfig } from "../src/server/elena/elenaRuntimeConfig.js";

const config = readElenaRuntimeConfig({
  ELENA_LLM_MODE: "staging_llm",
  ELENA_LLM_PROVIDER: "openai",
  ELENA_LLM_MODEL: "test-model",
  ELENA_LLM_API_KEY: "test-key",
});

const intent = (overrides = {}) => ({
  domain: "compliance",
  topic: "HIPAA certification status",
  entities: ["OneSmarter", "HIPAA"],
  proposition: "OneSmarter holds official HIPAA certification",
  polarity: "positive",
  negationScope: [],
  questionType: "positive_yes_no",
  speechAct: "confirmation_request",
  requestedDetail: "OneSmarter's current HIPAA certification status",
  followUpReferences: [],
  confidence: 0.96,
  clarificationNeeded: false,
  mentionedNames: [],
  ...overrides,
});

const run = async (message, semanticIntent, conversationHistory = []) => {
  let intentCalls = 0;
  let answerCalls = 0;
  const result = await runElenaResponseAdapter({
    message,
    conversationHistory,
    config,
    intentProvider: async (request) => {
      intentCalls += 1;
      assert.equal(request.input.currentVisitorMessage, message);
      assert.equal(request.input.agentContext.agentIdentity, "Elena Cross");
      return { intent: semanticIntent };
    },
    providerAdapter: async () => {
      answerCalls += 1;
      return { error: "provider_unavailable" };
    },
  });
  return { result, intentCalls, answerCalls };
};

const positive = await run("Are you HIPAA certified?", intent());
const negative = await run("Are you not HIPAA certified?", intent({
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "hold official HIPAA certification" }],
  questionType: "negative_confirmation",
  proposition: "OneSmarter does not hold official HIPAA certification",
}));
assert.match(positive.result.answer, /^No\./);
assert.match(negative.result.answer, /^That is correct:/);
assert.notEqual(positive.result.answer, negative.result.answer);

const why = await run("Why aren't you HIPAA certified?", intent({
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "hold official HIPAA certification" }],
  questionType: "why",
  speechAct: "explanation_request",
  proposition: "OneSmarter does not hold official HIPAA certification",
  requestedDetail: "reason for the current HIPAA certification posture",
}));
assert.match(why.result.answer, /does not provide the reason/i);
assert.doesNotMatch(why.result.answer, /because/i);

const generated = async (message, semanticIntent, answer) => {
  let promptPayload;
  const result = await runElenaResponseAdapter({
    message,
    config,
    intentProvider: async () => ({ intent: semanticIntent }),
    providerAdapter: async (request) => {
      promptPayload = request.promptPayload;
      return { modelOutput: {
        answer,
        handoffNeeded: false,
        handoffReason: null,
        suggestedFollowUps: [],
        groundingStatus: "grounded",
        outputSafetyStatus: "passed",
      } };
    },
  });
  assert.match(promptPayload.user, new RegExp(semanticIntent.questionType));
  assert.match(promptPayload.user, new RegExp(semanticIntent.polarity));
  assert.match(promptPayload.user, new RegExp(semanticIntent.requestedDetail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(result.mode, "staging_llm", result.fallbackReason);
  assert.equal(result.fallbackUsed, false);
  return result;
};

const generatedPositive = await generated(
  "Are you HIPAA certified?",
  intent(),
  "No. OneSmarter does not present itself as HIPAA certified. The approved status is HIPAA Security Rule Compliance Assessment Completed.",
);
const generatedNegative = await generated(
  "You're not HIPAA certified, right?",
  intent({
    polarity: "negative",
    negationScope: [{ marker: "not", scope: "HIPAA certified" }],
    questionType: "negative_confirmation",
    proposition: "OneSmarter does not hold official HIPAA certification",
  }),
  "Correct—OneSmarter does not present itself as HIPAA certified. The approved status is HIPAA Security Rule Compliance Assessment Completed.",
);
const generatedStatus = await generated(
  "What is your actual HIPAA status?",
  intent({
    topic: "HIPAA posture",
    proposition: "OneSmarter has a current HIPAA posture",
    polarity: "unknown",
    questionType: "status",
    speechAct: "question",
    requestedDetail: "OneSmarter's actual HIPAA posture",
  }),
  "OneSmarter's approved HIPAA status is HIPAA Security Rule Compliance Assessment Completed. It is not presented as HIPAA certification.",
);
assert.notEqual(generatedPositive.answer, generatedNegative.answer);
assert.notEqual(generatedPositive.answer, generatedStatus.answer);

for (const message of [
  "Are you HIPAA certified?",
  "Do you hold an official HIPAA certification?",
  "Have you received formal HIPAA certification?",
  "Does OneSmarter have a HIPAA certificate?",
]) {
  const resolved = await run(message, intent());
  assert.match(resolved.result.answer, /HIPAA Security Rule Compliance Assessment Completed/i);
  assert.equal(resolved.result.semanticIntent.topic, "HIPAA certification status");
}

const indirect = await run("Gaurav wants to know whether OneSmarter is HIPAA certified.", intent({
  mentionedNames: ["Gaurav"],
}));
assert.match(indirect.result.answer, /HIPAA Security Rule Compliance Assessment Completed/i);
assert.deepEqual(indirect.result.semanticIntent.mentionedNames, ["Gaurav"]);
assert.equal(indirect.result.semanticIntent.visitorDisplayName, null);

for (const [message, domain, expected] of [
  ["Tell me about Gaurav.", "person_information", /do not have approved compliance information about that person/i],
  ["What should my company use for AI?", "customer_ai_strategy", /Customer-specific AI strategy is outside Elena's compliance role/i],
  ["Can Ravi access our ticket queue?", "operations", /operational question for Ravi/i],
  ["Analyze my website.", "website_analysis", /Theo handles content analysis/i],
  ["What's the weather?", "weather", /outside Elena's OneSmarter compliance and readiness role/i],
  ["Tell me a joke.", "entertainment", /outside Elena's OneSmarter compliance and readiness role/i],
]) {
  const resolved = await run(message, intent({ domain, topic: message, proposition: message }));
  assert.equal(resolved.result.clarificationNeeded, true);
  assert.deepEqual(resolved.result.matchedEntries, []);
  assert.match(resolved.result.answer, expected);
  assert.equal(resolved.answerCalls, 0);
}

const followUpHistory = [
  { role: "user", content: "Are you HIPAA certified?" },
  { role: "assistant", content: "OneSmarter is not presented as HIPAA certified." },
];
const socFollowUp = await run("What about SOC 2?", intent({
  topic: "SOC 2 certification status",
  entities: ["OneSmarter", "SOC 2"],
  proposition: "OneSmarter holds SOC 2 certification",
  requestedDetail: "OneSmarter's SOC 2 status",
  followUpReferences: ["SOC 2"],
  questionType: "follow_up",
}), followUpHistory);
assert.match(socFollowUp.result.answer, /SOC 2 Type II Attested/i);
assert.doesNotMatch(socFollowUp.result.answer, /HIPAA Security Rule/i);

const whyFollowUp = await run("Why?", intent({
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "hold official HIPAA certification" }],
  questionType: "why",
  speechAct: "explanation_request",
  proposition: "OneSmarter does not hold official HIPAA certification",
  requestedDetail: "reason for the prior HIPAA certification posture",
  followUpReferences: ["prior HIPAA certification posture"],
}), followUpHistory);
assert.match(whyFollowUp.result.answer, /does not provide the reason/i);

const socNegativeFollowUp = await run("Are you not?", intent({
  topic: "SOC 2 certification status",
  entities: ["OneSmarter", "SOC 2"],
  proposition: "OneSmarter is not SOC 2 certified",
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "SOC 2 certified" }],
  questionType: "negative_confirmation",
  requestedDetail: "confirmation of the current SOC 2 posture",
  followUpReferences: ["SOC 2 certification"],
}), [
  ...followUpHistory,
  { role: "user", content: "What about SOC 2?" },
]);
assert.match(socNegativeFollowUp.result.answer, /^That is correct:.*SOC 2 Type II Attested/is);

const ambiguous = await run("Are you not?", intent({
  topic: "ambiguous certification reference",
  entities: [],
  proposition: "an unspecified certification does not apply",
  polarity: "negative",
  questionType: "follow_up",
  speechAct: "clarification_request",
  requestedDetail: "which certification the visitor means",
  followUpReferences: ["unspecified certification"],
  confidence: 0.3,
  clarificationNeeded: true,
}));
assert.equal(ambiguous.result.clarificationNeeded, true);
assert.equal(ambiguous.answerCalls, 0);

const mislabeledRavi = await run("Can Ravi access our ticket queue?", intent({
  domain: "compliance",
  topic: "Ravi ticket queue access",
  entities: ["Ravi", "ticket queue"],
  proposition: "Ravi can access the visitor's ticket queue",
  questionType: "scope_check",
  speechAct: "scope_request",
  requestedDetail: "whether Ravi can access a live ticket queue",
  mentionedNames: ["Ravi"],
}));
assert.match(mislabeledRavi.result.answer, /operational question for Ravi/i);
assert.doesNotMatch(mislabeledRavi.result.answer, /HIPAA Security Rule/i);

const broadStrategyDomain = await run("What should my company use for AI?", intent({
  domain: "technology",
  topic: "customer-specific AI strategy",
  entities: ["visitor company"],
  proposition: "the visitor's company should use a particular AI approach",
  questionType: "recommendation_request",
  speechAct: "recommendation_request",
  requestedDetail: "which AI approach the visitor's company should use",
}));
assert.match(broadStrategyDomain.result.answer, /Customer-specific AI strategy is outside Elena's compliance role/i);

for (const [message, semanticIntent, required] of [
  ["Does ISO certification cover claims processing?", intent({
    topic: "ISO certification scope",
    entities: ["OneSmarter", "ISO/IEC 27001", "claims processing"],
    proposition: "OneSmarter ISO certification covers claims processing",
    requestedDetail: "whether claims processing is within the certified scope",
  }), /Claims processing is not included.*AWS cloud services development/is],
  ["Is OneSmarter PCI DSS certified?", intent({
    topic: "PCI DSS certification status",
    entities: ["OneSmarter", "PCI DSS"],
    proposition: "OneSmarter is PCI DSS certified",
    requestedDetail: "OneSmarter's PCI DSS certification status",
  }), /readiness services only.*does not establish.*PCI DSS certified/is],
  ["Can OneSmarter certify my company?", intent({
    topic: "customer certification",
    entities: ["OneSmarter", "visitor company"],
    proposition: "OneSmarter can certify the visitor's company",
    requestedDetail: "whether OneSmarter can certify a customer organization",
  }), /does not certify customer organizations/i],
  ["Can you guarantee that we pass the audit?", intent({
    topic: "audit outcome guarantee",
    entities: ["OneSmarter", "visitor organization"],
    proposition: "OneSmarter guarantees the visitor will pass an audit",
    requestedDetail: "whether OneSmarter guarantees audit success",
  }), /does not guarantee compliance, certification, or audit success/i],
]) {
  const resolved = await run(message, semanticIntent);
  assert.match(resolved.result.answer, required);
}

const concise = await runElenaResponseAdapter({
  message: "Are you HIPAA certified?",
  verbosityBand: "concise",
  config,
  intentProvider: async () => ({ intent: intent() }),
  providerAdapter: async () => ({ error: "provider_unavailable" }),
});
assert.match(concise.answer, /not presented as HIPAA certified/i);
assert.match(concise.answer, /HIPAA Security Rule Compliance Assessment Completed/i);

let answerCalls = 0;
const failedIntent = await runElenaResponseAdapter({
  message: "Are you HIPAA certified?",
  config,
  intentProvider: async () => { throw new Error("offline"); },
  providerAdapter: async () => { answerCalls += 1; return {}; },
});
assert.equal(failedIntent.clarificationNeeded, true);
assert.equal(failedIntent.fallbackReason, "provider_failure");
assert.equal(answerCalls, 0);

console.log("Elena semantic-intent integration tests passed.");
