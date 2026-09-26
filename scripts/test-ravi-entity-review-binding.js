import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { validateRaviModelOutput } from "../src/server/ravi/raviOutputValidator.js";
import { resolveRaviEvidenceAnswer } from "../src/server/ravi/raviSemanticEvidence.js";
import { raviApprovedKnowledge as kb } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { resolveRaviEvidenceIds } from "../src/server/ravi/raviEvidenceCatalog.js";

const config = { maxTokens: 3000, timeoutMs: 20000 };
const ids = ["claims-processing-services", "healthcare-tpa-workflow-modernization", "enterprise-workflow-tools",
  "software-support-continuity", "ravi-professional-role"];
const entries = kb.filter(entry => ids.includes(entry.id));
const citations = ids.map(id => ({ evidenceId: `${id}:summary` }));
const productionPlan = { evidenceIds: ["claims-processing-services:summary", ...[1, 2, 3, 4].map(index => `claims-processing-services:claim:${index}`)] };
assert.equal(resolveRaviEvidenceIds(productionPlan.evidenceIds).length, 5);
const output = answer => ({ answer, handoffNeeded: false, handoffReason: null, suggestedFollowUps: [],
  groundingStatus: "grounded", outputSafetyStatus: "passed" });
const input = { message: "Explain supported operational improvements.", conversationHistory: [],
  semanticIntent: { entities: ["OneSmarter"] }, allowed: true, candidate: null };
const prose = ["Consider", "Explore", "Assess", "Examine", "Evaluate"];
const claims = [
  "Consider claims workflow modernization and claims technology support.",
  "Explore member and provider portals with legacy data integration.",
  "Assess reporting and operational visibility.",
  "Examine maintenance, enhancements, issue resolution, documentation and knowledge transfer.",
  "Evaluate custom applications, dashboards and workflow tools.",
];
const candidate = output(claims.join("\n\n"));
const review = { answer: candidate.answer, ordinaryProse: prose, entities: [] };
assert.ok(validateRaviModelOutput(candidate, { matchedEntries: entries }).violations.includes("unsupported_named_entity"));
const validated = validateRaviModelOutput(candidate, { matchedEntries: entries, reviewedCandidate: candidate, entityReview: review });
assert.equal(validated.valid, true);
assert.equal(validated.correctedOutput.answer, claims.join(" "));

// Cross source propositions, varied ordinary prose, and formatting. Nothing in
// production recognizes these example prefixes or these questions specially.
const examples = [
  ["claims-processing-services", "claims workflow modernization and claims technology support", "member and provider portals with legacy data integration"],
  ["enterprise-workflow-tools", "custom applications, portals, dashboards and integrations", "workflow tools and secure operations"],
  ["healthcare-tpa-workflow-modernization", "workflow modernization and secure operational systems", "reporting, data integration and support"],
  ["secure-ticketing-case-management", "role-based access and workflow tracking", "audit history and controlled communication for accountable issue resolution"],
  ["secure-ticketing-case-management", "secure intake and role-based access", "workflow tracking and accountable issue resolution"],
  ["secure-ticketing-case-management", "audit history and workflow tracking", "controlled communication and accountable issue resolution"],
];
let checked = 0;
for (const [id, first, second] of examples) for (const prefix of prose) for (const gap of ["\n", "\n\n", "\r\n", "\t", "   "]) {
  const answer = `${prefix} ${first}.${gap}${prefix} ${second}.`;
  const envelope = output(answer);
  const entityReview = { answer, ordinaryProse: [prefix], entities: [] };
  const result = validateRaviModelOutput(envelope, { matchedEntries: kb.filter(entry => entry.id === id),
    reviewedCandidate: envelope, entityReview });
  assert.equal(result.valid, true, `${id}: ${prefix}: ${JSON.stringify(result.violations)}`);
  checked++;
}

// Normalized formatting equality authorizes no changed proposition or subject.
for (const changed of [candidate.answer.replace("claims workflow", "loan workflow"),
  `${candidate.answer}\nAcmeVendor supports claims technology.`, candidate.answer.toLowerCase()]) {
  const result = validateRaviModelOutput(candidate, { matchedEntries: entries,
    reviewedCandidate: output(changed), entityReview: review });
  assert.equal(result.valid, false);
}
assert.equal(validateRaviModelOutput(candidate, { matchedEntries: entries,
  reviewedCandidate: null, entityReview: review }).valid, false, "A fresh answer cannot self-certify ordinary prose");

