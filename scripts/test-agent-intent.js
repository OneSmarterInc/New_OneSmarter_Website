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


const atomic = (id, subject, predicate, object, polarity = "positive", epistemicStatus = "asserted", contextStatus) => ({
  id, subject, predicate, object, polarity, epistemicStatus,
  ...(contextStatus ? { contextStatus } : {}),
});
const compoundIntent = (overrides = {}) => intent({
  domain: "operations",
  topic: "report visibility",
  entities: ["portal", "dashboard"],
  proposition: "The portal exports reports but the dashboard does not show them",
  polarity: "mixed",
  questionType: "comparison",
  speechAct: "comparison_request",
  requestedDetail: "the difference between report export and visibility",
  atomicPropositions: [
    atomic("p1", "portal", "exports", "reports"),
    atomic("p2", "dashboard", "shows", "reports", "negative"),
  ],
  propositionRelations: [{ id: "r1", type: "contrast", sourcePropositionId: "p1", targetPropositionId: "p2" }],
  intentFocus: { operation: "compare", propositionIds: ["p1", "p2"], relationIds: ["r1"] },
  ...overrides,
});

assert.deepEqual(positiveResult.result.intent.atomicPropositions, []);
assert.deepEqual(positiveResult.result.intent.propositionRelations, []);
assert.deepEqual(positiveResult.result.intent.intentFocus, { operation: "clarify", propositionIds: [], relationIds: [] });

const compoundCases = [
  ["The portal exports reports, but the dashboard does not show them.", compoundIntent()],
  ["The reviewer can read the document, whereas the assistant cannot edit it.", compoundIntent({
    topic: "document permissions", entities: ["reviewer", "assistant", "document"],
    proposition: "The reviewer can read the document whereas the assistant cannot edit it",
    atomicPropositions: [atomic("p1", "reviewer", "read", "document"), atomic("p2", "assistant", "edit", "document", "negative")],
  })],
  ["How does the policy review differ from the content review?", compoundIntent({
    topic: "review comparison", entities: ["policy review", "content review"],
    proposition: "Policy review and content review differ", polarity: "unknown",
    atomicPropositions: [atomic("p1", "policy reviewer", "performs", "policy review", "unknown", "questioned"), atomic("p2", "content analyst", "performs", "content review", "unknown", "questioned")],
    propositionRelations: [{ id: "r1", type: "comparison", sourcePropositionId: "p1", targetPropositionId: "p2" }],
  })],
  ["The service does not approve invoices, but it does organize them for review.", compoundIntent({
    topic: "invoice workflow", entities: ["service", "invoices"],
    proposition: "The service does not approve invoices but organizes them for review",
    atomicPropositions: [atomic("p1", "service", "approve", "invoices", "negative"), atomic("p2", "service", "organize", "invoices for review")],
  })],
  ["The operations assistant cannot open our queue; could Priya, our coordinator, open it?", compoundIntent({
    topic: "queue permissions", entities: ["operations assistant", "Priya", "queue"], mentionedNames: ["Priya"],
    proposition: "The assistant cannot open the queue and Priya's ability is questioned",
    atomicPropositions: [atomic("p1", "operations assistant", "open", "customer queue", "negative"), atomic("p2", "Priya", "open", "customer queue", "unknown", "questioned")],
    propositionRelations: [{ id: "r1", type: "comparison", sourcePropositionId: "p1", targetPropositionId: "p2" }],
    intentFocus: { operation: "answer_proposition", propositionIds: ["p2"], relationIds: ["r1"] },
  })],
  ["If the assistant cannot change production records, does that restrict our administrator too?", compoundIntent({
    topic: "production permissions", entities: ["assistant", "administrator", "production records"],
    proposition: "Whether the assistant restriction implies an administrator restriction",
    atomicPropositions: [atomic("p1", "assistant", "change", "production records", "negative"), atomic("p2", "administrator", "change", "production records", "unknown", "questioned")],
    propositionRelations: [{ id: "r1", type: "implication_question", sourcePropositionId: "p1", targetPropositionId: "p2" }],
  })],
  ["I did not mean the analyst checks certification; I meant the compliance reader checks the wording.", compoundIntent({
    topic: "role correction", entities: ["analyst", "compliance reader"], questionType: "correction", speechAct: "correction",
    proposition: "The compliance reader checks wording rather than the analyst checking certification",
    atomicPropositions: [atomic("p1", "analyst", "checks", "certification", "negative", "corrected"), atomic("p2", "compliance reader", "checks", "wording", "positive", "corrected")],
    propositionRelations: [{ id: "r1", type: "correction", sourcePropositionId: "p1", targetPropositionId: "p2" }],
    intentFocus: { operation: "correct", propositionIds: ["p1", "p2"], relationIds: ["r1"] },
  })],
];
for (const [message, output] of compoundCases) {
  const resolved = await runWith(message, output, { allowedDomains: [output.domain] });
  assert.equal(resolved.result.ok, true, message);
  assert.equal(resolved.result.intent.atomicPropositions.length, 2, message);
  assert.equal(resolved.result.intent.visitorDisplayName, null, message);
}

