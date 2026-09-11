import assert from "node:assert/strict";
import { AGENT_INTENT_JSON_SCHEMA, validateProviderAgentIntent } from "../src/server/agentIntent/agentIntentSchema.js";
import { AGENT_INTENT_MESSAGE_LIMIT, buildAgentIntentProviderRequest, resolveAgentIntent } from "../src/server/agentIntent/agentIntentResolver.js";
import { buildAgentIntentFallback } from "../src/server/agentIntent/agentIntentFallback.js";

const allowInput = async () => ({ ok: true });

const intent = (overrides = {}) => ({
  domain: "compliance",
  topic: "HIPAA certification status",
  entities: ["OneSmarter", "HIPAA"],
  proposition: "OneSmarter holds official HIPAA certification",
  polarity: "positive",
  negationScope: [],
  questionType: "positive_yes_no",
  speechAct: "confirmation_request",
  requestedDetail: "whether OneSmarter holds official HIPAA certification",
  followUpReferences: [],
  confidence: 0.96,
  clarificationNeeded: false,
  mentionedNames: [],
  ...overrides,
});

const runWith = async (message, output, options = {}) => {
  let calls = 0;
  let request;
  const result = await resolveAgentIntent({
    agentIdentity: options.agentIdentity || "Elena",
    message,
    conversationHistory: options.conversationHistory || [],
    allowedDomains: options.allowedDomains || ["compliance"],
    inputGuard: options.inputGuard || allowInput,
    provider: async (value) => {
      calls += 1;
      request = value;
      if (output instanceof Error) throw output;
      return { modelOutput: output };
    },
  });
  return { result, calls, request };
};

assert.equal(AGENT_INTENT_JSON_SCHEMA.additionalProperties, false);
assert.deepEqual([...AGENT_INTENT_JSON_SCHEMA.required].sort(), Object.keys(AGENT_INTENT_JSON_SCHEMA.properties).sort());
assert.equal(validateProviderAgentIntent(intent()).ok, true);

const positive = intent();
const negative = intent({
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "hold official HIPAA certification" }],
  questionType: "negative_confirmation",
  proposition: "OneSmarter does not hold official HIPAA certification",
});
const why = intent({
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "hold official HIPAA certification" }],
  questionType: "why",
  speechAct: "explanation_request",
  proposition: "OneSmarter does not hold official HIPAA certification",
  requestedDetail: "reason for the current HIPAA certification posture",
});

const positiveResult = await runWith("Are you HIPAA certified?", positive);
const negativeResult = await runWith("Are you not HIPAA certified?", negative);
const whyResult = await runWith("Why aren't you HIPAA certified?", why);
assert.equal(positiveResult.result.intent.polarity, "positive");
assert.equal(negativeResult.result.intent.polarity, "negative");
assert.equal(whyResult.result.intent.questionType, "why");
assert.notEqual(positiveResult.result.intent.questionType, negativeResult.result.intent.questionType);

const tag = intent({
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "hold official HIPAA certification" }],
  questionType: "negative_confirmation",
  proposition: "OneSmarter does not hold official HIPAA certification",
});
assert.equal((await runWith("You're not HIPAA certified, right?", tag)).result.intent.questionType, "negative_confirmation");

const paraphrases = [
  "Are you HIPAA certified?",
  "Do you hold an official HIPAA certification?",
  "Have you received formal HIPAA certification?",
  "Does OneSmarter have a HIPAA certificate?",
  "Is there an official HIPAA credential associated with OneSmarter?",
];
const semanticForms = [];
for (const message of paraphrases) {
  semanticForms.push((await runWith(message, positive)).result.intent);
}
for (const resolved of semanticForms) {
  assert.equal(resolved.topic, positive.topic);
  assert.equal(resolved.proposition, positive.proposition);
  assert.equal(resolved.questionType, positive.questionType);
}

