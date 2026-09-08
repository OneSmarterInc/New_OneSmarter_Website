import { seleneApprovedKnowledge } from "../../data/agentKnowledge/seleneApprovedKnowledge.js";
import {
  SELENE_CLAIM_STATUSES,
  evaluateSeleneClaim,
} from "../../data/agentKnowledge/seleneClaimRules.js";

export const SELENE_SCOPE_CLARIFICATION =
  "I can explain OneSmarter's focused-agent roles, approved knowledge boundaries, claim validation, Café separation, current orchestration model, and accuracy-preserving depletion. What would you like to review?";

const TOPIC_TERMS = Object.freeze({
  "agent-architecture-overview": ["focused agents", "multiple agents", "one chatbot", "agent architecture"],
  "professional-agent-role-separation": ["mira", "theo", "elena", "ravi", "roles", "different"],
  "canonical-knowledge-boundary": ["knowledge boundary", "canonical", "evidence", "remember", "history"],
  "claim-validation-and-fail-closed-design": ["claim validation", "unsupported claim", "fail closed", "output validation"],
  "professional-cafe-separation": ["café influence", "cafe influence", "professional answers", "café evidence", "cafe evidence"],
  "cafe-review-and-publication-gate": ["café", "cafe", "review gate", "publication gate"],
  "current-orchestration-vs-future-collaboration": ["orchestration", "orchestrate", "autonomous", "collaborate", "delegation"],
  "operational-state-vs-factual-accuracy": ["depletion", "energy", "less accurate", "verbosity", "operational state"],
});

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
  const text = normalized(message);
  return seleneApprovedKnowledge
    .map((entry) => ({
      ...entry,
      score: (TOPIC_TERMS[entry.id] || []).reduce(
        (score, term) => score + (text.includes(normalized(term)) ? 1 : 0),
        0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
};

const contextualMessage = (message, history = []) => {
  if (!/\b(?:it|that|this|those|they|them)\b/i.test(message)) return message;
  const previous = [...history].reverse().find(({ role }) => role === "user");
  return previous?.content ? `${message} ${previous.content}` : message;
};

export const runSeleneLocalEngine = ({ message = "", conversationHistory = [], verbosityBand = "normal" } = {}) => {
  const contextual = contextualMessage(message, conversationHistory);
  const evaluation = evaluateSeleneClaim(contextual);
  const matched = retrieveSeleneKnowledge(contextual);
  const ids = matched.map(({ id }) => id);

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

  let answer = evaluation.approvedAlternative;
  if (evaluation.status === SELENE_CLAIM_STATUSES.ANSWER_WITH_QUALIFICATION) {
    answer = `${evaluation.reason} ${evaluation.approvedAlternative}`;
  } else if (/\b(?:roles?|different|Mira|Theo|Elena|Ravi)\b/i.test(contextual)) {
    answer = "Mira guides general public-content questions, Theo analyzes supplied public content, Elena reviews compliance language, Ravi explains operations and workflows, and Selene explains OneSmarter's agent architecture. Each uses a separate approved professional scope.";
  } else if (/\b(?:review gate|publication gate)\b/i.test(contextual)) {
    answer = "Only reviewed, published Café conversations are eligible for public selection. Café dialogue remains character content and cannot serve as professional factual evidence.";
  } else if (/\b(?:focused agents|multiple focused|one chatbot)\b/i.test(contextual)) {
    answer = "OneSmarter uses focused professional roles with role-specific approved knowledge rather than one unrestricted chatbot. This supports accountable boundaries but does not guarantee perfect output.";
  }

  if (verbosityBand === "concise") {
    // The evaluated alternative already contains every required boundary; only optional prose is omitted.
    answer = answer.trim();
  }
  return result({ answer, ids, claimEvaluation: evaluation });
};

export default runSeleneLocalEngine;
