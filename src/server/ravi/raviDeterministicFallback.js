import { raviApprovedKnowledge } from "../../data/agentKnowledge/raviApprovedKnowledge.js";
import { RAVI_CLAIM_STATUSES } from "../../data/agentKnowledge/raviClaimRules.js";
import { isRaviSimpleProposition } from "./raviApprovedAnswer.js";
import { runRaviLocalEngine } from "./raviLocalEngine.js";
import { validateRaviModelOutput } from "./raviOutputValidator.js";

// Prepare a bounded answer from the existing engine, never from provider prose.
// A topic match alone cannot authorize permissions, causes or compound reasoning.
export const prepareRaviDeterministicFallback = ({ semanticIntent, selection, allowed }) => {
  if (!allowed || semanticIntent.clarificationNeeded || !isRaviSimpleProposition(semanticIntent) ||
      !["status", "how", "follow_up", "scope_check", "clarification", "recommendation_request"].includes(semanticIntent.questionType) ||
      !["question", "explanation_request", "scope_request", "clarification_request", "recommendation_request"].includes(semanticIntent.speechAct) ||
      ["negative", "mixed"].includes(semanticIntent.polarity) || semanticIntent.negationScope.length ||
      !["clarify", "answer_proposition", "explain_proposition", "evaluate_request"].includes(semanticIntent.intentFocus.operation)) return null;
  // The extractive plan evaluates different text: selected whole source statements.
  // Its coverage/qualification verdict cannot validate or invalidate the local
  // engine's independently qualified answer. Validate that answer below instead.
  // Legacy injected providers have no evidence plan; preserve their explicit
  // non-descriptive decision rather than reinterpret that older contract.
  if (selection && !Array.isArray(selection.evidenceIds)) return null;
  const entry = raviApprovedKnowledge.find(entry => [entry.id, entry.title].includes(semanticIntent.topic));
  if (!entry) return null;
  if (semanticIntent.entities[0] === "Ravi Sen" && entry.id !== "ravi-professional-role") return null;
  const result = runRaviLocalEngine({ semanticIntent });
  if (result.clarificationNeeded || result.matchedEntries.length !== 1 || result.matchedEntries[0].id !== entry.id ||
      ![RAVI_CLAIM_STATUSES.ALLOW, RAVI_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION].includes(result.claimEvaluation?.status)) return null;
  const validation = validateRaviModelOutput({ answer: result.answer, handoffNeeded: false,
    handoffReason: null, suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed" },
  { matchedEntries: result.matchedEntries, visitorSuppliedEntities: semanticIntent.entities });
  return validation.valid ? { ...result, answer: validation.correctedOutput.answer } : null;
};
