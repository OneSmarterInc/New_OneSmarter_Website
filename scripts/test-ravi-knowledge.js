import assert from "node:assert/strict";
import fs from "node:fs";
import {
  raviApprovedKnowledge,
  raviApprovedKnowledgeIds,
  raviApprovedRoutes,
} from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { onesmarterPublicKnowledgeBase } from "../src/data/agentKnowledge/onesmarterPublicKb.js";
import { siteDirectory } from "../src/data/siteDirectory.js";

assert.deepEqual(raviApprovedKnowledgeIds, [
  "secure-ticketing-case-management",
  "claims-processing-services",
  "healthcare-tpa-workflow-modernization",
  "enterprise-workflow-tools",
  "software-support-continuity",
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

assert.deepEqual(raviApprovedRoutes, [
  "/platforms/hipaa-regulated-ticketing",
  "/technology-solutions/claims-processing-services",
  "/technology-solutions/healthcare-tpa",
  "/technology-solutions/enterprise-software",
  "/technology-solutions/software-support-consolidation",
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

console.log("Ravi Phase 1 approved-knowledge tests passed.");
console.log("Validated 5 canonical operations entries, source linkage, narrow scope, and professional/Café isolation.");
