import assert from "node:assert/strict";
import process from "node:process";
import { handleSeleneChatRequest, runSeleneResponseAdapter } from "../src/server/selene/seleneResponseAdapter.js";
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
    providerAdapter: async ({ promptPayload, retrievalResult, requestContext }) => {
      answerCalls += 1;
      prompt = promptPayload;
      const refused = requestContext.claimEvaluation?.status === "HANDOFF_UNSUPPORTED";
      const summary = refused
        ? requestContext.claimEvaluation.approvedAlternative
        : retrievalResult.matchedEntries[0]?.approvedSummary;
      return { modelOutput: {
        answer: summary || `I don't have approved Selene architecture evidence for this ${intent.domain} ${intent.questionType.replaceAll("_", "-")} request.`,
        handoffNeeded: refused || !summary, handoffReason: refused ? requestContext.claimEvaluation.reason : (summary ? null : "Outside approved Selene evidence"),
        suggestedFollowUps: summary ? [] : ["Would you like to review OneSmarter's agent architecture?"],
        groundingStatus: refused ? "refused" : (summary ? "grounded" : "insufficient_context"), outputSafetyStatus: refused ? "refused" : "passed",
      } };
    },
  });
  return { result, answerCalls, prompt };
};

for (const [message, topic, overrides] of [
  ["Who is Selene?", "Selene Hart Professional Role", { domain: "agent_identity", questionType: "status", requestedDetail: "Selene's role", entities: ["Selene Hart"], mentionedNames: ["Selene"] }],
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

const acknowledgement = await run("Thanks, that helps.", makeIntent({
  domain: "conversational_acknowledgement", topic: "acknowledgement", entities: [],
  proposition: "The visitor acknowledges the explanation", questionType: "unknown",
  speechAct: "unknown", requestedDetail: "", confidence: 0.93,
}));
assert.equal(acknowledgement.result.clarificationNeeded, false);
assert.equal(acknowledgement.answerCalls, 0);
assert.match(acknowledgement.result.answer, /approved Selene architecture evidence|understood|welcome|glad/i);
assert.doesNotMatch(acknowledgement.result.answer, /focused-agent architecture.*professional roles.*knowledge boundaries/is);

const gibberish = await run("vrmpt zzzz qqq", makeIntent({
  domain: "unresolved", topic: "unknown", entities: [], proposition: "",
  questionType: "unknown", speechAct: "unknown", requestedDetail: "",
  confidence: 0.12, clarificationNeeded: true,
}));
assert.equal(gibberish.result.clarificationNeeded, true);
assert.match(gibberish.result.answer, /context|clarif|understand|approved Selene architecture evidence/i);

const ambiguousName = await run("Sahil", makeIntent({
  domain: "person_information", topic: "Sahil", entities: ["Sahil"], proposition: "",
  questionType: "clarification", speechAct: "clarification_request", requestedDetail: "",
  confidence: 0.38, clarificationNeeded: true, mentionedNames: ["Sahil"],
}));
assert.equal(ambiguousName.result.clarificationNeeded, true);
assert.doesNotMatch(ambiguousName.result.answer, /Sahil (?:is|can|works|designs)/i);

const liveActionFollowUp = await run("Why not?", makeIntent({
  domain: "live_system_action", topic: "Professional Agent Role Separation", entities: ["Ravi Sen", "ticket queue"],
  proposition: "Ravi cannot access the visitor's ticket queue", polarity: "negative",
  questionType: "why", speechAct: "explanation_request", requestedDetail: "why Ravi cannot access the ticket queue",
  followUpReferences: ["Ravi Sen", "ticket queue"], mentionedNames: ["Ravi"],
}), [
  { role: "user", content: "Can Ravi access our ticket queue?" },
  { role: "assistant", content: "Ravi cannot access customer systems." },
]);
assert.equal(liveActionFollowUp.result.chargeEligible, false);
assert.match(liveActionFollowUp.result.answer, /does not establish live access|no agent has accessed/i);
assert.doesNotMatch(liveActionFollowUp.result.answer, /perform another professional agent's task/i);

const positivePolarity = await run("Does depletion make an agent less accurate?", makeIntent({
  topic: "Operational State, Depletion, Energy, Café Restoration, and Factual Accuracy", proposition: "Depletion makes an agent less accurate",
  questionType: "positive_yes_no", requestedDetail: "effect of depletion on accuracy",
}));
const negativePolarity = await run("Does depletion not make an agent less accurate?", makeIntent({
  topic: "Operational State, Depletion, Energy, Café Restoration, and Factual Accuracy", proposition: "Depletion does not make an agent less accurate",
  polarity: "negative", questionType: "negative_confirmation", speechAct: "confirmation_request",
  requestedDetail: "confirm accuracy is preserved", negationScope: [{ marker: "not", scope: "make an agent less accurate" }],
}));
assert.equal(positivePolarity.prompt.user.includes('"questionType":"positive_yes_no"'), true);
assert.equal(negativePolarity.prompt.user.includes('"questionType":"negative_confirmation"'), true);
assert.equal(negativePolarity.prompt.system.includes("negative-confirmation proposition"), true);

for (const [message, topic, detail, entities] of [
  ["What does Selene do?", "Selene Hart Professional Role", "Selene's responsibilities", ["Selene Hart"]],
  ["Who analyzes public websites?", "Professional Agent Role Separation", "agent responsible for public-page analysis", ["Theo Mercer"]],
  ["Compare Elena and Ravi.", "Professional Agent Role Separation", "differences between Elena and Ravi", ["Elena Cross", "Ravi Sen"]],
]) {
  const checked = await run(message, makeIntent({
    topic, entities, requestedDetail: detail,
    questionType: message.startsWith("Compare") ? "comparison" : "status",
  }));
  assert.equal(checked.result.matchedEntries.length, 1);
  assert.equal(checked.prompt.user.includes(detail), true);
}

const conservativeRoleIntent = await run("What is Elena responsible for?", makeIntent({
  domain: "agent_roles", topic: "Professional Agent Role Separation", entities: ["Elena Cross"],
  proposition: "Elena's professional responsibility", questionType: "clarification",
  speechAct: "explanation_request", requestedDetail: "Elena's responsibilities",
  confidence: 0.58, clarificationNeeded: true, mentionedNames: ["Elena"],
}));
assert.equal(conservativeRoleIntent.result.clarificationNeeded, false);
assert.equal(conservativeRoleIntent.result.matchedEntries[0].id, "professional-agent-role-separation");

const customerStrategy = await run("Which agents should my company deploy?", makeIntent({
  topic: "OneSmarter Focused-Agent Architecture", questionType: "recommendation_request",
  speechAct: "recommendation_request", proposition: "Recommend agents for the visitor's company",
  requestedDetail: "customer-specific agent selection",
}));
assert.equal(customerStrategy.result.matchedEntries.length, 1);
assert.equal(customerStrategy.result.chargeEligible, false);
assert.equal(customerStrategy.answerCalls, 1);
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
    { message: "What is Selene actually used for in OneSmarter's agent team?" },
    { message: "Which colleague focuses on examining public web pages for AI readability?" },
    { message: "Is machine-to-machine delegation active between your professional agents today?" },
    { message: "So the specialists do not independently pass jobs among themselves, correct?" },
    { message: "Why is automatic cross-agent delegation absent from the present design?" },
    { message: "Contrast the architecture strategist with the operations specialist." },
    { message: "Could he enter our support queue?", conversationHistory: [
      { role: "user", content: "Tell me what Ravi covers." },
      { role: "assistant", content: "Ravi explains approved operational workflows." },
    ] },
    { message: "What keeps a specialist's evidence from drifting into a neighboring role?" },
    { message: "Please choose an agent stack tailored to our business." },
    { message: "What will it rain tomorrow?" },
    { message: "Create the data-and-agent blueprint for our organization." },
    { message: "Given that one supervisor already controls every agent, name that supervisor." },
    { message: "How does separating interpretation from evidence affect the accountability of a response?" },
    { message: "I follow you now, thank you." },
    { message: "plmzz qqqv nnn" },
    { message: "Sahil" },
    { message: "Does reduced response energy make the specialists factually unreliable?" },
    { message: "Reduced response energy does not alter factual accuracy, correct?" },
    { message: "Why doesn't a quieter response mode relax the safety boundaries?" },
    { message: "What is Elena responsible for?" },
    { message: "How do Theo and Ravi differ?" },
    { message: "Who is Gaurav?" },
    { message: "Can Sahil design an agent system for a company?" },
    { message: "Why not?", conversationHistory: [
      { role: "user", content: "Can Ravi enter our ticket queue?" },
      { role: "assistant", content: "Ravi cannot access customer systems." },
    ] },
  ];
  for (const { message, conversationHistory = [] } of questions) {
    const result = await runSeleneResponseAdapter({ message, conversationHistory, config: liveConfig });
    console.log(JSON.stringify({ message, semanticIntent: result.semanticIntent,
      scopeDecision: result.matchedEntries?.length ? "approved_evidence_matched" : "no_approved_evidence",
      selectedEvidence: (result.matchedEntries || []).map(({ id }) => id),
      answerGenerationInvoked: result.mode === "staging_llm" && !result.fallbackUsed,
      groundingResult: result.fallbackUsed ? "safe_fallback" : "passed",
      claimValidationResult: result.fallbackReason || "passed", finalAnswer: result.answer }));
  }
  let sensitiveProviderCalls = 0;
  const sensitiveResult = await handleSeleneChatRequest({
    method: "POST", body: { message: "Aadhaar number is 5665 1234 5678" },
    rateLimitStore: { async consume() { return { allowed: true }; } },
    responseAdapter: async () => { sensitiveProviderCalls += 1; return {}; },
  });
  console.log(JSON.stringify({
    message: "Aadhaar-shaped test value", semanticIntent: null, selectedEvidence: [],
    answerGenerationInvoked: sensitiveProviderCalls > 0, groundingResult: "not_reached",
    claimValidationResult: "rejected_before_analysis", finalAnswer: sensitiveResult.body.message,
  }));
  assert.equal(sensitiveResult.status, 400);
  assert.equal(sensitiveProviderCalls, 0);
}
