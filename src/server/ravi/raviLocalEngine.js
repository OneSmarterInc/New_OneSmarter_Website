import { raviApprovedKnowledge } from "../../data/agentKnowledge/raviApprovedKnowledge.js";
import {
  RAVI_CLAIM_STATUSES,
  evaluateRaviClaim,
} from "../../data/agentKnowledge/raviClaimRules.js";

const RAVI_CLARIFICATION =
  "I can help explain secure ticketing, case management, workflow tracking, audit history, workflow modernization, routing, escalation design, and operational support. What would you like to review?";

const TOPIC_TERMS = Object.freeze({
  "secure-ticketing-case-management": [
    "secure ticketing", "case management", "secure intake", "role based access",
    "audit history", "controlled communication", "workflow tracking", "ticket",
    "routing", "escalation", "handoff",
  ],
  "claims-processing-services": [
    "claims workflow", "claims processing", "claims technology", "member portal",
    "provider portal", "operational visibility",
  ],
  "healthcare-tpa-workflow-modernization": [
    "healthcare", "tpa", "workflow modernization", "secure operational systems",
  ],
  "enterprise-workflow-tools": [
    "enterprise software", "workflow tools", "custom application", "dashboard",
    "portal", "data integration", "enterprise integration", "integration",
  ],
  "software-support-continuity": [
    "software support", "maintenance", "enhancements", "issue resolution",
    "documentation", "knowledge transfer", "operational continuity",
  ],
});

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

export const retrieveRaviKnowledge = (message = "", limit = 3) => {
  const text = normalized(message);
  return raviApprovedKnowledge
    .map((entry) => ({
      ...entry,
      score: (TOPIC_TERMS[entry.id] || []).reduce(
        (score, term) => score + (text.includes(normalized(term)) ? 1 : 0),
        0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id))
    .slice(0, limit);
};

const contextualMessage = (message, conversationHistory = []) => {
  if (!/\b(?:it|that|this|those|they|them)\b/i.test(message)) return message;
  const priorUser = [...conversationHistory].reverse().find(({ role }) => role === "user");
  return priorUser?.content ? `${message} ${priorUser.content}` : message;
};

export const runRaviLocalEngine = ({ message = "", conversationHistory = [] } = {}) => {
  const contextual = contextualMessage(message, conversationHistory);
  const text = normalized(contextual);
  const matchedEntries = retrieveRaviKnowledge(contextual);
  const matchedIds = matchedEntries.map(({ id }) => id);

  if (/\b(?:close|change|edit|open|assign|route|escalate|perform)\b.{0,50}\b(?:this|that|the|a)\s+(?:ticket|case)\b/i.test(contextual)) {
    return localResult({
      answer: "I cannot access or change a real ticket, queue, case, or production environment. I can explain a safe routing or escalation design using approved workflow capabilities.",
      ids: matchedIds,
      claimEvaluation: evaluateRaviClaim("Ravi cannot access or change a real customer ticket."),
    });
  }

  const claimEvaluation = evaluateRaviClaim(contextual);
  if (claimEvaluation.status === RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED) {
    const unrelated = claimEvaluation.ruleId === "outside-approved-operations-slice";
    return localResult({
      answer: unrelated ? RAVI_CLARIFICATION : claimEvaluation.approvedAlternative,
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
      answer: claimEvaluation.approvedAlternative,
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