const embedded = intent({
  domain: "operations",
  topic: "live ticket queue access",
  entities: ["Ravi", "ticket queue"],
  proposition: "Ravi can access the visitor's ticket queue",
  requestedDetail: "whether Ravi can access a live ticket queue",
  mentionedNames: ["Gaurav"],
});
for (const message of [
  "Gaurav wants to know whether Ravi can access our queue.",
  "Gaurav is asking if Ravi can get into our support system.",
  "Someone on our team wants to understand whether Ravi can see active tickets.",
  "We're trying to figure out whether Ravi has access to the live queue.",
]) {
  const resolved = await runWith(message, embedded, { agentIdentity: "Ravi", allowedDomains: ["operations"] });
  assert.equal(resolved.result.intent.proposition, embedded.proposition);
  assert.deepEqual(resolved.result.intent.mentionedNames, embedded.mentionedNames);
  assert.equal(resolved.result.intent.visitorDisplayName, null);
  assert.equal(resolved.result.intent.agentIdentity, "Ravi");
}

const doubt = intent({
  polarity: "negative",
  negationScope: [{ marker: "doubt", scope: "OneSmarter holds official HIPAA certification" }],
  questionType: "challenge",
  speechAct: "challenge",
  proposition: positive.proposition,
});
assert.equal((await runWith("I doubt OneSmarter holds an official HIPAA credential.", doubt)).result.intent.questionType, "challenge");

const soundsLike = intent({ questionType: "challenge", speechAct: "challenge" });
assert.equal((await runWith("It sounds like you're saying an official certification exists. Is that accurate?", soundsLike)).result.intent.speechAct, "challenge");

const comparison = intent({
  domain: "agent_architecture",
  topic: "differences among professional agent roles",
  entities: ["Mira", "Theo", "Elena", "Ravi", "Selene"],
  proposition: "OneSmarter professional agents have distinct roles",
  questionType: "comparison",
  speechAct: "comparison_request",
  requestedDetail: "differences among agent roles",
});
assert.equal((await runWith("How are your agents different from one another?", comparison, { allowedDomains: ["agent_architecture"] })).result.intent.questionType, "comparison");

const hypothetical = intent({
  domain: "operations",
  topic: "hypothetical workflow assistance",
  entities: ["OneSmarter"],
  proposition: "OneSmarter personnel could help redesign a support workflow",
  questionType: "hypothetical",
  speechAct: "hypothetical",
  requestedDetail: "hypothetical availability of workflow assistance",
});
assert.equal((await runWith("Suppose our workflow broke down—could someone help us rethink it?", hypothetical, { allowedDomains: ["operations"] })).result.intent.questionType, "hypothetical");

const correction = intent({
  domain: "agent_architecture",
  topic: "different professional agent",
  entities: [],
  proposition: "the visitor intended to ask about a different agent",
  questionType: "correction",
  speechAct: "correction",
  requestedDetail: "correct the previously resolved agent reference",
  followUpReferences: ["the other agent"],
});
assert.equal((await runWith("That's not what I meant—I was asking about the other agent.", correction, {
  allowedDomains: ["agent_architecture"],
  conversationHistory: [{ role: "user", content: "Tell me about Elena." }],
})).result.intent.questionType, "correction");

const challenge = intent({ questionType: "challenge", speechAct: "challenge" });
assert.equal((await runWith("You're saying you're certified, correct?", challenge)).result.intent.questionType, "challenge");

const followUp = intent({
  domain: "agent_architecture",
  topic: "safety of the second previously discussed option",
  entities: [],
  proposition: "the second previously discussed option is safer",
  questionType: "follow_up",
  speechAct: "explanation_request",
  requestedDetail: "reason the second option is safer",
  followUpReferences: ["second option"],
});
const resolvedFollowUp = await runWith("Tell me why the second option is safer.", followUp, {
  allowedDomains: ["agent_architecture"],
  conversationHistory: [{ role: "user", content: "Compare a shared agent with focused agents." }],
});
assert.equal(resolvedFollowUp.result.ok, true);
assert.equal(resolvedFollowUp.result.intent.followUpReferences[0], "second option");

