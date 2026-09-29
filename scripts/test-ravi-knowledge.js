import assert from "node:assert/strict";
import fs from "node:fs";
import {
  raviApprovedKnowledge,
  raviApprovedKnowledgeIds,
  raviApprovedRoutes,
} from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { onesmarterPublicKnowledgeBase } from "../src/data/agentKnowledge/onesmarterPublicKb.js";
import { siteDirectory } from "../src/data/siteDirectory.js";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { raviEvidenceCatalog } from "../src/server/ravi/raviEvidenceCatalog.js";

assert.deepEqual(raviApprovedKnowledgeIds, [
  "secure-ticketing-case-management",
  "claims-processing-services",
  "healthcare-tpa-workflow-modernization",
  "enterprise-workflow-tools",
  "software-support-continuity",
  "escalation-workflow-design",
  "workflow-handoff-design",
  "ravi-professional-role",
  "professional-agent-role-directory",
]);
assert.equal(new Set(raviApprovedKnowledgeIds).size, raviApprovedKnowledgeIds.length);

const canonicalIds = new Set(onesmarterPublicKnowledgeBase.map(({ id }) => id));
const canonicalRoutes = new Set(siteDirectory.map(({ route }) => route));
for (const entry of raviApprovedKnowledge) {
  assert.ok(entry.approvedSummary);
  assert.ok(entry.sourceFacts.length > 0);
  assert.ok(entry.sourceReference?.type);
  assert.equal(entry.sourceReference.route, entry.route);
  assert.ok(
    entry.sourceReference.type === "canonical-professional-knowledge"
      ? canonicalIds.has(entry.sourceReference.canonicalKnowledgeId)
      : canonicalRoutes.has(entry.route),
  );
}

const raviRole = raviApprovedKnowledge.find(({ id }) => id === "ravi-professional-role");
assert.match(raviRole.approvedSummary, /Operations Agent/i);
assert.match(raviRole.sourceFacts.join(" "), /does not access or modify customer systems/i);

const roleDirectory = raviApprovedKnowledge.find(({ id }) => id === "professional-agent-role-directory");
for (const expectedRole of [
  /Mira Vale.*OneSmarter Guide/i,
  /Theo Mercer.*website.*AI[- ]readability/i,
  /Elena Cross.*Compliance Reader/i,
  /Ravi Sen.*Operations Agent/i,
  /Selene Hart.*AI Agent Architecture Strategist/i,
]) assert.match(roleDirectory.sourceFacts.join(" "), expectedRole);
assert.doesNotMatch(
  JSON.stringify([raviRole, roleDirectory].flatMap(({ sourceFacts, allowedClaims }) => [sourceFacts, allowedClaims])),
  /cricket|street food|café persona|depletion|api endpoint|provider/i,
);

assert.deepEqual(raviApprovedRoutes, [
  "/platforms/hipaa-regulated-ticketing",
  "/technology-solutions/claims-processing-services",
  "/technology-solutions/healthcare-tpa",
  "/technology-solutions/enterprise-software",
  "/technology-solutions/software-support-consolidation",
  "/platforms/hipaa-regulated-ticketing",
  "/technology-solutions/software-support-consolidation",
  "/ai-agents",
  "/ai-agents",
]);

const serialized = JSON.stringify(raviApprovedKnowledge);
for (const excludedId of [
  "company-overview",
  "ai-agentic-services",
  "bill-audit-bill-pay",
  "soc2-attested",
  "iso-27001-certified",
  "compliance-cyber-assurance-overview",
]) {
  assert.ok(!raviApprovedKnowledgeIds.includes(excludedId));
}
assert.doesNotMatch(serialized, /cricket|street food|grandmother|brother|Café conversation/i);
for (const entry of raviApprovedKnowledge) {
  assert.doesNotMatch(
    JSON.stringify(entry.allowedClaims),
    /guarantee|certified|production-ready claims platform|named vendor/i,
  );
}

