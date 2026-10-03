import { raviApprovedKnowledge } from "../../data/agentKnowledge/raviApprovedKnowledge.js";
import {
  RAVI_CLAIM_STATUSES,
  evaluateRaviClaim,
} from "../../data/agentKnowledge/raviClaimRules.js";

const RAVI_CLARIFICATION =
  "I can help explain secure ticketing, case management, workflow tracking, audit history, workflow modernization, routing, escalation design, and operational support. What would you like to review?";

const normalized = (value = "") => String(value).toLowerCase()
  .replace(/[‐‑‒–—]/g, "-")
  .replace(/[^a-z0-9\s/-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const compactSource = (entry) => ({
  id: entry.id,
  title: entry.title,
  route: entry.route,
  sourceLabel: entry.sourceReference?.sourceLabel || "",
});

const entriesFor = (ids = []) => ids
  .map((id) => raviApprovedKnowledge.find((entry) => entry.id === id))
  .filter(Boolean);

const localResult = ({
  answer,
  ids = [],
  confidence = "high",
  clarificationNeeded = false,
  clarificationQuestion = "",
  claimEvaluation = null,
}) => {
  const matchedEntries = entriesFor(ids);
  return {
    answer,
    matchedEntries,
    sources: matchedEntries.map(compactSource),
    confidence,
    clarificationNeeded,
    clarificationQuestion,
    claimEvaluation,
  };
};

// Derive retrieval vocabulary from approved records so new entries cannot be
// silently excluded by an independently maintained topic table. These scores
// select evidence only; claim rules and semantic/grounding checks still apply.
const retrievalTokens = value => new Set(normalized(value)
  .split("-").join(" ").split("/").join(" ").split(" ").filter(Boolean));

export const retrieveRaviKnowledge = (message = "", limit = 3) => {
  const query = retrievalTokens(message);
  if (!query.size) return [];
  const documents = raviApprovedKnowledge.map(entry => ({
    entry,
    title: retrievalTokens(entry.title),
    content: retrievalTokens([entry.approvedSummary, ...entry.sourceFacts, ...entry.allowedClaims].join(" ")),
  }));
  const weights = new Map([...new Set(documents.flatMap(document =>
    [...document.title, ...document.content]))].map(token => [token,
    Math.log(1 + documents.length / documents.filter(document =>
      document.title.has(token) || document.content.has(token)).length),
  ]));
  const similarity = tokens => {
    const magnitude = Math.sqrt([...tokens].reduce((sum, token) => sum + weights.get(token) ** 2, 0));
    return magnitude ? [...query].filter(token => tokens.has(token))
      .reduce((sum, token) => sum + weights.get(token) ** 2, 0) / magnitude : 0;
  };
  return documents.map(({ entry, title, content }) => ({
    ...entry,
    score: 2 * similarity(title) + similarity(content),
  }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id))
    .slice(0, limit);
};

const retrieveRaviKnowledgeForIntent = (semanticIntent, limit = 3) => {
  const normalizedTopic = normalized(semanticIntent?.topic);
  const exactTopicMatches = raviApprovedKnowledge.filter((entry) =>
    [entry.id, entry.title].some((value) => normalized(value) === normalizedTopic));
  if (exactTopicMatches.length) return exactTopicMatches.slice(0, limit);
  // Keep a resolved topic ahead of incidental entity names in its explanation.
  // Entities still remain intact for subject/permission checks downstream.
  const topicMatches = retrieveRaviKnowledge(normalizedTopic, limit);
  if (topicMatches.length) return topicMatches;
  const semanticText = [
    semanticIntent?.topic,
    semanticIntent?.proposition,
    ...(semanticIntent?.entities || []),
    semanticIntent?.requestedDetail,
  ].filter(Boolean).join(" ");
  return retrieveRaviKnowledge(semanticText, limit);
};

const semanticSubject = (semanticIntent = {}) => String(semanticIntent.entities?.[0] || "").trim().slice(0, 100);
const isRaviSubject = (semanticIntent = {}) => ["ravi", "ravi sen"].includes(normalized(semanticSubject(semanticIntent)));

const isStructuredLiveActionRequest = (semanticIntent = {}) => {
  if (!isRaviSubject(semanticIntent) || semanticIntent.intentFocus?.operation !== "evaluate_request") return false;
  const requestsExecution = semanticIntent.questionType === "handoff_request" ||
    (semanticIntent.questionType === "unknown" && semanticIntent.speechAct === "unknown");
  if (!requestsExecution) return false;
  const focusedIds = new Set(semanticIntent.intentFocus?.propositionIds || []);
  return (semanticIntent.atomicPropositions || []).some((proposition) =>
    focusedIds.has(proposition.id) && proposition.contextStatus === "current_turn" &&
    proposition.epistemicStatus === "asserted");
};

const thirdPartyPermissionFallback = (semanticIntent) => {
  const subject = semanticSubject(semanticIntent) || "that person or customer user";
  const requested = String(semanticIntent.requestedDetail || "their requested access or permission").trim().slice(0, 240);
  if (semanticIntent.questionType === "why") {
    return `I cannot verify why ${subject} has or lacks that permission. Ravi's approved information does not establish ${requested}; customer-user permissions depend on the customer's own system configuration and authorization.`;
  }
  return `I cannot verify whether ${subject} has that permission. Ravi's approved information does not establish ${requested}; customer-user permissions depend on the customer's own system configuration and authorization.`;
};

const isThirdPartyPermissionQuestion = (semanticIntent = {}) =>
  !isRaviSubject(semanticIntent) &&
  ["positive_yes_no", "negative_confirmation", "status", "why"].includes(semanticIntent.questionType) &&
  ["answer_proposition", "explain_proposition"].includes(semanticIntent.intentFocus?.operation);

const semanticBoundaryFallback = (semanticIntent, claimEvaluation, matchedEntries) => {
  if (claimEvaluation.ruleId === "no-real-system-actions" && isThirdPartyPermissionQuestion(semanticIntent)) {
    return thirdPartyPermissionFallback(semanticIntent);
  }
  if (claimEvaluation.status === RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED) {
    if (semanticIntent.questionType === "negative_confirmation") {
      return `Correct. ${claimEvaluation.reason} ${claimEvaluation.approvedAlternative}`;
    }
    if (semanticIntent.questionType === "why") {
      return `${claimEvaluation.reason} The approved information does not provide a reason beyond that boundary.`;
    }
    if (semanticIntent.questionType === "positive_yes_no") {
      return `No. ${claimEvaluation.reason} ${claimEvaluation.approvedAlternative}`;
    }
    return claimEvaluation.approvedAlternative;
  }
  if (claimEvaluation.status === RAVI_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION) {
    return claimEvaluation.approvedAlternative;
  }
  if (semanticIntent.polarity === "negative") {
    const boundaries = matchedEntries.flatMap((entry) => entry.unsupportedExtensions || []);
    if (boundaries.length) return `The approved information does not establish: ${boundaries.join("; ")}.`;
  }
  if (semanticIntent.questionType === "unknown" || semanticIntent.speechAct === "unknown") {
    const boundaries = matchedEntries.flatMap((entry) => entry.unsupportedExtensions || []);
    if (boundaries.length) return `The approved information does not establish: ${boundaries.join("; ")}.`;
  }
  const roleDirectory = matchedEntries.find(({ id }) => id === "professional-agent-role-directory");
  if (roleDirectory) return roleDirectory.sourceFacts.join(" ");
  if ((semanticIntent.questionType === "recommendation_request" || semanticIntent.speechAct === "recommendation_request") && matchedEntries.length) {
    return `${matchedEntries[0].approvedSummary} The approved evidence supports general explanation only; it does not establish a customer-specific selection, implementation, or action.`;
  }
  return matchedEntries[0]?.approvedSummary || RAVI_CLARIFICATION;
};

const contextualMessage = (message, conversationHistory = []) => {
  if (!/\b(?:it|that|this|those|they|them)\b/i.test(message)) return message;
  const priorUser = [...conversationHistory].reverse().find(({ role }) => role === "user");
  return priorUser?.content ? `${message} ${priorUser.content}` : message;
};

export const runRaviLocalEngine = ({ message = "", conversationHistory = [], semanticIntent = null, approvedEntries = null } = {}) => {
  if (semanticIntent?.clarificationNeeded) {
    return localResult({
      answer: RAVI_CLARIFICATION,
      ids: [],
      confidence: "low",
      clarificationNeeded: true,
      clarificationQuestion: "Which approved operations topic would you like to review?",
    });
  }
  const semanticMessage = semanticIntent ? [
    semanticIntent.topic,
    semanticIntent.proposition,
    ...(semanticIntent.entities || []),
    semanticIntent.requestedDetail,
  ].filter(Boolean).join(" ") : "";
  const contextual = semanticMessage || contextualMessage(message, conversationHistory);
  const text = normalized(contextual);
  // Internal callers may supply canonical records already selected semantically.
  // This avoids a second textual retrieval decision for the same resolved request.
  const matchedEntries = approvedEntries || (semanticIntent
    ? retrieveRaviKnowledgeForIntent(semanticIntent)
    : retrieveRaviKnowledge(contextual));
  const matchedIds = matchedEntries.map(({ id }) => id);

  if (!semanticIntent && /\b(?:close|change|edit|open|assign|route|escalate|perform)\b.{0,50}\b(?:this|that|the|a)\s+(?:ticket|case)\b/i.test(contextual)) {
    return localResult({
      answer: "I cannot access or change a real ticket, queue, case, or production environment. I can explain a safe routing or escalation design using approved workflow capabilities.",
      ids: matchedIds,
      claimEvaluation: evaluateRaviClaim("Ravi cannot access or change a real customer ticket."),
    });
  }

  const evaluatedClaim = evaluateRaviClaim(contextual);
  const structuredActionEvaluation = semanticIntent && isStructuredLiveActionRequest(semanticIntent)
    ? evaluateRaviClaim("Ravi cannot perform an action in a real customer production system.")
    : null;
  const advisoryEvaluation = semanticIntent?.questionType === "recommendation_request" &&
    semanticIntent.intentFocus?.operation === "evaluate_request" &&
    evaluatedClaim.ruleId === "no-real-system-actions"
    ? evaluateRaviClaim("routing escalation handoff design")
    : null;
  const claimEvaluation = structuredActionEvaluation || advisoryEvaluation || (semanticIntent && matchedEntries.length
    && evaluatedClaim.ruleId === "outside-approved-operations-slice"
    ? {
        status: RAVI_CLAIM_STATUSES.ALLOW,
        reason: "The validated semantic topic matched Ravi's approved professional knowledge.",
        ruleId: "approved-semantic-topic",
        approvedAlternative: matchedEntries[0].approvedSummary,
      }
    : evaluatedClaim);
  if (semanticIntent && matchedEntries.length) {
    return localResult({
      answer: semanticBoundaryFallback(semanticIntent, claimEvaluation, matchedEntries),
      ids: matchedIds,
      confidence: "high",
      claimEvaluation,
    });
  }
  if (claimEvaluation.status === RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED) {
    const unrelated = claimEvaluation.ruleId === "outside-approved-operations-slice";
    return localResult({
      answer: semanticIntent
        ? semanticBoundaryFallback(semanticIntent, claimEvaluation, matchedEntries)
        : unrelated ? RAVI_CLARIFICATION : claimEvaluation.approvedAlternative,
      ids: unrelated ? [] : matchedIds,
      confidence: unrelated ? "low" : "high",
      clarificationNeeded: unrelated,
      clarificationQuestion: unrelated
        ? "Which approved operations topic would you like to review?"
        : "",
      claimEvaluation,
    });
  }

  if (claimEvaluation.status === RAVI_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION) {
    return localResult({
      answer: semanticIntent
        ? semanticBoundaryFallback(semanticIntent, claimEvaluation, matchedEntries)
        : claimEvaluation.approvedAlternative,
      ids: matchedIds,
      claimEvaluation,
    });
  }

  if (semanticIntent) {
    return localResult({
      answer: semanticBoundaryFallback(semanticIntent, claimEvaluation, matchedEntries),
      ids: matchedIds,
      claimEvaluation,
    });
  }

  if (/\b(?:secure ticketing|case management|audit history|workflow tracking)\b/i.test(text)) {
    return localResult({
      answer: "OneSmarter's Secure Ticketing and Case Management platform supports secure intake, role-based access, audit history, controlled communication, workflow tracking, and accountable issue resolution. It is built for HIPAA-regulated and PHI-sensitive workflows, but the platform does not guarantee customer compliance or resolution outcomes.",
      ids: ["secure-ticketing-case-management"],
      claimEvaluation,
    });
  }

  if (/\b(?:claims workflow|claims processing|claims technology)\b/i.test(text)) {
    return localResult({
      answer: "OneSmarter's Claims Processing Services support claims workflow modernization, claims technology, member and provider portals, legacy data integration, reporting, and operational visibility. They are service-oriented healthcare technology support, not a commercially available claims-processing product.",
      ids: ["claims-processing-services"],
      claimEvaluation,
    });
  }

  if (/\b(?:healthcare|tpa)\b/i.test(text)) {
    return localResult({
      answer: "OneSmarter supports healthcare and TPA workflow modernization through secure operational systems, reporting, data integration, and support. Implementation and customer-specific operating details require a direct scoped review.",
      ids: ["healthcare-tpa-workflow-modernization"],
      claimEvaluation,
    });
  }

  const primary = matchedEntries[0];
  if (primary) {
    return localResult({
      answer: primary.approvedSummary,
      ids: [primary.id],
      claimEvaluation,
    });
  }

  return localResult({
    answer: RAVI_CLARIFICATION,
    ids: [],
    confidence: "low",
    clarificationNeeded: true,
    clarificationQuestion: "Which approved operations topic would you like to review?",
    claimEvaluation,
  });
};

export default runRaviLocalEngine;
