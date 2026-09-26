import {
  ELENA_CLAIM_STATUSES,
  evaluateElenaClaim,
} from "../../data/agentKnowledge/elenaClaimRules.js";
import { verifyAgentAnswerGrounding } from "../agentGrounding/agentGroundingVerifier.js";
import { elenaNonTerminologyAssertions, isApprovedTerminologyComposition } from "./elenaTerminologyEvidence.js";

const VALID_GROUNDING = new Set(["grounded", "insufficient_context", "refused"]);
const VALID_SAFETY = new Set(["passed", "corrected", "refused"]);
const INTERNAL_LEAK = /\b(?:system prompt|developer message|internal instructions?|runtime metadata|retrieval result|matched sources?|source labels?|rule id|risk flags?|api key|secret|generation notes?)\b/i;
const CAFE_LEAK = /\b(?:café persona|cafe persona|off-duty|cooking programmes?|odd animal news|personal interests?|café biography|cafe biography)\b/i;
const FABRICATED_SOURCE = /\b(?:according to|source:|citation:|retrieved from)\b|https?:\/\//i;
const GUARANTEE = /\bguarantee(?:s|d)?\b.{0,80}\b(?:compliance|compliant|certification|audit|pass)\b/i;
const UNSUPPORTED_CERTIFICATION = /\b(?:HIPAA|SOC\s*2|PCI\s*DSS)[- ]certified\b/i;
const CUSTOMER_CERTIFICATION = /\bOne\s*Smarter\b.{0,60}\bcertif(?:y|ies)\b.{0,40}\b(?:customers?|companies|organizations?|systems?|you|us)\b/i;
const ISO_SCOPE_OVERREACH = /\b(?:claims? processing|healthcare services?|all|every|customer systems?|customer organizations?)\b.{0,90}\bISO\b.{0,40}\bcertif|\bISO\b.{0,90}\b(?:covers?|certif(?:y|ies|ied))\b.{0,50}\b(?:claims? processing|healthcare services?|all|every|customer systems?|customer organizations?)\b/i;

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const clean = (value = "") => String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const safeCorrection = (answer) => /\b(?:not|does not|do not|cannot|instead|rather than)\b/i.test(answer);

export const validateElenaModelOutput = (output, {
  matchedEntries = [],
  fallbackResult,
  claimEvaluation = null,
} = {}) => {
  const violations = [];
  if (!isObject(output)) violations.push("invalid_shape");
  if (typeof output?.answer !== "string" || !output.answer.trim()) violations.push("invalid_answer");
  if (typeof output?.handoffNeeded !== "boolean") violations.push("invalid_handoff_state");
  if (output?.handoffReason !== null && output?.handoffReason !== undefined && typeof output.handoffReason !== "string") {
    violations.push("invalid_handoff_reason");
  }
  if (!Array.isArray(output?.suggestedFollowUps) || output?.suggestedFollowUps?.some((item) => typeof item !== "string")) {
    violations.push("invalid_followups");
  }
  if (!VALID_GROUNDING.has(output?.groundingStatus)) violations.push("invalid_grounding_status");
  if (!VALID_SAFETY.has(output?.outputSafetyStatus)) violations.push("invalid_output_safety_status");

  const answer = clean(output?.answer);
  const approvedTerminologyOnly = isApprovedTerminologyComposition(answer, matchedEntries);
  const assertions = elenaNonTerminologyAssertions(answer, matchedEntries);
  if (INTERNAL_LEAK.test(answer)) violations.push("internal_instruction_leak");
  if (CAFE_LEAK.test(answer)) violations.push("cafe_persona_leak");
  if (FABRICATED_SOURCE.test(answer)) violations.push("fabricated_source_reference");
  if (GUARANTEE.test(assertions) && !safeCorrection(assertions)) violations.push("unsupported_guarantee");
  if (UNSUPPORTED_CERTIFICATION.test(assertions) && !safeCorrection(assertions)) violations.push("unsupported_certification_claim");
  if (CUSTOMER_CERTIFICATION.test(assertions) && !safeCorrection(assertions)) violations.push("customer_certification_claim");
  if (ISO_SCOPE_OVERREACH.test(assertions) && !safeCorrection(assertions)) violations.push("iso_scope_overreach");
  if (output?.groundingStatus === "grounded" && matchedEntries.length === 0) {
    violations.push("grounded_without_approved_evidence");
  }
  if (output?.groundingStatus === "insufficient_context" && output?.handoffNeeded !== true) {
    violations.push("insufficient_context_requires_handoff");
  }
  if (output?.groundingStatus === "grounded") {
    const policyStatements = [
      claimEvaluation?.approvedAlternative,
      claimEvaluation?.requiredQualification,
    ].filter(Boolean).flatMap((statement) => statement.split(";"))
      .flatMap((statement) => statement.split(", but "))
      .map((statement) => statement.trim())
      .filter(Boolean);
    const policyEvidence = claimEvaluation && (
      claimEvaluation.approvedAlternative || claimEvaluation.requiredQualification
    ) ? [{
      id: `elena-policy-${claimEvaluation.matchedRuleId || "boundary"}`,
      title: "Approved Elena claim-boundary policy",
      approvedSummary: claimEvaluation.reason,
      sourceFacts: policyStatements,
      allowedClaims: policyStatements,
      requiredQualifications: [claimEvaluation.requiredQualification].filter(Boolean),
      disallowedClaims: [],
      unsupportedExtensions: [],
    }] : [];
    const grounding = verifyAgentAnswerGrounding({
      answer,
      approvedEntries: [...matchedEntries, ...policyEvidence],
    });
    if (!grounding.grounded) violations.push(...grounding.violations);
  }

  const outputClaimEvaluation = assertions ? evaluateElenaClaim(assertions) : null;
  const unresolvedOutputParaphrase =
    outputClaimEvaluation?.matchedRuleId === "not_in_elena_approved_knowledge" &&
    claimEvaluation &&
    claimEvaluation.status !== ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED;
  if (
    outputClaimEvaluation?.status === ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED &&
    !approvedTerminologyOnly &&
    (!unresolvedOutputParaphrase || matchedEntries.some(entry => entry.sourceReference?.type === "authoritative-terminology")) &&
    !safeCorrection(assertions) &&
    matchedEntries.length
  ) {
    violations.push("claim_rule_rejected_answer");
  }

  if (violations.length) {
    return {
      valid: false,
      violations: [...new Set(violations)],
      fallbackResult,
      claimEvaluation: outputClaimEvaluation,
    };
  }
  return {
    valid: true,
    violations: [],
    claimEvaluation: outputClaimEvaluation,
    correctedOutput: {
      answer,
      handoffNeeded: output.handoffNeeded,
      handoffReason: output.handoffReason || null,
      suggestedFollowUps: output.suggestedFollowUps.map(clean).filter(Boolean).slice(0, 3),
      groundingStatus: output.groundingStatus,
      outputSafetyStatus: output.outputSafetyStatus,
    },
  };
};

export default validateElenaModelOutput;