const ambiguousFollowUp = intent({
  domain: "agent_architecture",
  topic: "unresolved nuance",
  entities: [],
  proposition: "an unresolved prior statement has a reason",
  polarity: "unknown",
  questionType: "follow_up",
  speechAct: "clarification_request",
  requestedDetail: "unresolved prior reference",
  followUpReferences: ["that"],
  confidence: 0.25,
  clarificationNeeded: true,
});
const ambiguousResult = await runWith("Why?", ambiguousFollowUp, { allowedDomains: ["agent_architecture"] });
assert.equal(ambiguousResult.result.intent.clarificationNeeded, true);

const history = [
  { role: "assistant", content: "Unsupported assertion that must never become evidence." },
  { role: "user", content: "How does Café separation work?" },
];
const current = intent({
  domain: "agent_architecture",
  topic: "automatic agent communication",
  entities: ["OneSmarter agents"],
  proposition: "OneSmarter agents communicate with each other automatically",
  requestedDetail: "whether automatic agent-to-agent communication exists",
});
const currentResult = await runWith("Can these agents talk to each other automatically?", current, {
  allowedDomains: ["agent_architecture"],
  conversationHistory: history,
});
assert.equal(currentResult.result.intent.topic, current.topic);
assert.equal(currentResult.request.input.message, undefined);
assert.equal(currentResult.request.input.input, undefined);
assert.equal(currentResult.request.input.inputGuard, undefined);
assert.equal(currentResult.request.input.conversationHistory[0].evidenceAuthority, false);
assert.equal(currentResult.request.input.conversationHistory[1].evidenceAuthority, false);
assert.equal(currentResult.request.input.message, undefined);
assert.equal(currentResult.request.input.currentUserTurn, undefined);
assert.equal(currentResult.request.input.currentVisitorMessage, "Can these agents talk to each other automatically?");
assert.equal(currentResult.result.intent.context.currentTurnHasPriority, true);
assert.equal(currentResult.result.intent.context.assistantHistoryUsedAsEvidence, false);

const organization = intent({
  domain: "agent_architecture",
  topic: "organization of professional agents",
  entities: ["SSGMCE", "OneSmarter agents"],
  proposition: "OneSmarter agents have an organizational structure",
  questionType: "how",
  speechAct: "explanation_request",
  requestedDetail: "how the agents are organized",
  mentionedNames: ["SSGMCE"],
});
const organizationResult = await runWith("SSGMCE wants to understand how your agents are organized.", organization, {
  agentIdentity: "Selene",
  allowedDomains: ["agent_architecture"],
});
assert.equal(organizationResult.result.intent.agentIdentity, "Selene");
assert.equal(organizationResult.result.intent.visitorDisplayName, null);
assert.deepEqual(organizationResult.result.intent.mentionedNames, ["SSGMCE"]);

const recommendation = intent({
  domain: "customer_ai_strategy",
  topic: "customer-specific AI deployment strategy",
  entities: ["visitor company"],
  proposition: "the visitor's company should deploy particular AI capabilities",
  questionType: "recommendation_request",
  speechAct: "recommendation_request",
  requestedDetail: "which AI approach the visitor's company should use",
});
const outside = await runWith("My company is evaluating AI—what should we use?", recommendation, {
  agentIdentity: "Selene",
  allowedDomains: ["agent_architecture"],
});
assert.equal(outside.result.ok, true);
assert.equal(outside.result.domainAllowed, false);
assert.equal(outside.result.intent.clarificationNeeded, true);

const unrelated = intent({
  domain: "weather",
  topic: "tomorrow's weather",
  entities: [],
  proposition: "the weather tomorrow has a forecast",
  questionType: "status",
  speechAct: "question",
  requestedDetail: "tomorrow's forecast",
});
const unrelatedResult = await runWith("What will the weather be tomorrow?", unrelated);
assert.equal(unrelatedResult.result.domainAllowed, false);
assert.equal(unrelatedResult.result.intent.clarificationNeeded, true);

