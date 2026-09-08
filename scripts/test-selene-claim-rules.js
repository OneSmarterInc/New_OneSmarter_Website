import assert from "node:assert/strict";
import {
  SELENE_BOUNDARY_ACTIONS,
  classifySeleneClaim,
  evaluateSeleneClaim,
  seleneClaimRules,
  seleneQualificationMatrix,
  validateSeleneArchitectureClaim,
} from "../src/data/agentKnowledge/seleneClaimRules.js";
import { seleneApprovedKnowledgeIds } from "../src/data/agentKnowledge/seleneApprovedKnowledge.js";

assert.equal(seleneClaimRules.role, "AI Agent Architecture Strategist");
assert.match(seleneClaimRules.professionalEvidenceBoundary, /Café.*never factual evidence/i);
assert.equal(seleneClaimRules.handoffTarget, "care@onesmarter.com");
assert.equal(seleneQualificationMatrix.length, 19);

const cases = [
  ["How does OneSmarter orchestrate its AI agents?", "ANSWER_WITH_QUALIFICATION"],
  ["Why does the Agent Café have a review gate?", "ANSWER"],
  ["How do your agents prevent unsupported claims?", "ANSWER"],
  ["How are Mira, Theo, Elena and Ravi different?", "ANSWER"],
  ["How does your knowledge boundary work?", "ANSWER"],
  ["Why use multiple focused agents instead of one chatbot?", "ANSWER"],
  ["Do your agents collaborate autonomously?", "ANSWER_WITH_QUALIFICATION"],
  ["Can Café conversations influence professional answers?", "ANSWER_WITH_QUALIFICATION"],
  ["Do your agents remember everything visitors tell them?", "ANSWER_WITH_QUALIFICATION"],
  ["Does depletion make an agent less accurate?", "ANSWER_WITH_QUALIFICATION"],
  ["Can Selene design an AI strategy for my company?", "HANDOFF_UNSUPPORTED"],
  ["Which AI agents should my company deploy?", "HANDOFF_UNSUPPORTED"],
  ["Can Selene guarantee an AI transformation outcome?", "HANDOFF_UNSUPPORTED"],
  ["Can you design an architecture for our customer data?", "HANDOFF_UNSUPPORTED"],
  ["Which customers use your agent architecture?", "HANDOFF_UNSUPPORTED"],
  ["When will autonomous multi-agent orchestration launch?", "HANDOFF_UNSUPPORTED"],
  ["Can Selene review our SOC 2 claim?", "HANDOFF_UNSUPPORTED"],
  ["Can Selene analyze our website for AI readability?", "HANDOFF_UNSUPPORTED"],
  ["Can Selene close a ticket through Ravi?", "HANDOFF_UNSUPPORTED"],
];
const expected = new Map(cases);

assert.equal(new Set(seleneQualificationMatrix.map(({ id }) => id)).size, 19);
for (const boundary of seleneQualificationMatrix) {
  assert.equal(boundary.action, SELENE_BOUNDARY_ACTIONS[expected.get(boundary.question)]);
  assert.ok(boundary.approvedBasis);
  for (const id of boundary.knowledgeIds) assert.ok(seleneApprovedKnowledgeIds.includes(id));
}

for (const [question, status] of cases) {
  const evaluated = evaluateSeleneClaim(question);
  assert.equal(evaluated.status, SELENE_BOUNDARY_ACTIONS[status], question);
  assert.ok(evaluated.reason);
  assert.ok(evaluated.approvedAlternative);
  assert.deepEqual(classifySeleneClaim(question), evaluated);
  assert.deepEqual(validateSeleneArchitectureClaim(question), evaluated);
  assert.deepEqual(evaluateSeleneClaim(question), evaluated);
}

assert.match(evaluateSeleneClaim(cases[0][0]).approvedAlternative, /not currently implemented/i);
assert.match(evaluateSeleneClaim(cases[9][0]).approvedAlternative, /never facts, safety, qualifications, refusals, handoffs, or correctness/i);
assert.doesNotMatch(evaluateSeleneClaim(cases[9][0]).approvedAlternative, /\b(?:40|69|100|Redis|Upstash|state key|REST token)\b/i);
assert.equal(evaluateSeleneClaim(cases[16][0]).handoffAgent, "Elena Cross");
assert.equal(evaluateSeleneClaim(cases[17][0]).handoffAgent, "Theo Mercer");
assert.match(evaluateSeleneClaim(cases[18][0]).approvedAlternative, /no agent has performed or received/i);
assert.doesNotMatch(JSON.stringify(seleneClaimRules), /six towns|father collected|second-hand books|radio documentaries|the sea without/i);

console.log("Selene Phase 1 claim-boundary tests passed.");
console.log("Validated 19 required cases, deterministic alternatives, handoffs, orchestration qualification, and Café isolation.");