const multiEntityFollowUp = compoundIntent({
  topic: "role responsibilities", entities: ["reviewer", "analyst"], questionType: "follow_up",
  followUpReferences: ["reviewer from prior turn", "analyst from prior turn"],
  propositionRelations: [{ id: "r1", type: "reference", sourcePropositionId: "p1", targetPropositionId: "p2" }],
  intentFocus: { operation: "explain_relationship", propositionIds: ["p1", "p2"], relationIds: ["r1"] },
});
const multiFollowUpResult = await runWith("Why can the reviewer do that while the analyst cannot?", multiEntityFollowUp, {
  allowedDomains: ["operations"], conversationHistory: [{ role: "user", content: "Compare the reviewer and analyst roles." }],
});
assert.equal(multiFollowUpResult.result.intent.atomicPropositions.length, 2);

const ambiguousCompound = compoundIntent({ confidence: 0.31, clarificationNeeded: true, questionType: "clarification", speechAct: "clarification_request", intentFocus: { operation: "clarify", propositionIds: [], relationIds: [] } });
const ambiguousCompoundResult = await runWith("Why can one do it while the other cannot?", ambiguousCompound, { allowedDomains: ["operations"] });
assert.equal(ambiguousCompoundResult.result.intent.clarificationNeeded, true);

const four = compoundIntent({
  atomicPropositions: [atomic("p1", "A", "reviews", "one"), atomic("p2", "B", "reviews", "two"), atomic("p3", "C", "reviews", "three"), atomic("p4", "D", "reviews", "four")],
  propositionRelations: [], intentFocus: { operation: "compare", propositionIds: ["p1", "p2", "p3", "p4"], relationIds: [] },
});
assert.equal(validateProviderAgentIntent(four).ok, true);
assert.equal(validateProviderAgentIntent({ ...four, atomicPropositions: [...four.atomicPropositions, atomic("p5", "E", "reviews", "five")] }).ok, false);
assert.equal(validateProviderAgentIntent({ ...compoundIntent(), propositionRelations: [...compoundIntent().propositionRelations, { id: "r2", type: "contrast", sourcePropositionId: "missing", targetPropositionId: "p1" }] }).ok, false);
assert.equal(validateProviderAgentIntent({ ...compoundIntent(), atomicPropositions: [atomic("p1", "A", "does", "one"), atomic("p1", "B", "does", "two")] }).ok, false);
assert.equal(validateProviderAgentIntent({ ...compoundIntent(), atomicPropositions: [atomic("p1", "A", "does", "one", "positive", "verified")] }).ok, false);
assert.equal(validateProviderAgentIntent({ ...compoundIntent(), evidence: ["invented fact"] }).ok, false);
assert.equal(validateProviderAgentIntent({ ...compoundIntent(), atomicPropositions: [{ ...compoundIntent().atomicPropositions[0], evidence: "invented" }, compoundIntent().atomicPropositions[1]] }).ok, false);

