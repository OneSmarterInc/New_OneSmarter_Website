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

for (const [message, domain] of [
  ["Tell me about Gaurav.", "person_information"],
  ["What should my company use for AI?", "customer_ai_strategy"],
  ["Can Ravi access our ticket queue?", "operations"],
  ["Analyze my website.", "website_analysis"],
]) {
  const resolved = await run(message, intent({ domain, topic: message, proposition: message }));
  assert.equal(resolved.result.clarificationNeeded, true);
  assert.deepEqual(resolved.result.matchedEntries, []);
  assert.match(resolved.result.answer, /I can help with HIPAA, SOC 2, ISO\/IEC 27001/i);
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
