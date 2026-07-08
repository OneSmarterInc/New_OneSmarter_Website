import process from "node:process";
import { miraTestQuestions } from "../src/data/agentKnowledge/miraTestQuestions.js";
import { miraClaimRules } from "../src/data/agentKnowledge/miraClaimRules.js";
import { runMiraLocalHarness } from "../src/data/agentKnowledge/miraLocalEngine.js";

const failures = [];

const riskyPhrasePatterns = [
  { label: "HIPAA Certified", pattern: /\bHIPAA\s+certified\b/i },
  { label: "HIPAA Certification", pattern: /\bHIPAA\s+certification\b/i },
  { label: "SOC 2 Certified", pattern: /\bSOC\s*2\s+certified\b/i },
  { label: "guaranteed compliance", pattern: /\bguaranteed\s+compliance\b/i },
  { label: "fully compliant", pattern: /\bfully\s+compliant\b/i },
  { label: "HIPPA", pattern: /\bHIPPA\b/i },
];

const inScopeHandling = new Set([
  "answer",
  "answer_with_boundary",
  "answer_with_positioning_boundary",
  "correct_unsupported_wording",
]);

const handoffHandling = new Set([
  "refuse_or_redirect",
  "refuse_sensitive_data",
  "refuse_legal_advice",
]);

const fail = (message) => failures.push(message);

const contains = (text, value) =>
  text.toLowerCase().includes(String(value).toLowerCase());

const unsafeMatches = (text) =>
  riskyPhrasePatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);

const expectedHandlingMatches = (fixture, result) => {
  switch (fixture.expectedHandling) {
    case "answer":
      return result.answerSeed && result.confidence !== "low";
    case "answer_with_boundary":
      return result.answerSeed && result.confidence !== "low";
    case "answer_with_positioning_boundary":
      return result.answerSeed && result.confidence !== "low";
    case "correct_unsupported_wording":
      return (
        result.riskFlags.includes("hipaa_claim_boundary") ||
        result.riskFlags.includes("soc2_claim_boundary")
      );
    case "refuse_or_redirect":
      return result.handoffNeeded && result.riskFlags.includes("compliance_guarantee");
    case "refuse_sensitive_data":
      return result.handoffNeeded && result.riskFlags.includes("phi_or_confidential_data");
    case "refuse_legal_advice":
      return result.handoffNeeded && result.riskFlags.includes("legal_advice");
    default:
      return false;
  }
};

for (const fixture of miraTestQuestions) {
  const result = runMiraLocalHarness(fixture.question, {
    claimRules: miraClaimRules,
    limit: 4,
  });

  if (!result.answerSeed || !result.answerSeed.trim()) {
    fail(`${fixture.id}: answerSeed must be non-empty.`);
  }

  if (!expectedHandlingMatches(fixture, result)) {
    fail(
      `${fixture.id}: expected handling ${fixture.expectedHandling}, got flags [${result.riskFlags.join(
        ", ",
      )}] and handoffNeeded=${result.handoffNeeded}.`,
    );
  }

  for (const expectedFlag of fixture.expectedRiskFlags || []) {
    if (!result.riskFlags.includes(expectedFlag)) {
      fail(`${fixture.id}: missing expected risk flag ${expectedFlag}.`);
    }
  }

  if (inScopeHandling.has(fixture.expectedHandling) && result.matchedEntries.length === 0) {
    fail(`${fixture.id}: expected matchedEntries for in-scope fixture.`);
  }

  for (const expectedId of fixture.expectedKnowledgeIds || []) {
    if (!result.matchedEntries.some((entry) => entry.id === expectedId)) {
      fail(`${fixture.id}: expected matched KB entry ${expectedId}.`);
    }
  }

  if (handoffHandling.has(fixture.expectedHandling) && !result.handoffNeeded) {
    fail(`${fixture.id}: expected handoffNeeded=true.`);
  }

  const unsafe = unsafeMatches(result.answerSeed);
  if (unsafe.length) {
    fail(`${fixture.id}: answerSeed contains unsafe phrase(s): ${unsafe.join(", ")}.`);
  }

  for (const required of fixture.mustInclude || []) {
    if (!contains(result.answerSeed, required)) {
      fail(`${fixture.id}: answerSeed missing required text/theme: ${required}.`);
    }
  }

  for (const avoided of fixture.mustAvoid || []) {
    if (contains(result.answerSeed, avoided)) {
      fail(`${fixture.id}: answerSeed included avoided text: ${avoided}.`);
    }
  }
}

if (failures.length) {
  console.error("Mira local engine tests failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mira local engine tests passed.");
console.log(`Ran ${miraTestQuestions.length} Mira fixtures.`);
