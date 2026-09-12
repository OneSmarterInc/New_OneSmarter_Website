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
  ["Operational State and Factual Accuracy", /never (?:change )?facts|without changing factual accuracy/i],
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
assert.deepEqual(retrieveSeleneKnowledge("not a canonical topic title"), []);

console.log("Selene local-engine tests passed.");
