export const AGENT_INTENT_SCHEMA_VERSION = "2.0";

export const AGENT_QUESTION_TYPES = Object.freeze([
  "positive_yes_no", "negative_confirmation", "status", "why", "how",
  "comparison", "clarification", "follow_up", "hypothetical", "challenge",
  "correction", "recommendation_request", "scope_check", "handoff_request", "unknown",
]);

export const AGENT_SPEECH_ACTS = Object.freeze([
  "question", "confirmation_request", "explanation_request", "comparison_request",
  "clarification_request", "recommendation_request", "scope_request", "handoff_request",
  "challenge", "correction", "hypothetical", "unknown",
]);

export const AGENT_INTENT_POLARITIES = Object.freeze(["positive", "negative", "mixed", "unknown"]);

export const AGENT_INTENT_LIMITS = Object.freeze({
  domain: 80,
  topic: 240,
  entity: 100,
  entities: 12,
  proposition: 500,
  negationMarker: 40,
  negationScope: 240,
  negations: 4,
  requestedDetail: 240,
  reference: 160,
  references: 8,
  mentionedName: 100,
  mentionedNames: 12,
});

const boundedStringSchema = (maxLength) => ({ type: "string", maxLength });
const boundedStringArraySchema = (maxItems, maxLength) => ({
  type: "array",
  maxItems,
  items: boundedStringSchema(maxLength),
});

export const AGENT_INTENT_PROVIDER_FIELDS = Object.freeze([
  "domain", "topic", "entities", "proposition", "polarity", "negationScope",
  "questionType", "speechAct", "requestedDetail", "followUpReferences",
  "confidence", "clarificationNeeded", "mentionedNames",
]);

export const AGENT_INTENT_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [...AGENT_INTENT_PROVIDER_FIELDS],
  properties: {
    domain: boundedStringSchema(AGENT_INTENT_LIMITS.domain),
    topic: boundedStringSchema(AGENT_INTENT_LIMITS.topic),
    entities: boundedStringArraySchema(AGENT_INTENT_LIMITS.entities, AGENT_INTENT_LIMITS.entity),
    proposition: boundedStringSchema(AGENT_INTENT_LIMITS.proposition),
    polarity: { type: "string", enum: [...AGENT_INTENT_POLARITIES] },
    negationScope: {
      type: "array",
      maxItems: AGENT_INTENT_LIMITS.negations,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["marker", "scope"],
        properties: {
          marker: boundedStringSchema(AGENT_INTENT_LIMITS.negationMarker),
          scope: boundedStringSchema(AGENT_INTENT_LIMITS.negationScope),
        },
      },
    },
    questionType: { type: "string", enum: [...AGENT_QUESTION_TYPES] },
    speechAct: { type: "string", enum: [...AGENT_SPEECH_ACTS] },
    requestedDetail: boundedStringSchema(AGENT_INTENT_LIMITS.requestedDetail),
    followUpReferences: boundedStringArraySchema(AGENT_INTENT_LIMITS.references, AGENT_INTENT_LIMITS.reference),
    confidence: { type: "number", minimum: 0, maximum: 1 },
    clarificationNeeded: { type: "boolean" },
    mentionedNames: boundedStringArraySchema(AGENT_INTENT_LIMITS.mentionedNames, AGENT_INTENT_LIMITS.mentionedName),
  },
});

const isBoundedString = (value, limit) => typeof value === "string" && value.length <= limit;
const validateStringArray = (value, countLimit, stringLimit) =>
  Array.isArray(value) && value.length <= countLimit && value.every((item) => isBoundedString(item, stringLimit));
const hasExactKeys = (value, keys) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

export const validateProviderAgentIntent = (intent) => {
  const errors = [];
  if (!intent || typeof intent !== "object" || Array.isArray(intent)) {
    return { ok: false, errors: ["intent must be an object"] };
  }
  if (!hasExactKeys(intent, AGENT_INTENT_PROVIDER_FIELDS)) errors.push("intent contains missing or unexpected properties");
  if (!isBoundedString(intent.domain, AGENT_INTENT_LIMITS.domain)) errors.push("invalid domain");
  if (!isBoundedString(intent.topic, AGENT_INTENT_LIMITS.topic)) errors.push("invalid topic");
  if (!validateStringArray(intent.entities, AGENT_INTENT_LIMITS.entities, AGENT_INTENT_LIMITS.entity)) errors.push("invalid entities");
  if (!isBoundedString(intent.proposition, AGENT_INTENT_LIMITS.proposition)) errors.push("invalid proposition");
  if (!AGENT_INTENT_POLARITIES.includes(intent.polarity)) errors.push("invalid polarity");
  if (!Array.isArray(intent.negationScope) || intent.negationScope.length > AGENT_INTENT_LIMITS.negations || intent.negationScope.some((item) =>
    !item || typeof item !== "object" || Array.isArray(item) || !hasExactKeys(item, ["marker", "scope"]) ||
    !isBoundedString(item.marker, AGENT_INTENT_LIMITS.negationMarker) || !isBoundedString(item.scope, AGENT_INTENT_LIMITS.negationScope))) {
    errors.push("invalid negationScope");
  }
  if (!AGENT_QUESTION_TYPES.includes(intent.questionType)) errors.push("invalid questionType");
  if (!AGENT_SPEECH_ACTS.includes(intent.speechAct)) errors.push("invalid speechAct");
  if (!isBoundedString(intent.requestedDetail, AGENT_INTENT_LIMITS.requestedDetail)) errors.push("invalid requestedDetail");
  if (!validateStringArray(intent.followUpReferences, AGENT_INTENT_LIMITS.references, AGENT_INTENT_LIMITS.reference)) errors.push("invalid followUpReferences");
  if (typeof intent.confidence !== "number" || !Number.isFinite(intent.confidence) || intent.confidence < 0 || intent.confidence > 1) errors.push("invalid confidence");
  if (typeof intent.clarificationNeeded !== "boolean") errors.push("invalid clarificationNeeded");
  if (!validateStringArray(intent.mentionedNames, AGENT_INTENT_LIMITS.mentionedNames, AGENT_INTENT_LIMITS.mentionedName)) errors.push("invalid mentionedNames");
  return { ok: errors.length === 0, errors };
};

export const assertValidProviderAgentIntent = (intent) => {
  const validation = validateProviderAgentIntent(intent);
  if (!validation.ok) throw new TypeError(`Invalid provider intent: ${validation.errors.join(", ")}`);
  return intent;
};
