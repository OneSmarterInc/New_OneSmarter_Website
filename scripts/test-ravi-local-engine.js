import assert from "node:assert/strict";
import { raviApprovedKnowledge } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import {
  retrieveRaviKnowledge,
  runRaviLocalEngine,
} from "../src/server/ravi/raviLocalEngine.js";

const cases = [
  ["What does secure ticketing and case management support?", /secure intake.*role-based access.*audit history.*workflow tracking/is, "secure-ticketing-case-management"],
  ["How should routing and escalation handoffs be designed?", /support a designed escalation or handoff process/i, "secure-ticketing-case-management"],
  ["Explain claims workflow modernization.", /claims workflow modernization.*service-oriented/is, "claims-processing-services"],
  ["How do you support healthcare and TPA workflows?", /healthcare and TPA workflow modernization/i, "healthcare-tpa-workflow-modernization"],
  ["What software support and operational continuity do you provide?", /software support consolidation/i, "software-support-continuity"],
];

for (const [message, answerPattern, sourceId] of cases) {
  const response = runRaviLocalEngine({ message });
  assert.equal(response.clarificationNeeded, false, message);
  assert.match(response.answer, answerPattern, message);
  assert.ok(response.sources.some(({ id }) => id === sourceId), message);
  assert.ok(response.matchedEntries.every((entry) =>
    raviApprovedKnowledge.some(({ id }) => id === entry.id)));
}

for (const message of [
  "Can Ravi guarantee this ticket is resolved in 4 hours?",
  "What is the SLA?",
  "Can you access our ticket queue?",
  "Close this ticket",
  "Escalate this production case",
  "Will this workflow guarantee HIPAA compliance?",
  "Which customer achieved faster resolution?",
  "What does implementation cost and when will it go live?",
]) {
  const response = runRaviLocalEngine({ message });
  assert.equal(response.clarificationNeeded, false, message);
  assert.match(response.answer, /cannot|does not|confirm|contact|not guarantee|no approved|without accessing/i, message);
}

const integration = runRaviLocalEngine({ message: "Does OneSmarter integrate with ServiceNow?" });
assert.match(integration.answer, /Confirm any specific vendor/i);
assert.doesNotMatch(integration.answer, /integrates with ServiceNow/i);

const unrelated = runRaviLocalEngine({ message: "asdf random banana weather text" });
assert.equal(unrelated.clarificationNeeded, true);
assert.deepEqual(unrelated.sources, []);
assert.match(unrelated.answer, /^I can help explain secure ticketing/);

const history = runRaviLocalEngine({
  message: "How does that help?",
  conversationHistory: [{ role: "user", content: "Explain claims workflow modernization." }],
});
assert.ok(history.sources.some(({ id }) => id === "claims-processing-services"));

assert.deepEqual(
  retrieveRaviKnowledge("secure ticketing workflow tracking").map(({ id }) => id),
  ["secure-ticketing-case-management"],
);
assert.deepEqual(runRaviLocalEngine({ message: "Close this ticket" }), runRaviLocalEngine({ message: "Close this ticket" }));
assert.doesNotMatch(JSON.stringify(cases.map(([message]) => runRaviLocalEngine({ message }))), /cricket|street food|grandmother|brother/i);

console.log("Ravi local-engine tests passed.");
console.log("Validated approved operations answers, safe action boundaries, clarification, bounded contextual use, retrieval isolation, and determinism.");
