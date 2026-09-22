import { verifyAgentAnswerGrounding } from "../agentGrounding/agentGroundingVerifier.js";

const VALID_GROUNDING = new Set(["grounded", "insufficient_context", "refused"]);
const VALID_SAFETY = new Set(["passed", "corrected", "refused"]);
const INTERNAL = /\b(?:system prompt|developer message|internal instructions?|runtime metadata|retrieval result|source labels?|rule id|risk flags?|api key|secret|state key|storage backend|persistence diagnostics?)\b/i;
const CAFE = /\b(?:café persona|cafe persona|off-duty|six towns|father collected|second-hand books|radio documentaries|café biography|cafe biography)\b/i;
const SOURCE = /\b(?:according to|source:|citation:|retrieved from)\b|https?:\/\//i;
const AUTONOMOUS = /\b(?:agents?|OneSmarter)\b.{0,70}\b(?:autonomously|automatically)\b.{0,50}\b(?:collaborate|delegate|coordinate|message|route)\b|\b(?:live|production)\s+agent-to-agent\s+(?:delegation|orchestration)\b/i;
const STRATEGY = /\b(?:I|Selene|we)\s+(?:can|will|have)\s+(?:design|recommend|create|build)\b.{0,50}\b(?:your|customer|company-specific|business-specific)\b.{0,30}\b(?:strategy|architecture|agent deployment)\b/i;
const GUARANTEE = /\b(?:guarantee|guarantees|guaranteed)\b.{0,100}\b(?:AI|business|transformation|outcome|result|success|accuracy)\b/i;
const ROADMAP = /\b(?:will launch|launches|available|ships)\b.{0,40}\b(?:autonomous|multi-agent|agent-to-agent)\b|\b(?:autonomous|multi-agent|agent-to-agent)\b.{0,40}\b(?:in 20\d\d|next (?:month|quarter|year))\b/i;
const CUSTOMER = /\b(?:customer|client)\s+[A-Z][A-Za-z0-9&._-]*(?:\s+[A-Z][A-Za-z0-9&._-]*){0,3}\s+(?:uses?|achieved|improved|deployed)\b/i;

const clean = (value = "") => String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const safeBoundary = (answer) => /\b(?:not|does not|do not|cannot|isn't|is not|no approved|instead)\b/i.test(answer);

export const validateSeleneModelOutput = (output, { matchedEntries = [], fallbackResult } = {}) => {
  const violations = [];
  if (!isObject(output)) violations.push("invalid_shape");
  if (typeof output?.answer !== "string" || !output.answer.trim()) violations.push("invalid_answer");
  if (typeof output?.handoffNeeded !== "boolean") violations.push("invalid_handoff_state");
  if (output?.handoffReason != null && typeof output.handoffReason !== "string") violations.push("invalid_handoff_reason");
  if (!Array.isArray(output?.suggestedFollowUps) || output?.suggestedFollowUps?.some((item) => typeof item !== "string")) violations.push("invalid_followups");
  if (!VALID_GROUNDING.has(output?.groundingStatus)) violations.push("invalid_grounding_status");
  if (!VALID_SAFETY.has(output?.outputSafetyStatus)) violations.push("invalid_output_safety_status");

  const answer = clean(output?.answer);
  if (INTERNAL.test(answer)) violations.push("internal_metadata_leak");
  if (CAFE.test(answer)) violations.push("cafe_persona_leak");
  if (SOURCE.test(answer)) violations.push("fabricated_source_reference");
  if (AUTONOMOUS.test(answer) && !safeBoundary(answer)) violations.push("autonomous_orchestration_claim");
  if (STRATEGY.test(answer)) violations.push("customer_strategy_claim");
  if (GUARANTEE.test(answer) && !safeBoundary(answer)) violations.push("unsupported_guarantee");
  if (ROADMAP.test(answer) && !safeBoundary(answer)) violations.push("invented_roadmap");
  if (CUSTOMER.test(answer) && !safeBoundary(answer)) violations.push("invented_customer_claim");
  if (output?.groundingStatus === "grounded" && matchedEntries.length === 0) violations.push("grounded_without_approved_evidence");
  if (output?.groundingStatus === "insufficient_context" && output?.handoffNeeded !== true) violations.push("insufficient_context_requires_handoff");
  if (output?.groundingStatus === "grounded") {
    const grounding = verifyAgentAnswerGrounding({ answer, approvedEntries: matchedEntries });
    if (!grounding.grounded) violations.push(...grounding.violations);
  }

  if (violations.length) return { valid: false, violations: [...new Set(violations)], fallbackResult };
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

export default validateSeleneModelOutput;