const unsupported = output("Explore AcmeVendor claims workflows.\nConsider claims technology support.");
const unsupportedReview = { answer: unsupported.answer, ordinaryProse: ["Explore", "Consider"], entities: [] };
assert.ok(validateRaviModelOutput(unsupported, { matchedEntries: entries, reviewedCandidate: unsupported,
  entityReview: unsupportedReview }).violations.includes("unsupported_named_entity"));
assert.equal(validateRaviModelOutput(unsupported, { matchedEntries: entries, reviewedCandidate: unsupported,
  visitorSuppliedEntities: ["AcmeVendor"], entityReview: { ...unsupportedReview, ordinaryProse: ["Explore", "Consider", "AcmeVendor"] } }).valid, false);
assert.equal(validateRaviModelOutput(unsupported, { matchedEntries: entries, reviewedCandidate: unsupported,
  entityReview: { ...unsupportedReview, entities: [{ text: "AcmeVendor", entryId: entries[0].id, quote: entries[0].approvedSummary }] } }).valid, false);
const factual = output("Consider claims workflow modernization.\nExplore asteroid mining operations.");
assert.ok(validateRaviModelOutput(factual, { matchedEntries: entries, reviewedCandidate: factual,
  entityReview: { answer: factual.answer, ordinaryProse: ["Consider", "Explore"], entities: [] } }).violations.includes("unsupported_factual_assertion"));
assert.equal(validateRaviModelOutput(candidate, { matchedEntries: kb.filter(entry => entry.id === "secure-ticketing-case-management"),
  reviewedCandidate: candidate, entityReview: review }).valid, false, "Wrong evidence cannot ground claims-specific facts");

const role = kb.find(entry => entry.id === "ravi-professional-role");
const boundary = output(role.sourceFacts[1]);
assert.equal(validateRaviModelOutput(boundary, { matchedEntries: [role] }).valid, true);
const permission = output("I cannot verify another employee's permissions from the approved information.");
assert.equal(validateRaviModelOutput(permission, { matchedEntries: [role], visitorSuppliedEntities: ["another employee"] }).valid, true);
for (const answer of ["I can access your queue.\nI can close tickets.", "I have changed your routing rules.\nI have opened your tickets."]) {
  const envelope = output(answer);
  assert.ok(validateRaviModelOutput(envelope, { matchedEntries: entries, reviewedCandidate: envelope,
    entityReview: { answer, ordinaryProse: [], entities: [] } }).violations.includes("live_system_action_claim"));
}

// Existing independent candidate: one review, no unnecessary repair. Modern
// no-candidate path: first rejection followed by one evidence-aware repair.
const timings = [];
for (const hasCandidate of [true, false]) for (let repeat = 0; repeat < 5; repeat++) {
  const calls = { review: 0, repair: 0 }; const started = performance.now();
  const result = await resolveRaviEvidenceAnswer({ ...input, candidate: hasCandidate ? candidate : null }, {
    config, approvedAnswerSelection: productionPlan,
    provider: async request => {
      calls.review++;
      if (request.input.validationFeedback) calls.repair++;
      assert.ok(request.system.includes("complete propositions"));
      return { intent: { ...candidate, citations, candidateEntityReview: request.input.candidate ? review : null } };
    },
  });
  assert.equal(result.status, "success");
  assert.equal(result.output.answer, claims.join(" "));
  assert.deepEqual(calls, hasCandidate ? { review: 1, repair: 0 } : { review: 2, repair: 1 });
  timings.push({ hasCandidate, ...calls, fixtureMs: performance.now() - started });
}
const rejected = await resolveRaviEvidenceAnswer({ ...input, candidate: unsupported }, { config,
  provider: async () => ({ intent: { ...unsupported, citations, candidateEntityReview: unsupportedReview } }) });
assert.equal(rejected.status, "validation_exhausted");
assert.equal(rejected.attempts.length, 2);
assert.ok(rejected.violations.includes("unsupported_named_entity"));
const wrongCitation = await resolveRaviEvidenceAnswer({ ...input, candidate }, { config,
  provider: async () => ({ intent: { ...candidate, citations: [{ evidenceId: "invented" }], candidateEntityReview: review } }) });
assert.equal(wrongCitation.status, "invalid_source");
assert.equal(wrongCitation.attempts.length, 2);
console.log(JSON.stringify({ fixtureOnly: true, formattingCases: checked, repeatedReviewPaths: timings }));
console.log("Ravi entity review binding PASS: normalized exact candidate binding, six evidence scenarios, strict source/entity/fact/action checks, repair success/failure, no new provider calls.");
