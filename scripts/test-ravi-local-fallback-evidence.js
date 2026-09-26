import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { raviApprovedKnowledge as kb } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { runRaviLocalEngine } from "../src/server/ravi/raviLocalEngine.js";
import { prepareRaviDeterministicFallback } from "../src/server/ravi/raviDeterministicFallback.js";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { validateRaviModelOutput } from "../src/server/ravi/raviOutputValidator.js";

const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, maxTokens: 3000, timeoutMs: 20000 };
const record = id => kb.find(entry => entry.id === id);
const platform = record("secure-ticketing-case-management");
const role = record("ravi-professional-role");
const claims = record("claims-processing-services");
const output = answer => ({ answer, handoffNeeded: false, handoffReason: null,
  suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed" });
const intent = (message, topic, extra = {}) => ({ domain: "operations", topic, entities: ["operational process"],
  proposition: message, requestedDetail: "general process guidance", questionType: "how",
  speechAct: "recommendation_request", polarity: "positive", negationScope: [], followUpReferences: [],
  confidence: 0.99, clarificationNeeded: false, mentionedNames: [], atomicPropositions: [], propositionRelations: [],
  intentFocus: { operation: "clarify", propositionIds: [], relationIds: [] }, ...extra });
const plan = entry => ({ requestKind: "general_guidance", evidenceIds: [`${entry.id}:summary`],
  coverage: "partial", subjectsPreserved: true, qualificationsPreserved: true });
const routing = "How should routing and escalation handoffs be designed?";
const modernization = "How can claims workflows be modernized?";

// Reproduce the missing source, not just a provider exception. The engine's
// existing qualified answer is grounded in the platform, not the role label.
const roleIntent = intent(routing, role.title);
const original = runRaviLocalEngine({ semanticIntent: roleIntent });
assert.equal(original.claimEvaluation.status, "ALLOW_WITH_QUALIFICATION");
assert.deepEqual(original.matchedEntries.map(entry => entry.id), [role.id]);
assert.equal(validateRaviModelOutput(output(original.answer), { matchedEntries: original.matchedEntries }).valid, false);
const recovered = prepareRaviDeterministicFallback({ semanticIntent: roleIntent, allowed: true, selection: plan(role) });
assert.equal(recovered.answer, original.answer);
assert.deepEqual(recovered.sources.map(source => source.id), [platform.id]);
assert.equal(validateRaviModelOutput(output(recovered.answer), { matchedEntries: recovered.matchedEntries }).valid, true);

// Matching is by normalized canonical label or approved IDs, never visitor text.
for (const topic of [claims.id, claims.title.toLowerCase(), `  ${claims.title.toUpperCase()}  `]) {
  const result = prepareRaviDeterministicFallback({ semanticIntent: intent(modernization, topic), allowed: true });
  assert.ok(result.answer.startsWith(claims.approvedSummary));
  assert.deepEqual(result.sources.map(source => source.id), [claims.id]);
}
const generic = intent(modernization, "Operations");
assert.equal(prepareRaviDeterministicFallback({ semanticIntent: generic, allowed: true }), null);
for (const selection of [{ ...plan(claims), evidenceIds: ["invented"] },
  { ...plan(claims), subjectsPreserved: false }, { ...plan(claims), qualificationsPreserved: false }]) {
  assert.equal(prepareRaviDeterministicFallback({ semanticIntent: generic, selection, allowed: true }), null);
}
const selected = prepareRaviDeterministicFallback({ semanticIntent: generic, selection: plan(claims), allowed: true });
assert.ok(selected.answer.startsWith(claims.approvedSummary));
assert.deepEqual(selected.sources.map(source => source.id), [claims.id]);

// Removing the actual supporting record must still fail normal grounding.
const saved = { approvedSummary: platform.approvedSummary, sourceFacts: platform.sourceFacts, allowedClaims: platform.allowedClaims };
try {
  Object.assign(platform, { approvedSummary: "", sourceFacts: [], allowedClaims: [] });
  assert.equal(prepareRaviDeterministicFallback({ semanticIntent: roleIntent, selection: plan(role), allowed: true }), null);
} finally { Object.assign(platform, saved); }

const variants = [
  [routing, role, platform], ["Describe a sensible escalation and handoff design.", role, platform],
  [modernization, claims, claims], ["What support can modernize claims operations?", claims, claims],
];
const counts = { sessions: 0, semantic: 0, generation: 0, review: 0, repair: 0 };
const start = performance.now();
for (const [message, selectedEntry, expectedSource] of variants) for (let run = 0; run < 20; run++) {
  const resolved = intent(message, selectedEntry === role ? role.title : "Operations");
  const result = await runRaviResponseAdapter({ message, config,
    intentProvider: async () => { counts.semantic++; return { intent: { semanticIntent: resolved, approvedAnswerSelection: plan(selectedEntry) } }; },
    providerAdapter: async () => { counts.generation++; assert.fail("No uncited generation for evidence plans"); },
    evidenceProvider: async request => {
      counts.review++;
      if (request.input.validationFeedback) counts.repair++;
      if (run % 3 === 1) throw Error("intent_provider_incomplete");
      const rejected = run % 3 === 0 ? "OneSmarter integrates with InventedVendor." : "I can change your routing rules.";
      return { intent: { ...output(rejected), citations: [{ evidenceId: `${selectedEntry.id}:summary` }] } };
    },
  });
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.clarificationNeeded, false);
  assert.deepEqual(result.sources.map(source => source.id), [expectedSource.id]);
  assert.equal(validateRaviModelOutput(output(result.answer), { matchedEntries: result.matchedEntries }).valid, true);
  assert.equal(result.answer.includes("I couldn't verify"), false);
  if (expectedSource === platform) assert.equal(result.answer, original.answer);
  else assert.ok(result.answer.startsWith(claims.approvedSummary));
  counts.sessions++;
}
assert.deepEqual(counts, { sessions: 80, semantic: 80, generation: 0, review: 80, repair: 0 });
for (const extra of [{ questionType: "comparison" }, { questionType: "why" }, { polarity: "negative" },
  { questionType: "positive_yes_no", entities: ["another employee"] }, { clarificationNeeded: true }]) {
  assert.equal(prepareRaviDeterministicFallback({ semanticIntent: intent(routing, role.title, extra), selection: plan(role), allowed: true }), null);
}
console.log(JSON.stringify({ fixtureOnly: true, ...counts, elapsedMs: performance.now() - start }));
console.log("Ravi local fallback evidence PASS: role/evidence mismatch, semantic source IDs, canonical labels, mandatory grounding, repeated failure retention, and safety guards.");
