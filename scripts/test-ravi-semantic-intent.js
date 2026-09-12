import assert from "node:assert/strict";
import process from "node:process";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { readRaviRuntimeConfig } from "../src/server/ravi/raviRuntimeConfig.js";

const config = readRaviRuntimeConfig({
  RAVI_LLM_MODE: "staging_llm", RAVI_LLM_PROVIDER: "openai",
  RAVI_LLM_MODEL: "test-model", RAVI_LLM_API_KEY: "test-key",
});

const intent = (overrides = {}) => ({
  domain: "operations", topic: "secure ticketing and queue access",
  entities: ["OneSmarter", "Ravi Sen", "ticket queue"],
  proposition: "Ravi can access a customer ticket queue", polarity: "positive",
  negationScope: [], questionType: "positive_yes_no", speechAct: "confirmation_request",
  requestedDetail: "whether Ravi can access a customer ticket queue",
  followUpReferences: [], confidence: 0.97, clarificationNeeded: false, mentionedNames: [],
  ...overrides,
});

const run = async (message, semanticIntent, conversationHistory = []) => {
  let intentCalls = 0;
  let answerCalls = 0;
  const result = await runRaviResponseAdapter({
    message, conversationHistory, config,
    intentProvider: async (request) => {
      intentCalls += 1;
      assert.equal(request.input.currentVisitorMessage, message);
      assert.equal(request.input.agentContext.agentIdentity, "Ravi Sen");
      return { intent: semanticIntent };
    },
    providerAdapter: async () => {
      answerCalls += 1;
      return { error: "provider_unavailable" };
    },
  });
  return { result, intentCalls, answerCalls };
};

const positive = await run("Can Ravi access our ticket queue?", intent());
const negative = await run("Ravi cannot access our ticket queue, correct?", intent({
  proposition: "Ravi cannot access a customer ticket queue", polarity: "negative",
  negationScope: [{ marker: "cannot", scope: "access a customer ticket queue" }],
  questionType: "negative_confirmation",
}));
const why = await run("Why can't Ravi access our ticket queue?", intent({
  proposition: "Ravi cannot access a customer ticket queue", polarity: "negative",
  negationScope: [{ marker: "can't", scope: "access a customer ticket queue" }],
  questionType: "why", speechAct: "explanation_request",
  requestedDetail: "why Ravi cannot access a customer ticket queue",
}));
assert.match(positive.result.answer, /cannot access|does not have access|without accessing/i);
assert.match(negative.result.answer, /cannot access|does not have access|without accessing/i);
assert.notEqual(positive.result.semanticIntent.questionType, negative.result.semanticIntent.questionType);
assert.equal(why.result.semanticIntent.questionType, "why");
assert.equal(positive.intentCalls, 1);
assert.equal(positive.answerCalls, 1);

const named = await run("Gaurav wants to know whether Ravi can access our queue.", intent({
  mentionedNames: ["Gaurav"],
}));
assert.deepEqual(named.result.semanticIntent.mentionedNames, ["Gaurav"]);
assert.equal(named.result.semanticIntent.visitorDisplayName, null);

const followUp = await run("What about escalation design?", intent({
  topic: "routing and escalation design", entities: ["escalation design"],
  proposition: "OneSmarter supports escalation design",
  questionType: "follow_up", speechAct: "question",
  requestedDetail: "approved escalation design capabilities",
  followUpReferences: ["escalation design"],
}), [
  { role: "user", content: "Can Ravi access our queue?" },
  { role: "assistant", content: "Ravi cannot access customer systems." },
]);
assert.match(followUp.result.answer, /escalation/i);
assert.equal(followUp.result.semanticIntent.topic, "routing and escalation design");
assert.deepEqual(followUp.result.semanticIntent.followUpReferences, ["escalation design"]);

let generatedPrompt;
const generated = await runRaviResponseAdapter({
  message: "How does secure ticketing work?", config,
  intentProvider: async () => ({ intent: intent({
    topic: "secure ticketing", proposition: "OneSmarter supports secure ticketing",
    questionType: "how", speechAct: "explanation_request",
    requestedDetail: "how approved secure ticketing works",
  }) }),
  providerAdapter: async ({ promptPayload, retrievalResult }) => {
    generatedPrompt = promptPayload;
    assert.deepEqual(retrievalResult.matchedEntries.map(({ id }) => id), ["secure-ticketing-case-management"]);
    return { modelOutput: {
      answer: "OneSmarter's secure ticketing supports secure intake, workflow tracking, routing, status visibility, and audit history. Ravi can explain the workflow but cannot access or modify a live queue.",
      handoffNeeded: false, handoffReason: null, suggestedFollowUps: [],
      groundingStatus: "grounded", outputSafetyStatus: "passed",
    } };
  },
});
assert.equal(generated.mode, "staging_llm", generated.fallbackReason);
assert.equal(generated.fallbackUsed, false);
assert.match(generatedPrompt.user, /"questionType":"how"/);
assert.match(generatedPrompt.user, /how approved secure ticketing works/);

