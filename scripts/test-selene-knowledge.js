import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  seleneApprovedKnowledge,
  seleneApprovedKnowledgeIds,
} from "../src/data/agentKnowledge/seleneApprovedKnowledge.js";

const expectedIds = [
  "selene-professional-role",
  "agent-architecture-overview",
  "professional-agent-role-separation",
  "canonical-knowledge-boundary",
  "claim-validation-and-fail-closed-design",
  "professional-cafe-separation",
  "cafe-review-and-publication-gate",
  "current-orchestration-vs-future-collaboration",
  "operational-state-vs-factual-accuracy",
];

assert.deepEqual(seleneApprovedKnowledgeIds, expectedIds);
assert.equal(new Set(seleneApprovedKnowledgeIds).size, expectedIds.length);

for (const record of seleneApprovedKnowledge) {
  for (const field of ["id", "route", "title", "category", "approvedSummary", "handoffGuidance"]) {
    assert.equal(typeof record[field], "string", `${record.id}.${field} must be text`);
    assert.ok(record[field].trim(), `${record.id}.${field} must not be empty`);
  }
  for (const field of ["sourceFacts", "allowedClaims", "requiredQualifications", "disallowedClaims", "unsupportedExtensions"]) {
    assert.ok(Array.isArray(record[field]), `${record.id}.${field} must be an array`);
    assert.ok(record[field].length, `${record.id}.${field} must not be empty`);
  }
  assert.ok(record.sourceReference?.type);
  assert.ok(record.sourceReference?.sourceLabel);
  assert.match(record.handoffGuidance, /care@onesmarter\.com/);
}

const serialized = JSON.stringify(seleneApprovedKnowledge);
assert.match(serialized, /autonomous agent-to-agent production (?:delegation|orchestration).*not currently implemented/i);
assert.match(serialized, /operational state may (?:change|reduce|affect)/i);
assert.match(serialized, /Selene Hart is OneSmarter's AI Agent Architecture Strategist/i);
assert.match(serialized, /Mira is the public-content guide/i);
assert.match(serialized, /Theo analyzes supplied public content/i);
assert.match(serialized, /Elena reviews compliance/i);
assert.match(serialized, /Ravi explains approved operations/i);
assert.match(serialized, /never change facts|never facts/i);
assert.doesNotMatch(serialized, /six towns|father collected|second-hand books|radio documentaries|the sea without|childhood/i);
assert.doesNotMatch(serialized, /Certificate number: 210826050107|claims processing services|secure ticketing supports/i);

const source = readFileSync(new URL("../src/data/agentKnowledge/seleneApprovedKnowledge.js", import.meta.url), "utf8");
assert.doesNotMatch(source, /from\s+["'][^"']*(?:cafePersonas|cafeConversations)/i);
assert.doesNotMatch(source, /only Mira is live|Theo, Elena, Ravi and Selene are agents in development/i);

const cafeEntry = seleneApprovedKnowledge.find(({ id }) => id === "professional-cafe-separation");
assert.match(cafeEntry.approvedSummary, /separate from professional evidence/i);
const orchestrationEntry = seleneApprovedKnowledge.find(({ id }) => id === "current-orchestration-vs-future-collaboration");
assert.match(orchestrationEntry.requiredQualifications.join(" "), /not currently implemented/i);
const stateEntry = seleneApprovedKnowledge.find(({ id }) => id === "operational-state-vs-factual-accuracy");
assert.doesNotMatch(stateEntry.allowedClaims.join(" "), /\b(?:40|69|100|Redis|Upstash|REST token)\b/i);

console.log("Selene Phase 1 approved-knowledge tests passed.");
console.log("Validated 9 focused architecture entries, source boundaries, Café isolation, and accuracy-preserving depletion wording.");