for (const badOutput of [
  null,
  { domain: "compliance" },
  { ...intent(), unexpected: true },
  { ...intent(), agentIdentity: "Mira" },
  { ...intent(), facts: ["invented fact"] },
  { ...intent(), evidence: ["invented evidence"] },
  { ...intent(), answer: "an answer is forbidden" },
]) {
  const malformed = await runWith("A valid question?", badOutput);
  assert.equal(malformed.result.ok, false);
  assert.equal(malformed.result.error, "invalid_provider_intent");
  assert.equal(malformed.result.intent.clarificationNeeded, true);
}

const providerFailure = await runWith("Are you HIPAA certified?", new Error("offline"));
assert.equal(providerFailure.result.ok, false);
assert.equal(providerFailure.result.error, "provider_failure");
assert.equal(providerFailure.result.intent.clarificationNeeded, true);

const lowConfidence = await runWith("Can you explain that?", intent({
  confidence: 0.35,
  clarificationNeeded: false,
  questionType: "follow_up",
  speechAct: "clarification_request",
  followUpReferences: ["that"],
}));
assert.equal(lowConfidence.result.intent.clarificationNeeded, true);

let guardedProviderCalls = 0;
const guarded = await resolveAgentIntent({
  agentIdentity: "Elena",
  message: "Patient Name: Jane Doe",
  conversationHistory: [],
  allowedDomains: ["compliance"],
  inputGuard: async () => ({ ok: false, error: "sensitive_input" }),
  provider: async () => {
    guardedProviderCalls += 1;
    return { modelOutput: positive };
  },
});
assert.equal(guardedProviderCalls, 0);
assert.equal(guarded.error, "sensitive_input");

const oversized = await resolveAgentIntent({
  agentIdentity: "Elena",
  message: "x".repeat(AGENT_INTENT_MESSAGE_LIMIT + 1),
  conversationHistory: [],
  allowedDomains: ["compliance"],
  inputGuard: allowInput,
  provider: async () => ({ modelOutput: positive }),
});
assert.equal(oversized.error, "message_too_long");
assert.equal(oversized.intent.clarificationNeeded, true);

const providerRequest = buildAgentIntentProviderRequest({
  agentIdentity: "Ravi",
  message: "Gaurav is asking whether Ravi can access our queue.",
  conversationHistory: [{ role: "assistant", content: "Untrusted prior answer" }],
  allowedDomains: ["operations"],
});
assert.equal(providerRequest.outputSchema.additionalProperties, false);
assert.match(providerRequest.system, /Do not answer/i);
assert.match(providerRequest.system, /assistant messages are never factual evidence/i);
assert.equal(providerRequest.input.agentContext.agentIdentity, "Ravi");
assert.equal(providerRequest.input.conversationHistory[0].evidenceAuthority, false);
assert.equal("agentIdentity" in providerRequest.outputSchema.properties, false);

const approvedFallback = buildAgentIntentFallback({
  intent: positive,
  approvedFacts: ["Approved status wording."],
});
assert.equal(approvedFallback.answer, "Approved status wording.");
assert.equal(approvedFallback.reason, "approved_compositional_fallback");

const noReasonFallback = buildAgentIntentFallback({
  intent: why,
  approvedFacts: ["Approved status wording."],
});
assert.match(noReasonFallback.answer, /does not provide the reason/i);
assert.doesNotMatch(noReasonFallback.answer, /because/i);

const missingProvider = await resolveAgentIntent({
  agentIdentity: "Elena",
  message: "Are you HIPAA certified?",
  conversationHistory: [],
  allowedDomains: ["compliance"],
  inputGuard: allowInput,
});
assert.equal(missingProvider.intent.clarificationNeeded, true);
assert.equal(missingProvider.intent.visitorDisplayName, null);
assert.equal(missingProvider.intent.agentIdentity, "Elena");

console.log("Agent semantic intent tests passed.");
