import assert from "node:assert/strict";
import { runSeleneLocalEngine, retrieveSeleneKnowledge } from "../src/server/selene/seleneLocalEngine.js";

const intent = (topic, overrides = {}) => ({
  domain: "agent_architecture", topic, entities: ["OneSmarter"],
  proposition: `Explain ${topic}`, polarity: "positive", negationScope: [],
  questionType: "how", speechAct: "explanation_request", requestedDetail: topic,
  followUpReferences: [], confidence: 0.96, clarificationNeeded: false,
  mentionedNames: [], ...overrides,
});

for (const [topic, pattern] of [
  ["Selene Hart Professional Role", /AI Agent Architecture Strategist/i],
  ["OneSmarter Focused-Agent Architecture", /professional role|focused professional agents/i],
  ["Professional Agent Role Separation", /separate professional responsibilities/i],
  ["Canonical Knowledge and Evidence Boundary", /sole factual source|canonical professional content/i],
  ["Claim Validation and Fail-Closed Design", /approved evidence.*claim boundaries.*output validation/is],
  ["Professional and Café Separation", /separate from professional evidence/i],
  ["Café Review and Publication Gate", /published.*reviewer attribution/i],
  ["Current Orchestration and Future Collaboration Boundary", /not currently implemented/i],
  ["Operational State, Depletion, Energy, Café Restoration, and Factual Accuracy", /never (?:change )?facts|without changing factual accuracy/i],
]) {
  const value = runSeleneLocalEngine({ semanticIntent: intent(topic) });
  assert.match(value.answer, pattern, topic);
  assert.equal(value.matchedEntries.length, 1, topic);
  assert.deepEqual(runSeleneLocalEngine({ semanticIntent: intent(topic) }), value);
}

const negative = runSeleneLocalEngine({ semanticIntent: intent(
  "Current Orchestration and Future Collaboration Boundary",
  { proposition: "Agents do not collaborate autonomously", polarity: "negative", questionType: "negative_confirmation" },
) });
assert.match(negative.answer, /not currently implemented|does not establish/i);
assert.match(negative.answer, /^(?:Yes|Correct)/i);

const uncertain = runSeleneLocalEngine({ semanticIntent: { clarificationNeeded: true } });
assert.equal(uncertain.clarificationNeeded, true);
assert.equal(uncertain.matchedEntries.length, 0);
assert.deepEqual(retrieveSeleneKnowledge("seasonal rainfall forecast"), []);

const retrievalCases = [
  ["review publication gate", "cafe-review-and-publication-gate"],
  ["content review before publication", "cafe-review-and-publication-gate"],
  ["claim validation and unsupported statements", "claim-validation-and-fail-closed-design"],
  ["output validation fails closed", "claim-validation-and-fail-closed-design"],
  ["canonical knowledge evidence boundary", "canonical-knowledge-boundary"],
  ["unsupported answers without approved evidence", "canonical-knowledge-boundary"],
  ["Mira and Theo have separate professional responsibilities", "professional-agent-role-separation"],
  ["different professional agent responsibilities", "professional-agent-role-separation"],
  ["operational state and factual accuracy", "operational-state-vs-factual-accuracy"],
  ["depletion response accuracy", "operational-state-vs-factual-accuracy"],
  ["Why does one of your agents get tired?", "operational-state-vs-factual-accuracy"],
  ["Does a tired agent give wrong answers?", "operational-state-vs-factual-accuracy"],
  ["How does Café time refresh an agent's energy?", "operational-state-vs-factual-accuracy"],
  ["Can an agent stay accurate while sounding more concise?", "operational-state-vs-factual-accuracy"],
];
for (const [query, expectedId] of retrievalCases) {
  const matches = retrieveSeleneKnowledge(query);
  assert.equal(matches[0]?.id, expectedId, query);
}

for (const [message, topic, expectedId] of [
  ["What is a review gate?", "Café Review and Publication Gate", "cafe-review-and-publication-gate"],
  ["Why are review checkpoints important?", "Café Review and Publication Gate", "cafe-review-and-publication-gate"],
  ["How does content approval work?", "Café Review and Publication Gate", "cafe-review-and-publication-gate"],
  ["How do you stop agents making false claims?", "Claim Validation and Fail-Closed Design", "claim-validation-and-fail-closed-design"],
  ["How are unsupported answers prevented?", "Claim Validation and Fail-Closed Design", "claim-validation-and-fail-closed-design"],
  ["What happens when validation fails?", "Claim Validation and Fail-Closed Design", "claim-validation-and-fail-closed-design"],
  ["What happens when an agent does not know something?", "Canonical Knowledge and Evidence Boundary", "canonical-knowledge-boundary"],
  ["How do agents handle uncertainty?", "Canonical Knowledge and Evidence Boundary", "canonical-knowledge-boundary"],
  ["How do you prevent unsupported answers?", "Canonical Knowledge and Evidence Boundary", "canonical-knowledge-boundary"],
  ["Why use separate agents instead of one?", "OneSmarter Focused-Agent Architecture", "agent-architecture-overview"],
  ["Why not use one general chatbot?", "OneSmarter Focused-Agent Architecture", "agent-architecture-overview"],
  ["Why have different professional agents?", "Professional Agent Role Separation", "professional-agent-role-separation"],
  ["Why does one of your agents get tired?", "Operational State, Depletion, Energy, Café Restoration, and Factual Accuracy", "operational-state-vs-factual-accuracy"],
  ["What is depletion?", "Operational State, Depletion, Energy, Café Restoration, and Factual Accuracy", "operational-state-vs-factual-accuracy"],
  ["Does a tired agent give wrong answers?", "Operational State, Depletion, Energy, Café Restoration, and Factual Accuracy", "operational-state-vs-factual-accuracy"],
  ["Does depletion reduce accuracy?", "Operational State, Depletion, Energy, Café Restoration, and Factual Accuracy", "operational-state-vs-factual-accuracy"],
  ["What happens during depletion?", "Operational State, Depletion, Energy, Café Restoration, and Factual Accuracy", "operational-state-vs-factual-accuracy"],
]) {
  const value = runSeleneLocalEngine({ message, semanticIntent: intent(topic, {
    proposition: message,
    requestedDetail: message,
    questionType: "why",
  }) });
  assert.equal(value.matchedEntries[0]?.id, expectedId, message);
  assert.doesNotMatch(value.answer, /What would you like to review/i, message);
}

console.log("Selene local-engine tests passed.");
