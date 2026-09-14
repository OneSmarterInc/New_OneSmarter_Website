import assert from "node:assert/strict";
import { runTheoResponseAdapter } from "../src/server/theo/theoResponseAdapter.js";

const config = {
  mode: "staging_llm", provider: "openai", providerConfigComplete: true,
  model: "test", apiKey: "test", timeoutMs: 100, maxTokens: 800, temperature: 0.2,
};
const websiteContent = `# Case Workflow
ExampleCo provides a case workflow service for operations teams.
The service records intake and review steps.
Contact the team for more information.`;
const baseIntent = {
  domain: "supplied_content_analysis", topic: "supplied-content-buyer-understanding",
  entities: ["supplied page", "buyer"], proposition: "The supplied page identifies its intended buyer",
  polarity: "positive", negationScope: [], questionType: "follow_up", speechAct: "question",
  requestedDetail: "the intended buyer", followUpReferences: ["the intended buyer"],
  confidence: 0.96, clarificationNeeded: false, mentionedNames: [],
};
const history = [
  { role: "user", content: "Who is this page aimed at?" },
  { role: "assistant", content: "The supplied page points to operations teams." },
];
let intentRequest;
let promptRequest;
const followUp = await runTheoResponseAdapter({
  message: "Why do you say that?",
  websiteContent,
  conversationHistory: history,
  config,
  intentProvider: async (request) => {
    intentRequest = request;
    return { intent: { ...baseIntent, questionType: "why", speechAct: "explanation_request", requestedDetail: "why operations teams appear to be the audience" } };
  },
  providerAdapter: async (request) => {
    promptRequest = request;
    return { modelOutput: { answer: JSON.stringify({
      overallAssessment: "The supplied page identifies operations teams as the audience.",
      strengths: ["The audience is stated directly."],
      findings: [{ area: "Audience", issue: "The audience evidence is explicit.", evidence: "ExampleCo provides a case workflow service for operations teams.", priority: "low" }],
      recommendations: [], clarificationNeeded: false, clarificationQuestion: null,
    }) } };
  },
});
assert.equal(followUp.mode, "staging_llm");
assert.deepEqual(intentRequest.input.conversationHistory.map(({ role }) => role), ["user", "assistant"]);
assert.equal(intentRequest.input.conversationHistory[1].evidenceAuthority, false);
assert.equal(intentRequest.input.currentVisitorMessage, "Why do you say that?");
assert.match(promptRequest.promptPayload.user, /why operations teams appear/i);
assert.match(promptRequest.promptPayload.context, /ExampleCo provides a case workflow service for operations teams/);
assert.doesNotMatch(promptRequest.promptPayload.context, /The supplied page points to operations teams/);

let generationCalls = 0;
const ambiguous = await runTheoResponseAdapter({
  message: "What about the other one?",
  websiteContent,
  conversationHistory: history,
  config,
  intentProvider: async () => ({ intent: { ...baseIntent, confidence: 0.35, clarificationNeeded: true } }),
  providerAdapter: async () => { generationCalls += 1; return {}; },
});
assert.equal(ambiguous.analysis.clarificationNeeded, true);
assert.match(ambiguous.analysis.clarificationQuestion, /which claim|section|comparison/i);
assert.equal(generationCalls, 0);

const providerFailure = await runTheoResponseAdapter({
  message: "What important information is missing?",
  websiteContent,
  conversationHistory: history,
  config,
  intentProvider: async () => ({ intent: { ...baseIntent, topic: "supplied-content-missing-information", questionType: "how", followUpReferences: [] } }),
  providerAdapter: async () => ({ error: "provider_timeout" }),
});
assert.equal(providerFailure.fallbackUsed, true);
assert.equal(providerFailure.fallbackReason, "provider_timeout");
assert.equal(providerFailure.analysis.evidenceStatus, "supplied_content_only");
assert.doesNotMatch(JSON.stringify(providerFailure.analysis), /system prompt|café persona/i);

const suppliedClaimFallback = await runTheoResponseAdapter({
  message: "Assess whether the certification statement is supported by the supplied page.",
  websiteContent: "# Security page\nExampleCo provides workflow services for operations teams.\nExampleCo is HIPAA certified.\nContact the team for details.",
  config,
  intentProvider: async () => ({ intent: {
    ...baseIntent,
    topic: "supplied-content-evidence",
    questionType: "positive_yes_no",
    followUpReferences: [],
    proposition: "The supplied page supports its HIPAA certification statement",
    requestedDetail: "support within the supplied content for its HIPAA certification statement",
  } }),
  providerAdapter: async () => ({ error: "provider_timeout" }),
});
assert.equal(suppliedClaimFallback.fallbackUsed, true);
assert.match(JSON.stringify(suppliedClaimFallback.analysis), /HIPAA/i);
assert.doesNotMatch(JSON.stringify(suppliedClaimFallback.analysis), /ISO certification/i);
assert.ok(suppliedClaimFallback.analysis.findings.some(({ issue }) => /cannot independently verify/i.test(issue)));

console.log("Theo conversation tests passed.");