const source = fs.readFileSync(
  new URL("../src/data/agentKnowledge/raviApprovedKnowledge.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(source, /cafePersonas|cafeConversations/);

const designEntries = raviApprovedKnowledge.filter(entry => entry.category === "Operational design guidance");
assert.equal(designEntries.length, 2);
for (const entry of designEntries) {
  for (const field of ["id", "route", "title", "category", "approvedSummary", "sourceFacts", "allowedClaims", "disallowedClaims", "unsupportedExtensions", "handoffGuidance", "sourceReference"]) {
    assert.ok(entry[field], `${entry.id}: missing ${field}`);
  }
  assert.match(entry.approvedSummary, /general .*design guidance/i);
  assert.ok(entry.disallowedClaims.length > 0);
  assert.ok(entry.unsupportedExtensions.length > 0);
  for (const { path, quote } of entry.sourceReference.sources) {
    const original = fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.ok(original.includes(quote), `${entry.id}: source excerpt missing from ${path}`);
  }
}

// Controlled provider fixtures verify that the new content reaches the existing
// response/grounding path intact. They do not claim live-model intent accuracy.
const catalog = raviEvidenceCatalog();
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, model: "fixture" };
const cases = [
  ["How should routing and escalation handoffs be designed?", "escalation-workflow-design", [0, 1, 3], /escalation path.*responsible owner/i],
  ["How should escalation work in a support process?", "escalation-workflow-design", [0, 1, 3], /workflow tracking and audit history/i],
  ["How should ownership move between teams during escalation?", "escalation-workflow-design", [0, 1, 3], /ownership transfer.*accountable/i],
  ["How should urgency be handled in workflows?", "escalation-workflow-design", [2, 3], /priority levels.*separate scoped review/i],
  ["How should workflow handoffs be designed?", "workflow-handoff-design", [0, 1, 2, 3], /documentation.*knowledge transfer/i],
  ["Can Ravi access our ticket queue?", "ravi-professional-role", [1], /does not access or modify customer systems/i],
  ["Can Ravi modify tickets?", "ravi-professional-role", [1], /does not access or modify customer systems, tickets/i],
];
for (const [message, entryId, factIndices, expected] of cases) {
  const entry = raviApprovedKnowledge.find(record => record.id === entryId);
  const boundary = entryId === "ravi-professional-role";
  const evidenceIds = factIndices.map(index => `${entryId}:fact:${index}`);
  const answer = factIndices.map(index => entry.sourceFacts[index]).join(" ");
  let intentCalls = 0;
  const result = await runRaviResponseAdapter({ message, config,
    intentProvider: async request => {
      intentCalls++;
      for (const id of evidenceIds) {
        assert.ok(request.input.evidenceCatalog.some(unit => unit.id === id && unit.text === catalog.find(item => item.id === id).text));
      }
      return { intent: {
        semanticIntent: {
          domain: "operations", topic: entry.title, entities: [boundary ? "Ravi Sen" : "operational workflow"],
          proposition: message, polarity: "positive", negationScope: [],
          questionType: boundary ? "positive_yes_no" : "how", speechAct: "question",
          requestedDetail: message, followUpReferences: [], confidence: 0.99, clarificationNeeded: false, mentionedNames: [],
          atomicPropositions: [], propositionRelations: [], intentFocus: { operation: "answer_proposition", propositionIds: [], relationIds: [] },
        },
        approvedAnswerSelection: { requestKind: boundary ? "agent_boundary" : "general_guidance", evidenceIds,
          coverage: "complete", subjectsPreserved: true, qualificationsPreserved: true },
      } };
    },
    providerAdapter: async () => { assert.fail("Knowledge fixture should not need an uncited draft"); },
    evidenceProvider: async request => {
      assert.ok(request.input.approvedEvidence.some(record => record.id === entryId));
      return { intent: { answer, groundingStatus: "grounded", outputSafetyStatus: "passed",
        handoffNeeded: false, handoffReason: null, suggestedFollowUps: [], candidateEntityReview: null,
        citations: evidenceIds.map(evidenceId => ({ evidenceId })),
      } };
    },
  });
  assert.equal(intentCalls, 1);
  assert.equal(result.answer, answer, `${message}: ${result.fallbackReason}`);
  assert.match(result.answer, expected, message);
  assert.equal(result.clarificationNeeded, false, message);
  assert.ok(result.matchedEntries.some(record => record.id === entryId), message);
  assert.ok(result.sources.some(record => record.id === entryId), message);
  assert.doesNotMatch(result.answer, /OneSmarter (?:has|provides|offers) an automated escalation|(?:I|Ravi) (?:can|will|have|has) (?:access|modify|escalate|execute)|(?:OneSmarter|Ravi|the platform|workflow design) guarantees? (?:SLAs|resolution times|compliance outcomes)/i);
}

console.log("Ravi approved-knowledge tests passed.");
console.log(`Validated ${raviApprovedKnowledge.length} entries, source excerpts, scope, and 7 controlled knowledge/grounding cases (no live provider).`);
