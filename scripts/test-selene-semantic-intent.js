import assert from "node:assert/strict";
import process from "node:process";
import { runSeleneResponseAdapter } from "../src/server/selene/seleneResponseAdapter.js";
import { readSeleneRuntimeConfig } from "../src/server/selene/seleneRuntimeConfig.js";

const config = readSeleneRuntimeConfig({
  SELENE_LLM_MODE: "staging_llm", SELENE_LLM_PROVIDER: "openai",
  SELENE_LLM_MODEL: "test-model", SELENE_LLM_API_KEY: "test-key",
});
const makeIntent = (overrides = {}) => ({
  domain: "agent_architecture", topic: "OneSmarter Focused-Agent Architecture",
  entities: ["OneSmarter"], proposition: "OneSmarter uses focused agents",
  polarity: "positive", negationScope: [], questionType: "how",
  speechAct: "explanation_request", requestedDetail: "focused-agent design",
  followUpReferences: [], confidence: 0.96, clarificationNeeded: false,
  mentionedNames: [], ...overrides,
});

const run = async (message, intent, conversationHistory = []) => {
  let answerCalls = 0;
  let prompt;
  const result = await runSeleneResponseAdapter({
    message, conversationHistory, config,
    intentProvider: async () => ({ intent }),
    providerAdapter: async ({ promptPayload, retrievalResult }) => {
      answerCalls += 1;
      prompt = promptPayload;
      const summary = retrievalResult.matchedEntries[0]?.approvedSummary;
      return { modelOutput: {
        answer: summary || `I don't have approved Selene architecture evidence for this ${intent.domain} ${intent.questionType.replaceAll("_", "-")} request.`,
        handoffNeeded: !summary, handoffReason: summary ? null : "Outside approved Selene evidence",
        suggestedFollowUps: summary ? [] : ["Would you like to review OneSmarter's agent architecture?"],
        groundingStatus: summary ? "grounded" : "insufficient_context", outputSafetyStatus: "passed",
      } };
    },
  });
  return { result, answerCalls, prompt };
};

for (const [message, topic, overrides] of [
  ["Who is Selene?", "OneSmarter Focused-Agent Architecture", { domain: "agent_identity", questionType: "status", requestedDetail: "Selene's role", entities: ["Selene Hart"], mentionedNames: ["Selene"] }],
  ["How is Selene different from Ravi?", "Professional Agent Role Separation", { domain: "agent_roles", questionType: "comparison", speechAct: "comparison_request", entities: ["Selene Hart", "Ravi Sen"], mentionedNames: ["Selene", "Ravi"] }],
  ["Why did OneSmarter choose several specialized agents?", "OneSmarter Focused-Agent Architecture", { questionType: "why", requestedDetail: "approved reason for focused roles" }],
  ["Do your agents collaborate autonomously?", "Current Orchestration and Future Collaboration Boundary", { questionType: "positive_yes_no", proposition: "Agents collaborate autonomously" }],
  ["Your agents don't collaborate autonomously, right?", "Current Orchestration and Future Collaboration Boundary", { questionType: "negative_confirmation", speechAct: "confirmation_request", polarity: "negative", negationScope: [{ marker: "don't", scope: "collaborate autonomously" }] }],
  ["How do you keep facts inside the correct role?", "Canonical Knowledge and Evidence Boundary", { requestedDetail: "role-specific evidence isolation" }],
  ["Could Café dialogue become factual evidence?", "Professional and Café Separation", { questionType: "hypothetical", speechAct: "hypothetical" }],
  ["What happens when an answer lacks support?", "Claim Validation and Fail-Closed Design", { questionType: "status", requestedDetail: "unsupported-answer handling" }],
]) {
  const checked = await run(message, makeIntent({ topic, ...overrides }));
  assert.equal(checked.answerCalls, 1, message);
  assert.equal(checked.result.mode, "staging_llm", `${message}: ${checked.result.fallbackReason}`);
  assert.equal(checked.result.matchedEntries.length, 1, message);
  assert.match(checked.prompt.user, /Validated semantic interpretation/);
}