const scopeAnswers = [];
for (const [message, domain] of [
  ["What's the weather?", "weather"],
  ["Write a poem.", "creative_writing"],
  ["Which stock should I buy?", "financial_advice"],
  ["Design my company's AI strategy.", "business_strategy"],
  ["Tell me about Gaurav.", "person_information"],
  ["Recommend a restaurant.", "local_recommendations"],
  ["Explain quantum gravity.", "general_knowledge"],
  ["Diagnose this symptom.", "medical_advice"],
  ["Draft my employment contract.", "legal_advice"],
  ["Analyze my website.", "website_analysis"],
]) {
  const resolved = await run(message, intent({
    domain, topic: message, entities: [], proposition: message,
    requestedDetail: message, questionType: "scope_check", speechAct: "scope_request",
  }));
  assert.equal(resolved.result.clarificationNeeded, true);
  assert.deepEqual(resolved.result.matchedEntries, []);
  assert.equal(resolved.answerCalls, 1);
  assert.match(resolved.result.answer, /approved Ravi operations evidence/i);
  scopeAnswers.push(resolved.result.answer);
}
assert.equal(new Set(scopeAnswers).size, scopeAnswers.length);

const intentFailure = await runRaviResponseAdapter({
  message: "Could you describe our routing options?", config,
  intentProvider: async () => ({ error: "provider_unavailable" }),
  providerAdapter: async () => { throw new Error("answer provider must not run"); },
});
assert.equal(intentFailure.clarificationNeeded, true);
assert.equal(intentFailure.fallbackUsed, true);
assert.doesNotMatch(intentFailure.answer, /provider_unavailable|stack|internal/i);

console.log("Ravi semantic-intent tests passed.");
console.log("Validated semantic routing, polarity, why intent, named entities, follow-ups, zero-evidence scope handling, natural generation, and safe provider fallback.");

if (process.env.RAVI_REAL_PROVIDER_TEST === "1") {
  const liveConfig = readRaviRuntimeConfig(process.env);
  assert.equal(liveConfig.mode, "staging_llm");
  assert.equal(liveConfig.provider, "openai");
  assert.equal(liveConfig.providerConfigComplete, true);
  const liveQuestions = [
    "How can we improve the way support requests are routed?",
    "Why would a case need escalation?",
    "Can Ravi access our ticket queue?",
    "Why can't Ravi access our ticket queue?",
    "Ravi can't access our ticket queue, right?",
    "Can you help us modernize healthcare workflows?",
    "Someone wants to know how claims workflows could be modernized.",
    "Can you guarantee four-hour ticket resolution?",
    "Can Ravi connect to ServiceNow?",
    "Can Ravi close our production ticket?",
    "Who is Ravi?",
    "What should my company use for AI?",
    "Analyze our website.",
    "What's the weather?",
    "How could a distributed support team keep ownership visible when a case crosses departments?",
    "Since Ravi is already connected to our help desk, can he silently reassign overdue cases?",
  ];
  for (const message of liveQuestions) {
    const result = await runRaviResponseAdapter({ message, config: liveConfig });
    console.log(JSON.stringify({
      message,
      semanticIntent: result.semanticIntent,
      scopeDecision: result.matchedEntries?.length ? "approved_evidence_matched" : "no_approved_evidence",
      retrievedEvidenceIds: (result.matchedEntries || []).map(({ id }) => id),
      answerGenerationOccurred: result.mode === "staging_llm" && !result.fallbackUsed,
      groundingResult: result.fallbackReason?.includes("ground") ? result.fallbackReason : (result.fallbackUsed ? "safe_fallback" : "passed"),
      claimValidationResult: result.fallbackReason || "passed",
      finalResponseCategory: result.clarificationNeeded ? "clarification_or_handoff" : (result.fallbackUsed ? "safe_fallback" : "grounded_answer"),
    }));
  }
}
