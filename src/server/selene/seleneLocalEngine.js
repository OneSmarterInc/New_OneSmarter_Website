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

const RETRIEVAL_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does",
  "for", "from", "how", "i", "in", "is", "it", "of", "on", "one", "or",
  "our", "that", "the", "their", "this", "to", "what", "when", "why",
  "with", "you", "your",
]);

const stem = (token) => {
  if (token.length <= 4) return token;
  if (token.endsWith("ation") && token.length > 7) return `${token.slice(0, -5)}ate`;
  if (token.endsWith("al") && token.length > 6) return token.slice(0, -2);
  if (token.endsWith("ing") && token.length > 6) return token.slice(0, -3);
  if (token.endsWith("ed") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("es") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 5) return token.slice(0, -1);
  return token;
};

const retrievalTokens = (value = "") => [...new Set(
  normalized(value).replace(/[-/]/g, " ").split(" ")
    .filter((token) => token.length > 2 && !RETRIEVAL_STOP_WORDS.has(token))
    .map(stem),
)];

const entryRetrievalFields = (entry) => ({
  identity: [entry.id, entry.title],
  summary: [entry.approvedSummary],
  detail: [
    ...(entry.sourceFacts || []),
    ...(entry.allowedClaims || []),
    ...(entry.requiredQualifications || []),
    ...(entry.unsupportedExtensions || []),
  ],
});

const entryTokenSets = new Map(seleneApprovedKnowledge.map((entry) => {
  const fields = entryRetrievalFields(entry);
  return [entry.id, {
    identity: new Set(retrievalTokens(fields.identity.join(" "))),
    summary: new Set(retrievalTokens(fields.summary.join(" "))),
    detail: new Set(retrievalTokens(fields.detail.join(" "))),
  }];
}));

const tokenDocumentFrequency = new Map();
for (const tokenSets of entryTokenSets.values()) {
  const tokens = new Set([...tokenSets.identity, ...tokenSets.summary, ...tokenSets.detail]);
  for (const token of tokens) tokenDocumentFrequency.set(token, (tokenDocumentFrequency.get(token) || 0) + 1);
}

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
  const tokens = retrievalTokens(message);
  if (!topic || !tokens.length || limit <= 0) return [];
  const exactMatches = seleneApprovedKnowledge.filter((entry) =>
    [entry.id, entry.title].some((value) => normalized(value) === topic));
  if (exactMatches.length) return exactMatches.slice(0, limit);
  return seleneApprovedKnowledge
    .map((entry, order) => {
      const fields = entryTokenSets.get(entry.id);
      let score = 0;
      let matches = 0;
      for (const token of tokens) {
        const frequency = tokenDocumentFrequency.get(token) || seleneApprovedKnowledge.length;
        const rarity = 1 + Math.log2((seleneApprovedKnowledge.length + 1) / frequency);
        const fieldWeight = fields.identity.has(token) ? 5
          : fields.summary.has(token) ? 3
          : fields.detail.has(token) ? 1.5
          : 0;
        if (!fieldWeight) continue;
        score += fieldWeight * rarity;
        matches += 1;
      }
      return { entry, order, score, matches };
    })
    .filter(({ score, matches }) => score >= 6 && matches >= 2)
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .slice(0, limit)
    .map(({ entry }) => entry);
};

const intentFallback = (semanticIntent, evaluation, matched) => {
  if (evaluation.status === SELENE_CLAIM_STATUSES.HANDOFF_UNSUPPORTED) {
    if (semanticIntent.questionType === "negative_confirmation") return `Correct. ${evaluation.reason} ${evaluation.approvedAlternative}`;
    if (semanticIntent.questionType === "why") return `${evaluation.reason} The approved information does not provide a further reason.`;
    return evaluation.approvedAlternative;
  }
  if (evaluation.status === SELENE_CLAIM_STATUSES.ANSWER_WITH_QUALIFICATION) {
    if (semanticIntent.questionType === "negative_confirmation") return `Yes, that's correct. ${evaluation.reason} ${evaluation.approvedAlternative}`;
    if (semanticIntent.questionType === "why") return `${evaluation.reason} ${evaluation.approvedAlternative}`;
    return evaluation.approvedAlternative;
  }
  if (semanticIntent.questionType === "negative_confirmation") {
    return `Yes, that's correct. ${matched[0]?.approvedSummary || evaluation.approvedAlternative}`;
  }
  if (semanticIntent.polarity === "negative") {
    const boundaries = matched.flatMap((entry) => entry.unsupportedExtensions || []);
    if (boundaries.length) return `The approved information does not establish: ${boundaries.join("; ")}.`;
  }
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
  const exactSemanticTopic = semanticIntent
    ? seleneApprovedKnowledge.find((entry) => [entry.id, entry.title]
        .some((value) => normalized(value) === normalized(semanticIntent.topic)))
    : null;
  const matched = exactSemanticTopic ? [exactSemanticTopic] : semanticIntent
    ? retrieveSeleneKnowledge([
        semanticIntent.topic,
        semanticIntent.proposition,
        semanticIntent.requestedDetail,
        ...(semanticIntent.entities || []),
      ].filter(Boolean).join(" "))
    : [];
  const ids = matched.map(({ id }) => id);
  const evaluationText = semanticIntent
    ? [message, semanticIntent.proposition, semanticIntent.requestedDetail, ...(semanticIntent.entities || [])].filter(Boolean).join(" ")
    : message;
  const evaluated = evaluateSeleneClaim(evaluationText);
  const semanticRecommendationBoundary = semanticIntent?.questionType === "recommendation_request"
    ? {
        status: SELENE_CLAIM_STATUSES.HANDOFF_UNSUPPORTED,
        reason: "Individualized agent selection and customer architecture require human discovery and judgment.",
        ruleId: "semantic-customer-specific-strategy",
        approvedAlternative: "Selene can explain OneSmarter's approved agent architecture, but cannot choose or design a customer-specific architecture. Contact care@onesmarter.com for a scoped human review.",
      }
    : null;
  const semanticOrchestrationBoundary = ids.includes("current-orchestration-vs-future-collaboration")
    ? {
        status: SELENE_CLAIM_STATUSES.ANSWER_WITH_QUALIFICATION,
        reason: "Autonomous agent-to-agent production delegation is not currently implemented.",
        ruleId: "approved-current-orchestration-boundary",
        approvedAlternative: `Autonomous agent-to-agent production delegation or messaging is not currently implemented. ${matched[0].approvedSummary}`,
      }
    : null;
  const semanticLiveAction = semanticIntent?.domain === "live_system_action" && matched.length;
  const evaluation = semanticRecommendationBoundary || semanticOrchestrationBoundary || (semanticLiveAction
    ? {
        status: SELENE_CLAIM_STATUSES.HANDOFF_UNSUPPORTED,
        reason: "Selene's approved professional-role evidence does not establish live access to or action in visitor or customer systems.",
        ruleId: "semantic-live-system-action-boundary",
        approvedAlternative: "The relevant professional agent may explain its approved role, but no agent has accessed, changed, or acted in a visitor or customer system.",
      }
    : semanticIntent && matched.length && evaluated.ruleId === "outside-approved-selene-slice"
    ? { status: SELENE_CLAIM_STATUSES.ANSWER, reason: "Validated semantic topic matched approved Selene evidence.", ruleId: "approved-semantic-topic", approvedAlternative: matched[0].approvedSummary }
    : evaluated);

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