const fourRelations = {
  ...four,
  propositionRelations: [
    { id: "r1", type: "contrast", sourcePropositionId: "p1", targetPropositionId: "p2" },
    { id: "r2", type: "comparison", sourcePropositionId: "p2", targetPropositionId: "p3" },
    { id: "r3", type: "reference", sourcePropositionId: "p3", targetPropositionId: "p4" },
    { id: "r4", type: "correction", sourcePropositionId: "p4", targetPropositionId: "p1" },
  ],
  intentFocus: { operation: "compare", propositionIds: ["p1", "p2", "p3", "p4"], relationIds: ["r1", "r2", "r3", "r4"] },
};
assert.equal(validateProviderAgentIntent(fourRelations).ok, true);
assert.equal(validateProviderAgentIntent({ ...fourRelations, propositionRelations: [...fourRelations.propositionRelations, { id: "r5", type: "contrast", sourcePropositionId: "p1", targetPropositionId: "p2" }] }).ok, false);
assert.equal(validateProviderAgentIntent({ ...compoundIntent(), propositionRelations: [{ id: "r1", type: "verified_by", sourcePropositionId: "p1", targetPropositionId: "p2" }] }).ok, false);
assert.equal(validateProviderAgentIntent({ ...compoundIntent(), propositionRelations: [{ id: "r1", type: "contrast", sourcePropositionId: "p1", targetPropositionId: "p2" }, { id: "r1", type: "comparison", sourcePropositionId: "p2", targetPropositionId: "p1" }] }).ok, false);
assert.equal(validateProviderAgentIntent({ ...compoundIntent(), atomicPropositions: [atomic("p1", "x".repeat(161), "does", "work"), compoundIntent().atomicPropositions[1]] }).ok, false);

const malformedCompound = await runWith("Compare these two claims.", { ...compoundIntent(), propositionRelations: [{ id: "r1", type: "comparison", sourcePropositionId: "p1", targetPropositionId: "missing" }] }, { allowedDomains: ["operations"] });
assert.equal(malformedCompound.result.ok, false);
assert.equal(malformedCompound.result.error, "invalid_provider_intent");
assert.deepEqual(malformedCompound.result.intent.atomicPropositions, []);


const establishedFollowUp = compoundIntent({
  proposition: "Why the reviewer can approve the draft",
  questionType: "why", speechAct: "explanation_request", confidence: 0.97,
  atomicPropositions: [atomic("p1", "reviewer", "can approve", "draft", "positive", "questioned")],
  propositionRelations: [], intentFocus: { operation: "explain_proposition", propositionIds: ["p1"], relationIds: [] },
  followUpReferences: ["the established reviewer approval proposition"],
});
const establishedFollowUpResult = await runWith("Why can the reviewer approve it?", establishedFollowUp, {
  allowedDomains: ["operations"], conversationHistory: [{ role: "user", content: "The reviewer can approve the draft." }],
});
assert.equal(establishedFollowUpResult.result.intent.clarificationNeeded, false);

const unsupportedFollowUp = compoundIntent({
  proposition: "Why the reviewer can publish the draft",
  questionType: "why", speechAct: "explanation_request", confidence: 0.32, clarificationNeeded: true,
  atomicPropositions: [atomic("p1", "reviewer", "can publish", "draft", "unknown", "ambiguous", "not_established_in_history")],
  propositionRelations: [], intentFocus: { operation: "clarify", propositionIds: ["p1"], relationIds: [] },
  followUpReferences: ["an unestablished reviewer publishing proposition"],
});
const unsupportedFollowUpResult = await runWith("Why can the reviewer publish it?", unsupportedFollowUp, {
  allowedDomains: ["operations"], conversationHistory: [{ role: "user", content: "The reviewer can read the draft." }],
});
assert.equal(unsupportedFollowUpResult.result.intent.clarificationNeeded, true);
assert.equal(unsupportedFollowUpResult.result.intent.atomicPropositions[0].epistemicStatus, "ambiguous");

const twoEntityUnknown = compoundIntent({
  proposition: "Whether the coordinator can approve the draft",
  confidence: 0.38, clarificationNeeded: true,
  atomicPropositions: [atomic("p1", "coordinator", "can approve", "draft", "unknown", "ambiguous", "not_established_in_history")],
  propositionRelations: [], intentFocus: { operation: "clarify", propositionIds: ["p1"], relationIds: [] },
  followUpReferences: ["coordinator capability not established in history"],
});
const twoEntityUnknownResult = await runWith("What can the coordinator approve?", twoEntityUnknown, {
  allowedDomains: ["operations"], conversationHistory: [{ role: "user", content: "The reviewer can approve the draft, and the coordinator attended." }],
});
assert.equal(twoEntityUnknownResult.result.intent.clarificationNeeded, true);

