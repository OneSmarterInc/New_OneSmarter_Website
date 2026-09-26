import { raviApprovedKnowledge } from "../../data/agentKnowledge/raviApprovedKnowledge.js";
import { RAVI_CLAIM_STATUSES } from "../../data/agentKnowledge/raviClaimRules.js";
import { isRaviSimpleProposition } from "./raviApprovedAnswer.js";
import { runRaviLocalEngine } from "./raviLocalEngine.js";
import { validateRaviModelOutput } from "./raviOutputValidator.js";
import { resolveRaviEvidenceIds } from "./raviEvidenceCatalog.js";

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
  const topic = String(semanticIntent.topic || "").trim().toLowerCase();
  const entry = raviApprovedKnowledge.find(record =>
    [record.id, record.title].some(label => label.trim().toLowerCase() === topic));
  const units = !entry && selection?.subjectsPreserved === true && selection?.qualificationsPreserved === true &&
    ["public_information", "general_guidance"].includes(selection.requestKind)
    ? resolveRaviEvidenceIds(selection.evidenceIds) : null;
  const approvedEntries = entry ? [entry] : [...new Set((units || []).map(unit => unit.entryId))]
    .map(id => raviApprovedKnowledge.find(record => record.id === id));
  if (!approvedEntries.length) return null;
  if (semanticIntent.entities[0] === "Ravi Sen" && approvedEntries.some(record => record.id !== "ravi-professional-role")) return null;
  const result = runRaviLocalEngine({ semanticIntent, approvedEntries });
  if (result.clarificationNeeded || !result.matchedEntries.length ||
      ![RAVI_CLAIM_STATUSES.ALLOW, RAVI_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION].includes(result.claimEvaluation?.status)) return null;
  const output = { answer: result.answer, handoffNeeded: false,
    handoffReason: null, suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed" };
  // This answer is server-owned text, not a visitor-entity boundary response.
  // Do not let a visitor entity exemption stand in for its factual evidence.
  const validate = matchedEntries => validateRaviModelOutput(output, { matchedEntries });
  let matchedEntries = result.matchedEntries;
  let validation = validate(matchedEntries);
  // A claim rule can supply qualified guidance whose factual basis belongs to
  // another approved record. Validate the unchanged local answer against each
  // canonical record; never treat the interpreted topic label as its evidence.
  if (!validation.valid && result.claimEvaluation.status === RAVI_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION) {
    const supportingEntry = raviApprovedKnowledge.find(record => validate([record]).valid);
    if (supportingEntry) {
      matchedEntries = [supportingEntry];
      validation = validate(matchedEntries);
    }
  }
  return validation.valid ? { ...result, answer: validation.correctedOutput.answer, matchedEntries,
    sources: matchedEntries.map(record => ({ id: record.id, title: record.title, route: record.route,
      sourceLabel: record.sourceReference?.sourceLabel || "" })) } : null;
};
