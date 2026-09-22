import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ELENA_CLAIM_STATUSES,
  ELENA_VERB_CLASSES,
  classifyElenaClaim,
  evaluateElenaClaim,
  validateElenaComplianceClaim,
} from "../src/data/agentKnowledge/elenaClaimRules.js";
import { ELENA_EXACT_ISO_CERTIFIED_SCOPE } from "../src/data/agentKnowledge/elenaApprovedKnowledge.js";

const cases = [
  {
    claim: "OneSmarter is HIPAA certified",
    status: ELENA_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION,
    domain: "hipaa",
    alternative: /HIPAA Security Rule compliance assessment/i,
  },
  {
    claim: "OneSmarter completed a HIPAA Security Rule Compliance Assessment",
    status: ELENA_CLAIM_STATUSES.ALLOW,
    domain: "hipaa",
    verbClass: ELENA_VERB_CLASSES.VERIFIED_STATUS,
  },
  {
    claim: "OneSmarter guarantees HIPAA compliance",
    status: ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
    domain: "hipaa",
    alternative: /does not guarantee/i,
  },
  {
    claim: "OneSmarter is SOC 2 certified",
    status: ELENA_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION,
    domain: "soc_2",
    alternative: /SOC 2 Type II Attested/i,
  },
  {
    claim: "OneSmarter is SOC 2 Type II Attested",
    status: ELENA_CLAIM_STATUSES.ALLOW,
    domain: "soc_2",
    verbClass: ELENA_VERB_CLASSES.VERIFIED_STATUS,
  },
  {
    claim: "One Smarter Inc. is ISO/IEC 27001:2022 certified",
    status: ELENA_CLAIM_STATUSES.ALLOW,
    domain: "iso_27001",
    verbClass: ELENA_VERB_CLASSES.VERIFIED_STATUS,
    alternative: new RegExp(ELENA_EXACT_ISO_CERTIFIED_SCOPE),
  },
  {
    claim: "Claims processing is ISO certified",
    status: ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
    domain: "iso_27001",
    alternative: new RegExp(ELENA_EXACT_ISO_CERTIFIED_SCOPE),
  },
  {
    claim: "All OneSmarter platforms are ISO certified",
    status: ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
    domain: "iso_27001",
  },
  {
    claim: "OneSmarter's ISO certification certifies customer systems",
    status: ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
    domain: "iso_27001",
  },
  {
    claim: ELENA_EXACT_ISO_CERTIFIED_SCOPE,
    status: ELENA_CLAIM_STATUSES.ALLOW,
    domain: "iso_27001",
    verbClass: ELENA_VERB_CLASSES.VERIFIED_STATUS,
  },
  {
    claim: "OneSmarter is PCI DSS certified",
    status: ELENA_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION,
    domain: "pci_dss",
    alternative: /PCI DSS readiness/i,
  },
  {
    claim: "OneSmarter supports PCI DSS readiness",
    status: ELENA_CLAIM_STATUSES.ALLOW,
    domain: "pci_dss",
    verbClass: ELENA_VERB_CLASSES.READINESS_SUPPORT,
  },
  {
    claim: "OneSmarter can certify my company",
    status: ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
    domain: "customer_outcomes",
    alternative: /does not certify/i,
  },
  {
    claim: "OneSmarter can help us prepare for an audit",
    status: ELENA_CLAIM_STATUSES.ALLOW,
    domain: "compliance_readiness",
    verbClass: ELENA_VERB_CLASSES.READINESS_SUPPORT,
  },
  {
    claim: "OneSmarter guarantees we will pass the audit",
    status: ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
    domain: "customer_outcomes",
    alternative: /does not guarantee/i,
  },
];

for (const testCase of cases) {
  const first = evaluateElenaClaim(testCase.claim);
  const second = evaluateElenaClaim(testCase.claim);
  assert.deepEqual(first, second, `Rule result must be deterministic: ${testCase.claim}`);
  assert.equal(first.status, testCase.status, testCase.claim);
  assert.equal(first.domain, testCase.domain, testCase.claim);
  assert.ok(first.reason, `Missing reason: ${testCase.claim}`);
  assert.ok(first.matchedRuleId, `Missing rule ID: ${testCase.claim}`);
  assert.ok(Array.isArray(first.knowledgeIds), `Missing knowledge IDs: ${testCase.claim}`);
  if (testCase.verbClass) assert.equal(first.verbClass, testCase.verbClass, testCase.claim);
  if (testCase.alternative) {
    assert.match(first.approvedAlternative, testCase.alternative, testCase.claim);
  }
  if (first.status === ELENA_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION) {
    assert.ok(first.requiredQualification, `Missing qualification: ${testCase.claim}`);
  }
}

assert.deepEqual(
  classifyElenaClaim("OneSmarter supports SOC 2 readiness"),
  evaluateElenaClaim("OneSmarter supports SOC 2 readiness"),
);
assert.deepEqual(
  validateElenaComplianceClaim("OneSmarter supports HIPAA readiness"),
  evaluateElenaClaim("OneSmarter supports HIPAA readiness"),
);

for (const safeNegative of [
  "OneSmarter does not certify customers",
  "OneSmarter does not issue ISO certificates",
  "OneSmarter does not guarantee compliance",
]) {
  const result = evaluateElenaClaim(safeNegative);
  assert.equal(result.status, ELENA_CLAIM_STATUSES.ALLOW, safeNegative);
  assert.equal(result.verbClass, ELENA_VERB_CLASSES.NEGATIVE_BOUNDARY, safeNegative);
}

for (const unrelatedClaim of [
  "Bill Audit automates every payment workflow",
  "Claims Processing Services adjudicate claims",
  "The Café Elena persona likes cooking programmes",
]) {
  const result = evaluateElenaClaim(unrelatedClaim);
  assert.equal(result.status, ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED, unrelatedClaim);
  assert.equal(result.matchedRuleId, "not_in_elena_approved_knowledge", unrelatedClaim);
  assert.deepEqual(result.knowledgeIds, [], unrelatedClaim);
}

const source = readFileSync("src/data/agentKnowledge/elenaClaimRules.js", "utf8");
assert.doesNotMatch(source, /from\s+["'][^"']*(?:cafePersonas|cafeConversations)/i);
assert.doesNotMatch(source, /from\s+["'][^"']*agentPresentation/i);
assert.doesNotMatch(source, /fetch\s*\(|process\.env|openai|providerAdapter/i);

console.log("Elena Phase 2 deterministic claim-rule tests passed.");
console.log(`Validated ${cases.length} required claim cases, aliases, negative boundaries, isolation, and repeat determinism.`);
