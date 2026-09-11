import { AGENT_INTENT_SCHEMA_VERSION, validateProviderAgentIntent } from "./agentIntentSchema.js";

export const AGENT_INTENT_CLARIFICATION =
  "I’m not certain what you’d like me to address. Could you restate the question and name the topic you want reviewed?";

export const createConservativeIntentFallback = ({ agentIdentity = "" } = {}) => ({
  schemaVersion: AGENT_INTENT_SCHEMA_VERSION,
  domain: "unknown",
  topic: "",
  entities: [],
  proposition: "",
  polarity: "unknown",
  negationScope: [],
  questionType: "unknown",
  speechAct: "unknown",
  requestedDetail: "",
  followUpReferences: [],
  confidence: 0,
  clarificationNeeded: true,
  mentionedNames: [],
  agentIdentity,
  visitorDisplayName: null,
  context: {
    resolvedSemantically: false,
    assistantHistoryUsedAsEvidence: false,
    currentTurnHasPriority: true,
  },
});

const cleanFacts = (facts) => (Array.isArray(facts) ? facts : [facts])
  .filter((fact) => typeof fact === "string" && fact.trim())
  .map((fact) => fact.trim());

export const buildAgentIntentFallback = ({ intent, approvedFacts = [], approvedReason = "" } = {}) => {
  const providerIntent = intent && typeof intent === "object"
    ? Object.fromEntries(Object.entries(intent).filter(([key]) => !["schemaVersion", "agentIdentity", "visitorDisplayName", "context"].includes(key)))
    : intent;
  const validation = validateProviderAgentIntent(providerIntent);
  if (!validation.ok || intent.clarificationNeeded) {
    return { answer: AGENT_INTENT_CLARIFICATION, clarificationNeeded: true, reason: "ambiguous_intent" };
  }

  const facts = cleanFacts(approvedFacts);
  if (intent.questionType === "why" && !approvedReason.trim()) {
    return {
      answer: `${facts.length ? `${facts.join(" ")} ` : ""}The approved public information states the current posture but does not provide the reason.`.trim(),
      clarificationNeeded: false,
      reason: "reason_not_in_approved_knowledge",
    };
  }
  if (!facts.length && !approvedReason.trim()) {
    return { answer: AGENT_INTENT_CLARIFICATION, clarificationNeeded: true, reason: "no_approved_facts" };
  }
  return {
    answer: [...facts, approvedReason.trim()].filter(Boolean).join(" "),
    clarificationNeeded: false,
    reason: "approved_compositional_fallback",
  };
};

export default buildAgentIntentFallback;
