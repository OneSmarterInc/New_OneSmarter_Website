import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ELENA_EXACT_ISO_CERTIFIED_SCOPE,
  elenaApprovedKnowledge,
  elenaApprovedKnowledgeIds,
} from "../src/data/agentKnowledge/elenaApprovedKnowledge.js";
import {
  ELENA_BOUNDARY_ACTIONS,
  elenaClaimRules,
  elenaQualificationMatrix,
} from "../src/data/agentKnowledge/elenaClaimRules.js";

const expectedIds = [
  "trust-center-overview",
  "soc2-attested",
  "hipaa-security-rule-assessment",
  "iso-27001-certified",
  "compliance-cyber-assurance-overview",
  "iso-27001-readiness-support",
  "soc-readiness-support",
  "hipaa-audit-readiness-support",
  "pci-dss-readiness-support",
];

assert.deepEqual(
  elenaApprovedKnowledgeIds,
  expectedIds,
  "Elena's slice must contain only the approved compliance topics",
);
assert.equal(new Set(elenaApprovedKnowledgeIds).size, expectedIds.length);

for (const entry of elenaApprovedKnowledge) {
  for (const field of [
    "id",
    "route",
    "title",
    "category",
    "approvedSummary",
    "handoffGuidance",
  ]) {
    assert.equal(typeof entry[field], "string", `${entry.id}.${field} must be text`);
    assert.ok(entry[field].trim(), `${entry.id}.${field} must not be empty`);
  }
  for (const field of [
    "sourceFacts",
    "allowedClaims",
    "disallowedClaims",
    "unsupportedExtensions",
  ]) {
    assert.ok(Array.isArray(entry[field]), `${entry.id}.${field} must be an array`);
    assert.ok(entry[field].length, `${entry.id}.${field} must not be empty`);
  }
  assert.ok(entry.sourceReference?.sourceLabel);
}

const sourceFiles = [
  readFileSync("src/data/agentKnowledge/elenaApprovedKnowledge.js", "utf8"),
  readFileSync("src/data/agentKnowledge/elenaClaimRules.js", "utf8"),
].join("\n");
assert.doesNotMatch(sourceFiles, /cafePersonas|cafeConversations/i);
assert.doesNotMatch(sourceFiles, /from\s+["'][^"']*agentPresentation/i);

const isoEntry = elenaApprovedKnowledge.find(
  (entry) => entry.id === "iso-27001-certified",
);
assert.ok(isoEntry);
const exactScopeFacts = isoEntry.sourceFacts.filter((fact) =>
  fact.includes(ELENA_EXACT_ISO_CERTIFIED_SCOPE),
);
assert.equal(exactScopeFacts.length, 1, "The exact ISO scope must appear once in source facts");
assert.equal(
  ELENA_EXACT_ISO_CERTIFIED_SCOPE,
  "AWS cloud services development, HR and people management solutions development, and governance activities in the One Smarter application",
);
assert.match(isoEntry.sourceFacts.join(" "), /does not automatically cover claims processing/i);
assert.match(isoEntry.sourceFacts.join(" "), /Certificate number: 210826050107/);
assert.match(isoEntry.sourceFacts.join(" "), /ARS Assessment Private Limited/);
assert.match(isoEntry.sourceFacts.join(" "), /UAF accredited/);
assert.match(isoEntry.sourceFacts.join(" "), /21 August 2026 through 20 August 2029/);

const matrixByQuestion = new Map(
  elenaQualificationMatrix.map((item) => [item.question, item]),
);
assert.equal(matrixByQuestion.size, 14, "All required boundary questions must be unique");

const expectedActions = new Map([
  ["Are you HIPAA certified?", ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION],
  ["Are your platforms HIPAA certified?", ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION],
  ["Are you SOC 2 certified?", ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION],
  ["Are your platforms SOC 2 certified?", ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION],
  ["Are you ISO/IEC 27001 certified?", ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY],
  ["What is your ISO certificate number?", ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY],
  ["Who issued your ISO certificate?", ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY],
  ["Does your ISO certification cover claims processing?", ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY],
  ["Does your ISO certification certify my system?", ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION],
  ["Can OneSmarter certify my company?", ELENA_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED],
  ["Are you PCI DSS certified?", ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION],
  ["Can you guarantee HIPAA compliance?", ELENA_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED],
  ["Can you help us prepare for an audit?", ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY],
  ["What compliance-readiness services do you provide?", ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY],
]);

for (const [question, action] of expectedActions) {
  const boundary = matrixByQuestion.get(question);
  assert.ok(boundary, `Missing boundary case: ${question}`);
  assert.equal(boundary.action, action, `Incorrect action for: ${question}`);
  assert.ok(boundary.approvedBasis.trim());
  assert.ok(boundary.knowledgeIds.length);
  for (const id of boundary.knowledgeIds) {
    assert.ok(expectedIds.includes(id), `${question} references knowledge outside Elena's slice: ${id}`);
  }
}

assert.match(
  matrixByQuestion.get("Does your ISO certification cover claims processing?")
    .approvedBasis,
  /^No\./,
);
assert.match(
  matrixByQuestion.get("Does your ISO certification cover claims processing?")
    .approvedBasis,
  new RegExp(ELENA_EXACT_ISO_CERTIFIED_SCOPE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
);
assert.match(
  matrixByQuestion.get("Can OneSmarter certify my company?").approvedBasis,
  /does not|No approved source/i,
);
assert.match(
  matrixByQuestion.get("Are you PCI DSS certified?").approvedBasis,
  /readiness services only/i,
);
assert.match(
  matrixByQuestion.get("Can you help us prepare for an audit?").approvedBasis,
  /does not certify|does not.*guarantee/i,
);

for (const phrase of [
  "HIPAA certified",
  "SOC 2 certified",
  "guaranteed compliant",
  "ISO certified platform",
  "certifies customer systems",
  "PCI DSS certified",
]) {
  assert.ok(
    elenaClaimRules.prohibitedClaims.some((claim) =>
      claim.toLowerCase().includes(phrase.toLowerCase()),
    ),
    `Missing prohibited claim: ${phrase}`,
  );
}

for (const unrelatedId of [
  "company-overview",
  "secure-ticketing-case-management",
  "bill-audit-bill-pay",
  "technology-solutions-overview",
  "claims-processing-services",
  "ai-agentic-services",
  "business-services-overview",
  "practice-hiring-support",
  "contact-handoff",
]) {
  assert.ok(
    !elenaApprovedKnowledgeIds.includes(unrelatedId),
    `Unrelated general-product knowledge leaked into Elena's slice: ${unrelatedId}`,
  );
}

console.log("Elena Phase 1 knowledge-boundary tests passed.");
console.log(`Validated ${elenaApprovedKnowledge.length} approved knowledge entries and ${elenaQualificationMatrix.length} boundary cases.`);
