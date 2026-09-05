import assert from "node:assert/strict";
import {
  RAVI_BOUNDARY_ACTIONS,
  RAVI_CLAIM_STATUSES,
  classifyRaviClaim,
  evaluateRaviClaim,
  raviClaimRules,
  raviQualificationMatrix,
} from "../src/data/agentKnowledge/raviClaimRules.js";

assert.equal(raviClaimRules.role, "Operations Agent");
assert.match(raviClaimRules.professionalEvidenceBoundary, /Café.*never factual evidence/i);
assert.equal(raviQualificationMatrix.length, 9);

const expectedMatrixActions = {
  "resolution-time-guarantee": RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
  "unsupported-integration": RAVI_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION,
  "automatic-hipaa-compliance": RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
  "internal-queue-access": RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
  "real-ticket-action": RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
  "audit-readiness-guarantee": RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
  "customer-identity": RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
  "sla-details": RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
  "production-escalation": RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
};
for (const boundary of raviQualificationMatrix) {
  assert.equal(boundary.action, expectedMatrixActions[boundary.id]);
  assert.ok(boundary.approvedBasis);
}

const cases = [
  ["Secure ticketing supports workflow tracking and audit history.", "ALLOW"],
  ["Can Ravi guarantee this ticket is resolved in 4 hours?", "REFUSE_UNSUPPORTED"],
  ["What is the SLA?", "REFUSE_UNSUPPORTED"],
  ["Does OneSmarter integrate with ServiceNow?", "ALLOW_WITH_QUALIFICATION"],
  ["Will this workflow make us HIPAA compliant?", "REFUSE_UNSUPPORTED"],
  ["Can Ravi access our internal ticket queue?", "REFUSE_UNSUPPORTED"],
  ["Can Ravi change or close a real ticket?", "REFUSE_UNSUPPORTED"],
  ["Does OneSmarter guarantee audit readiness?", "REFUSE_UNSUPPORTED"],
  ["What customer uses this system?", "REFUSE_UNSUPPORTED"],
  ["Can Ravi perform an escalation in our production environment?", "REFUSE_UNSUPPORTED"],
  ["How could routing and process handoffs be designed?", "ALLOW_WITH_QUALIFICATION"],
  ["What does implementation cost and when will it go live?", "REFUSE_UNSUPPORTED"],
  ["Is OneSmarter SOC 2 certified?", "REFUSE_UNSUPPORTED"],
  ["Review this page's AI readability and metadata.", "REFUSE_UNSUPPORTED"],
  ["Explain the executive strategy and agent orchestration roadmap.", "REFUSE_UNSUPPORTED"],
  ["What does OneSmarter do generally?", "REFUSE_UNSUPPORTED"],
];

for (const [claim, status] of cases) {
  const evaluated = evaluateRaviClaim(claim);
  assert.equal(evaluated.status, RAVI_CLAIM_STATUSES[status], claim);
  assert.ok(evaluated.reason);
  assert.ok(evaluated.approvedAlternative);
  assert.deepEqual(classifyRaviClaim(claim), evaluated);
  assert.deepEqual(evaluateRaviClaim(claim), evaluated);
}

assert.match(
  evaluateRaviClaim("Does OneSmarter integrate with ServiceNow?").approvedAlternative,
  /Confirm any specific vendor/i,
);
assert.match(
  evaluateRaviClaim("Can Ravi close our production ticket?").approvedAlternative,
  /without accessing or changing a real system/i,
);
assert.doesNotMatch(JSON.stringify(raviClaimRules), /cricket|street food|grandmother|brother/i);

console.log("Ravi Phase 1 claim-boundary tests passed.");
console.log("Validated 9 required boundary cases, approved operations, role separation, safe alternatives, and deterministic results.");
