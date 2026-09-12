import { seleneApprovedKnowledge } from "../../data/agentKnowledge/seleneApprovedKnowledge.js";
import {
  SELENE_CLAIM_STATUSES,
  evaluateSeleneClaim,
} from "../../data/agentKnowledge/seleneClaimRules.js";

export const SELENE_SCOPE_CLARIFICATION =
  "I can explain OneSmarter's focused-agent roles, approved knowledge boundaries, claim validation, Café separation, current orchestration model, and accuracy-preserving depletion. What would you like to review?";

const normalized = (value = "") => String(value).toLowerCase()
  .replace(/[‐‑‒–—]/g, "-")
  .replace(/[^a-z0-9éèêëàáâäïîôöùúûüç\s/-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const compactSource = (entry) => ({
  id: entry.id,
  title: entry.title,
  route: entry.route,
  sourceLabel: entry.sourceReference?.sourceLabel || "",
});

const entriesFor = (ids = []) => ids
  .map((id) => seleneApprovedKnowledge.find((entry) => entry.id === id))
  .filter(Boolean);

const result = ({ answer, ids = [], confidence = "high", clarificationNeeded = false, claimEvaluation }) => {
  const matchedEntries = entriesFor(ids);
  return {
    answer,
    matchedEntries,
    sources: matchedEntries.map(compactSource),
    confidence,
    clarificationNeeded,
    clarificationQuestion: clarificationNeeded
      ? "Which approved OneSmarter agent-architecture topic would you like to review?"
      : "",
    claimEvaluation,
    chargeEligible: claimEvaluation?.status !== SELENE_CLAIM_STATUSES.HANDOFF_UNSUPPORTED,
  };
};

export const retrieveSeleneKnowledge = (message = "", limit = 3) => {
  const topic = normalized(message);
  return seleneApprovedKnowledge.filter((entry) =>
    [entry.id, entry.title].some((value) => normalized(value) === topic)).slice(0, limit);
};

const intentFallback = (semanticIntent, evaluation, matched) => {
  if (evaluation.status === SELENE_CLAIM_STATUSES.HANDOFF_UNSUPPORTED) {
    if (semanticIntent.questionType === "negative_confirmation") return `Correct. ${evaluation.reason} ${evaluation.approvedAlternative}`;
    if (semanticIntent.questionType === "why") return `${evaluation.reason} The approved information does not provide a further reason.`;
    return evaluation.approvedAlternative;
  }
  if (evaluation.status === SELENE_CLAIM_STATUSES.ANSWER_WITH_QUALIFICATION) {
    if (semanticIntent.questionType === "negative_confirmation") return `Correct. ${evaluation.reason} ${evaluation.approvedAlternative}`;
    if (semanticIntent.questionType === "why") return `${evaluation.reason} ${evaluation.approvedAlternative}`;
    return evaluation.approvedAlternative;
  }
  if (semanticIntent.polarity === "negative") {
    const boundaries = matched.flatMap((entry) => entry.unsupportedExtensions || []);
    if (boundaries.length) return `The approved information does not establish: ${boundaries.join("; ")}.`;
  }
  const roleEntry = matched.find(({ id }) => id === "professional-agent-role-separation");
  if (roleEntry) return roleEntry.sourceFacts.join(" ");
  if (semanticIntent.questionType === "recommendation_request") {
    return `${matched[0]?.approvedSummary || SELENE_SCOPE_CLARIFICATION} Selene does not provide customer-specific selection or architecture advice.`;
  }
  return matched[0]?.approvedSummary || SELENE_SCOPE_CLARIFICATION;
};

export const runSeleneLocalEngine = ({ message = "", semanticIntent = null, verbosityBand = "normal" } = {}) => {
  if (semanticIntent?.clarificationNeeded) return result({
    answer: SELENE_SCOPE_CLARIFICATION,
    confidence: "low",
    clarificationNeeded: true,
  });
  const matched = semanticIntent ? retrieveSeleneKnowledge(semanticIntent.topic) : [];
  const ids = matched.map(({ id }) => id);
  const evaluationText = semanticIntent
    ? [message, semanticIntent.proposition, semanticIntent.requestedDetail, ...(semanticIntent.entities || [])].filter(Boolean).join(" ")
    : message;
  const evaluated = evaluateSeleneClaim(evaluationText);
  const evaluation = semanticIntent && matched.length && evaluated.ruleId === "outside-approved-selene-slice"
    ? { status: SELENE_CLAIM_STATUSES.ANSWER, reason: "Validated semantic topic matched approved Selene evidence.", ruleId: "approved-semantic-topic", approvedAlternative: matched[0].approvedSummary }
    : evaluated;

  if (semanticIntent && matched.length) return result({
    answer: intentFallback(semanticIntent, evaluation, matched),
    ids,
    claimEvaluation: evaluation,
  });

  if (evaluation.status === SELENE_CLAIM_STATUSES.HANDOFF_UNSUPPORTED) {
    const unrelated = evaluation.ruleId === "outside-approved-selene-slice";
    return result({
      answer: unrelated ? SELENE_SCOPE_CLARIFICATION : evaluation.approvedAlternative,
      ids: unrelated ? [] : ids,
      confidence: unrelated ? "low" : "high",
      clarificationNeeded: unrelated,
      claimEvaluation: evaluation,
    });
  }

  let answer = evaluation.status === SELENE_CLAIM_STATUSES.ANSWER_WITH_QUALIFICATION
    ? `${evaluation.reason} ${evaluation.approvedAlternative}` : evaluation.approvedAlternative;

  if (verbosityBand === "concise") {
    // The evaluated alternative already contains every required boundary; only optional prose is omitted.
    answer = answer.trim();
  }
  return result({ answer, ids, claimEvaluation: evaluation });
};

export default runSeleneLocalEngine;