const providerOverResolution = compoundIntent({
  proposition: "The reviewer can publish the draft", confidence: 0.99, clarificationNeeded: false,
  questionType: "why", speechAct: "explanation_request",
  atomicPropositions: [atomic("p1", "reviewer", "can publish", "draft", "positive", "questioned", "not_established_in_history")],
  propositionRelations: [], intentFocus: { operation: "explain_proposition", propositionIds: ["p1"], relationIds: [] },
});
const providerOverResolutionResult = await runWith("Why can the reviewer publish it?", providerOverResolution, {
  allowedDomains: ["operations"], conversationHistory: [{ role: "user", content: "The reviewer can read the draft." }],
});
assert.equal(providerOverResolutionResult.result.intent.confidence, 0.4);
assert.equal(providerOverResolutionResult.result.intent.clarificationNeeded, true);

const reportedAssertion = compoundIntent({
  proposition: "Alex says the reviewer approved the document",
  polarity: "positive", atomicPropositions: [atomic("p1", "reviewer", "approved", "document", "positive", "reported_assertion")],
  propositionRelations: [], intentFocus: { operation: "answer_proposition", propositionIds: ["p1"], relationIds: [] }, mentionedNames: ["Alex"],
});
assert.equal(validateProviderAgentIntent(reportedAssertion).ok, true);
assert.equal(reportedAssertion.atomicPropositions[0].epistemicStatus, "reported_assertion");

const reportedUnknown = compoundIntent({
  proposition: "Alex does not know whether the reviewer approved the document",
  polarity: "unknown", atomicPropositions: [atomic("p1", "reviewer", "approved", "document", "unknown", "reported_unknown")],
  propositionRelations: [], intentFocus: { operation: "answer_proposition", propositionIds: ["p1"], relationIds: [] }, mentionedNames: ["Alex"],
});
assert.equal(validateProviderAgentIntent(reportedUnknown).ok, true);

const twoAttributed = compoundIntent({
  proposition: "Alex says the reviewer approved X while Priya says the analyst rejected Y",
  atomicPropositions: [atomic("p1", "reviewer", "approved", "X", "positive", "reported_assertion"), atomic("p2", "analyst", "rejected", "Y", "positive", "reported_assertion")],
  mentionedNames: ["Alex", "Priya"],
});
assert.equal(validateProviderAgentIntent(twoAttributed).ok, true);
assert.ok(twoAttributed.atomicPropositions.every(({ epistemicStatus }) => epistemicStatus === "reported_assertion"));

const mixedStance = compoundIntent({
  atomicPropositions: [atomic("p1", "service", "organizes", "records", "positive", "asserted"), atomic("p2", "Alex", "approved", "review", "positive", "reported_assertion"), atomic("p3", "reviewer", "publishes", "draft", "positive", "hypothetical")],
  propositionRelations: [{ id: "r1", type: "comparison", sourcePropositionId: "p1", targetPropositionId: "p3" }],
  intentFocus: { operation: "compare", propositionIds: ["p1", "p2", "p3"], relationIds: ["r1"] },
});
assert.equal(validateProviderAgentIntent(mixedStance).ok, true);
assert.deepEqual(mixedStance.atomicPropositions.map(({ epistemicStatus }) => epistemicStatus), ["asserted", "reported_assertion", "hypothetical"]);
assert.match(buildAgentIntentProviderRequest({ agentIdentity: "Test", message: "Follow up", conversationHistory: [], allowedDomains: ["operations"] }).system, /Never infer a missing capability/i);
assert.match(buildAgentIntentProviderRequest({ agentIdentity: "Test", message: "Follow up", conversationHistory: [], allowedDomains: ["operations"] }).system, /reported_assertion/i);

console.log("Agent semantic intent tests passed.");
