import { miraClaimRules } from "../../data/agentKnowledge/miraClaimRules.js";
import { runMiraLocalHarness } from "../../data/agentKnowledge/miraLocalEngine.js";
import { normalizeMiraAnswerPresentation } from "../../data/agentPresentation/miraAnswerFormatter.js";

const VALID_GROUNDING_STATUSES = new Set(["grounded", "insufficient_context", "refused"]);
const VALID_OUTPUT_SAFETY_STATUSES = new Set(["passed", "corrected", "refused"]);
const HANDOFF_REQUIRED_FLAGS = new Set([
  "legal_advice",
  "medical_advice",
  "phi_or_confidential_data",
  "compliance_guarantee",
  "business_specific_review",
]);
const MAX_MODEL_ANSWER_CHARS = 1400;

const PROHIBITED_PATTERNS = [
  { label: "HIPAA Certified", pattern: /\bHIPAA\s+Certified\b/i },
  { label: "HIPAA Certification", pattern: /\bHIPAA\s+Certification\b/i },
  { label: "SOC 2 Certified", pattern: /\bSOC\s*2\s+Certified\b/i },
  { label: "guaranteed compliance", pattern: /\bguaranteed\s+compliance\b/i },
  { label: "fully compliant", pattern: /\bfully\s+compliant\b/i },
  { label: "HIPPA", pattern: /\bHIPPA\b/i },
];

const PHI_INVITATION_PATTERN =
  /\b(upload|paste|send|share|provide)\b.*\b(PHI|patient|claim number|claims data|confidential|credentials|private operational)\b/i;
const RAW_HTML_PATTERN = /<\/?[a-z][\s\S]*>/i;
const INTERNAL_RETRIEVAL_LANGUAGE_PATTERNS = [
  { label: "internal_related_topics", pattern: /\bRelated approved topics\b/i },
  { label: "internal_page_language", pattern: /\bThe page uses supporting language\b/i },
  { label: "internal_source_reference", pattern: /\b(approved source says|retrieved context|source facts?|matched sources?)\b/i },
  { label: "internal_route_guidance", pattern: /\bRoute regulated-workflow\b|\bRoute .*questions to care@onesmarter\.com\b/i },
];
const UNSUPPORTED_EXAMPLE_PATTERNS = [
  {
    label: "unsupported_baa_commitment",
    pattern:
      /\b(we|onesmarter|our platform|mira)\b[^.]{0,80}\b(provide|execute|sign|manage|issue|include|offer)\b[^.]{0,80}\bBAA(s)?\b/i,
  },
  {
    label: "unsupported_integration",
    pattern:
      /\b((integrated|integration|syncs?|connects?|connected)\b[^.]{0,100}\b(secure ticketing|case management|bill audit|bill pay|claims processing)|(secure ticketing|case management|bill audit|bill pay|claims processing)\b[^.]{0,100}\b(integrated|integration|syncs?|connects?|connected))\b/i,
  },
  {
    label: "unsupported_clinical_workflow",
    pattern: /\b(clinical workflow|clinical workflows|patient care workflow|treatment workflow)\b/i,
  },
  {
    label: "unsupported_customer_outcome",
    pattern:
      /\b(reduce costs by|saves? \d+|improves? outcomes?|guarantees? savings|guaranteed savings)\b/i,
  },
];

export const normalizeMiraPublicAnswerText = (answer = "") =>
  normalizeMiraAnswerPresentation(answer, { suppressInternal: false })
    .replace(
      /\bSupports payment workflows to support payment processing steps and records\.?/gi,
      "Supports vendor bill review, discrepancy tracking, approval workflows, and payment workflows.",
    )
    .replace(
      /\bpayment workflows to support payment processing steps and records\b/gi,
      "vendor bill review, discrepancy tracking, approval workflows, and payment workflows",
    );

const isSafeCorrectionContext = (answer, label) => {
  const hasCorrectionLanguage =
    /\b(cannot|can't|do not|don't|does not|should not|avoid|rather than|instead of|not describe|not use)\b/i.test(
      answer,
    );

  if (!hasCorrectionLanguage) return false;

  if (label.toLowerCase().includes("hipaa")) {
    return /HIPAA Security Rule Compliance Assessment Completed/i.test(answer);
  }

  if (label.toLowerCase().includes("soc 2")) {
    return /SOC 2 Type II Attested/i.test(answer);
  }

  if (label.toLowerCase().includes("compliance") || label.toLowerCase().includes("compliant")) {
    return /\b(readiness|assessment|evidence|control documentation|care@onesmarter\.com)\b/i.test(
      answer,
    );
  }

  if (label.toLowerCase() === "hippa") {
    return /\bHIPAA\b/.test(answer);
  }

  return false;
};

