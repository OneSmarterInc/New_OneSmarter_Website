const VALID_GROUNDING = new Set(["grounded", "insufficient_context", "refused"]);
const VALID_SAFETY = new Set(["passed", "corrected", "refused"]);
const INTERNAL_LEAK = /\b(?:system prompt|developer message|internal instructions?|runtime metadata|retrieval result|matched sources?|source labels?|rule id|risk flags?|api key|secret|generation notes?)\b/i;
const CAFE_LEAK = /\b(?:café persona|cafe persona|off-duty|cricket|street food|grandmother|brother|café biography|cafe biography)\b/i;
const FABRICATED_SOURCE = /\b(?:according to|source:|citation:|retrieved from)\b|https?:\/\//i;
const ACTION_CLAIM = /\b(?:I|Ravi|we)\s+(?:have\s+)?(?:accessed|opened|closed|changed|edited|assigned|routed|escalated|performed)\b|\b(?:I|Ravi|we)\s+(?:can|will)\s+(?:access|open|close|change|edit|assign|route|escalate)\b/i;
const ACCESS_CLAIM = /\b(?:I|Ravi|we)\s+(?:have|has)\s+(?:live\s+)?access\b/i;
const POSITIVE_GUARANTEE = /\b(?:I|Ravi|we|OneSmarter|the platform|the workflow|the service)\s+(?:can\s+|will\s+)?(?:guarantee|guarantees|ensure|ensures)\b.{0,100}\b(?:SLA|hours?|resolution|resolved|compliance|compliant|audit|readiness|outcome|result)\b/i;
const NAMED_INTEGRATION = /\b(?:integrates?|connected)\s+with\s+[A-Z][A-Za-z0-9._-]+/;
const CUSTOMER_CLAIM = /\b(?:customer|client)\s+[A-Z][A-Za-z0-9&._ -]{1,40}\s+(?:uses?|achieved|reduced|improved)\b/i;
const COMMERCIAL_CLAIM = /(?:[$€£]\s*\d|\b(?:costs?|priced at)\s+\d|\b(?:implemented|delivered|goes? live)\s+in\s+\d+\s+(?:days?|weeks?|months?)\b)/i;

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const clean = (value = "") => String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const safeBoundary = (answer) => /\b(?:not|does not|do not|cannot|can't|instead|confirm|no approved)\b/i.test(answer);

export const validateRaviModelOutput = (output, { matchedEntries = [], fallbackResult } = {}) => {
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
  if (INTERNAL_LEAK.test(answer)) violations.push("internal_instruction_leak");
  if (CAFE_LEAK.test(answer)) violations.push("cafe_persona_leak");
  if (FABRICATED_SOURCE.test(answer)) violations.push("fabricated_source_reference");
  if (ACTION_CLAIM.test(answer) || ACCESS_CLAIM.test(answer)) {
    violations.push("live_system_action_claim");
  }
  if (POSITIVE_GUARANTEE.test(answer)) violations.push("unsupported_guarantee");
  if (NAMED_INTEGRATION.test(answer) && !safeBoundary(answer)) violations.push("invented_integration");
  if (CUSTOMER_CLAIM.test(answer) && !safeBoundary(answer)) violations.push("invented_customer_claim");
  if (COMMERCIAL_CLAIM.test(answer) && !safeBoundary(answer)) violations.push("invented_commercial_detail");
  if (output?.groundingStatus === "grounded" && matchedEntries.length === 0) {
    violations.push("grounded_without_approved_evidence");
  }
  if (output?.groundingStatus === "insufficient_context" && output?.handoffNeeded !== true) {
    violations.push("insufficient_context_requires_handoff");
  }

  if (violations.length) {
    return {
      valid: false,
      violations: [...new Set(violations)],
      fallbackResult,
    };
  }
  return {
    valid: true,
    violations: [],
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

export default validateRaviModelOutput;