const followUp = await run("Can he access our ticket system?", makeIntent({
  domain: "agent_roles", topic: "Professional Agent Role Separation", entities: ["Ravi Sen"],
  proposition: "Ravi can access a customer ticket system", questionType: "follow_up",
  requestedDetail: "Ravi live-system access boundary", followUpReferences: ["he: Ravi Sen"],
} ), [{ role: "user", content: "What about Ravi?" }, { role: "assistant", content: "Ravi explains operations." }]);
assert.deepEqual(followUp.result.semanticIntent.followUpReferences, ["he: Ravi Sen"]);

const ambiguous = await run("What about the other one?", makeIntent({ clarificationNeeded: true, confidence: 0.35, questionType: "clarification", speechAct: "clarification_request", followUpReferences: ["the other one"] }));
assert.equal(ambiguous.result.clarificationNeeded, true);
assert.equal(ambiguous.answerCalls, 1);

const customerStrategy = await run("Which agents should my company deploy?", makeIntent({
  topic: "OneSmarter Focused-Agent Architecture", questionType: "recommendation_request",
  speechAct: "recommendation_request", proposition: "Recommend agents for the visitor's company",
  requestedDetail: "customer-specific agent selection",
}));
assert.equal(customerStrategy.result.matchedEntries.length, 1);
assert.equal(customerStrategy.result.chargeEligible, false);
assert.equal(customerStrategy.answerCalls, 0);
assert.match(customerStrategy.result.answer, /care@onesmarter\.com|customer-specific|outside/i);

const scopeAnswers = [];
for (const [message, domain] of [
  ["What should my company use for AI?", "business_strategy"],
  ["Design our customer-data architecture.", "customer_architecture"],
  ["Tell me about Gaurav.", "person_information"],
  ["Tell me about SSGMCE.", "organization_information"],
  ["What's the weather?", "weather"],
]) {
  const checked = await run(message, makeIntent({ domain, topic: message, proposition: message, questionType: "scope_check", speechAct: "scope_request", requestedDetail: message }));
  assert.equal(checked.result.clarificationNeeded, true);
  assert.deepEqual(checked.result.matchedEntries, []);
  assert.equal(checked.answerCalls, 1);
  scopeAnswers.push(checked.result.answer);
}
assert.equal(new Set(scopeAnswers).size, scopeAnswers.length);

const failed = await runSeleneResponseAdapter({
  message: "Explain the architecture.", config,
  intentProvider: async () => ({ error: "unavailable" }),
  providerAdapter: async () => { throw new Error("answer generation must not run"); },
});
assert.equal(failed.clarificationNeeded, true);
assert.equal(failed.fallbackUsed, true);

console.log("Selene semantic-intent tests passed.");

if (process.env.SELENE_REAL_PROVIDER_TEST === "1") {
  const liveConfig = readSeleneRuntimeConfig(process.env);
  assert.equal(liveConfig.providerConfigComplete, true);
  const questions = [
    "Who is Selene?", "What does Selene do?", "How is Selene different from Ravi?",
    "How is Elena different from Selene?", "Why did OneSmarter choose several specialized agents?",
    "Do your agents collaborate autonomously?", "Your agents don't collaborate autonomously, right?",
    "Why don't your agents collaborate autonomously?", "What is your current orchestration model?",
    "How do you prevent unsupported claims?", "Can Café conversations become professional evidence?",
    "Can Selene design an AI strategy for my company?", "Which agents should my company deploy?",
    "Can Selene design our customer-data architecture?", "Can Ravi close our production ticket?",
    "Can Elena review our HIPAA claim?", "Analyze my website.", "Tell me about Gaurav.",
    "Tell me about SSGMCE.", "What's the weather?",
    "How does a role boundary keep an architecture explanation accountable?",
    "Since your agents already delegate autonomously, which one supervises the others?",
  ];
  for (const message of questions) {
    const result = await runSeleneResponseAdapter({ message, config: liveConfig });
    console.log(JSON.stringify({ message, semanticIntent: result.semanticIntent,
      scopeDecision: result.matchedEntries?.length ? "approved_evidence_matched" : "no_approved_evidence",
      selectedEvidence: (result.matchedEntries || []).map(({ id }) => id),
      answerGenerationInvoked: result.mode === "staging_llm" && !result.fallbackUsed,
      groundingResult: result.fallbackUsed ? "safe_fallback" : "passed",
      claimValidationResult: result.fallbackReason || "passed", finalAnswer: result.answer }));
  }
}