const safeFallbackFor = ({ message = "", localHarnessResult, claimRules = miraClaimRules } = {}) => {
  const fallback = localHarnessResult || runMiraLocalHarness(message || "What does OneSmarter do?");
  const fallbackResponse =
    fallback.answerSeed ||
    claimRules.refusalPatterns.find((pattern) => pattern.category === "unknown_or_not_grounded")
      ?.response ||
    "I do not have an approved public answer for that yet. For business-specific questions, email care@onesmarter.com.";

  return {
    answer: fallbackResponse,
    handoffNeeded: Boolean(fallback.handoffNeeded),
    handoffReason: fallback.handoffReason || "safe_fallback",
    suggestedFollowUps: fallback.suggestedFollowUps || [],
    groundingStatus: fallback.confidence === "low" ? "insufficient_context" : "grounded",
    outputSafetyStatus: "corrected",
  };
};

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

export const validateMiraModelOutput = (
  modelOutput,
  {
    message = "",
    riskFlags = [],
    localHarnessResult,
    claimRules = miraClaimRules,
  } = {},
) => {
  const violations = [];

  if (!isObject(modelOutput)) {
    return {
      valid: false,
      violations: ["model_output_malformed"],
      safeFallback: safeFallbackFor({ message, localHarnessResult, claimRules }),
    };
  }

  if (typeof modelOutput.answer !== "string" || !modelOutput.answer.trim()) {
    violations.push("answer_missing_or_invalid");
  }

  if (typeof modelOutput.handoffNeeded !== "boolean") {
    violations.push("handoff_needed_invalid");
  }

  if (
    modelOutput.handoffReason !== null &&
    modelOutput.handoffReason !== undefined &&
    typeof modelOutput.handoffReason !== "string"
  ) {
    violations.push("handoff_reason_invalid");
  }

  if (!Array.isArray(modelOutput.suggestedFollowUps)) {
    violations.push("suggested_followups_invalid");
  }

  if (!VALID_GROUNDING_STATUSES.has(modelOutput.groundingStatus)) {
    violations.push("grounding_status_invalid");
  }

  if (!VALID_OUTPUT_SAFETY_STATUSES.has(modelOutput.outputSafetyStatus)) {
    violations.push("output_safety_status_invalid");
  }

  const answer = normalizeMiraPublicAnswerText(modelOutput.answer || "");
  if (answer.length > MAX_MODEL_ANSWER_CHARS) {
    violations.push("answer_too_long");
  }

  if (RAW_HTML_PATTERN.test(answer)) {
    violations.push("raw_html_not_allowed");
  }

  for (const { label, pattern } of INTERNAL_RETRIEVAL_LANGUAGE_PATTERNS) {
    if (pattern.test(answer)) {
      violations.push(label);
    }
  }

  for (const { label, pattern } of PROHIBITED_PATTERNS) {
    if (pattern.test(answer) && !isSafeCorrectionContext(answer, label)) {
      violations.push(`prohibited_phrase:${label}`);
    }
  }

  for (const { label, pattern } of UNSUPPORTED_EXAMPLE_PATTERNS) {
    if (pattern.test(answer)) {
      violations.push(label);
    }
  }

  if (PHI_INVITATION_PATTERN.test(answer)) {
    violations.push("invites_phi_or_confidential_submission");
  }

  if (/\bguarantee(s|d)?\b.*\b(compliance|secure|security)\b/i.test(answer)) {
    violations.push("unsupported_guarantee");
  }

  if (
    riskFlags.some((flag) => HANDOFF_REQUIRED_FLAGS.has(flag)) &&
    modelOutput.handoffNeeded !== true
  ) {
    violations.push("handoff_required_for_risk");
  }

  if (modelOutput.groundingStatus === "insufficient_context" && modelOutput.handoffNeeded !== true) {
    violations.push("handoff_required_for_insufficient_context");
  }

  if (violations.length) {
    return {
      valid: false,
      violations,
      safeFallback: safeFallbackFor({ message, localHarnessResult, claimRules }),
    };
  }

  return {
    valid: true,
    violations: [],
    correctedOutput: {
      answer: answer.trim(),
      handoffNeeded: modelOutput.handoffNeeded,
      handoffReason: modelOutput.handoffReason || null,
      suggestedFollowUps: modelOutput.suggestedFollowUps,
      groundingStatus: modelOutput.groundingStatus,
      outputSafetyStatus: modelOutput.outputSafetyStatus,
    },
  };
};

export default validateMiraModelOutput;
