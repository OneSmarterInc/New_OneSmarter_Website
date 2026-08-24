import {
  resolveMiraComparisonEntities,
  resolveMiraEntityText,
} from "./miraEntityResolver.js";

const PLATFORM_CLAIM = /\bplatforms?\b/i;
const SERVICE_CLAIM = /\bservices?\b/i;
const INTEGRATION_ASSERTION =
  /\b(?:integrates?|connects?|syncs?) with\b|\b(?:handles?|supports?)\s+(?:SAP|Salesforce|ServiceNow|Oracle|Microsoft Dynamics)\s+integration\b/i;
const EXTERNAL_SYSTEM = /\b(SAP|Salesforce|ServiceNow|Oracle|Microsoft Dynamics)\b/i;
const COMPLIANCE_ASSERTION =
  /\b(?:HIPAA|SOC\s*2)[- ]certified\b|\b(?:automatically |should )?make(?:s)? (?:us|customers?|our company) (?:HIPAA )?compliant\b|\bplatform is HIPAA compliant\b/i;
const TELECOM_STANDALONE =
  /\b(?:your |onesmarter(?:'s)? )?telecom (?:platform|product)\b|\btelecom expense management is (?:your |one of your )?(?:third )?platform\b/i;
const HARmless_CLASS_WORDS = /\b(?:tool|solution|offering)\b/i;

const CLASSIFICATION_ALIASES = Object.freeze([
  ["Claims Processing Services", /\bclaims? processing(?: services?)?\b/i],
  ["IBM i / AS400 Services", /\b(?:IBM\s*i|AS\s*\/?\s*400|AS400)(?: services?)?\b/i],
  ["AI Agentic Services", /\bAI Agentic(?: Services?)?\b/i],
  ["Secure Ticketing and Case Management", /\bSecure Ticketing(?: and Case Management)?\b/i],
  ["Bill Audit & Bill Pay", /\bBill Audit(?:\s*(?:&|and)\s*Bill Pay)?\b/i],
]);

const normalized = (value = "") =>
  String(value).toLowerCase().replace(/\s+/g, " ").trim();

const evidenceIdsFor = (entity) => [...new Set(entity?.sourceIds || [])];

const correction = ({
  type,
  entity = null,
  claimedValue,
  correctedValue,
  text,
  confidence = "high",
  alreadyStatedPattern = null,
}) => ({
  type,
  subjectEntityId: entity?.id || null,
  claimedValue: claimedValue || null,
  correctedValue: correctedValue || null,
  confidence,
  evidenceIds: evidenceIdsFor(entity),
  text,
  alreadyStatedPattern,
});

const mentionedEntities = (message = "") => {
  const comparison = resolveMiraComparisonEntities(message);
  const comparisonEntities = comparison.matches.map(({ entity }) => entity);
  const direct = resolveMiraEntityText(message);
  const directEntity = direct.status === "resolved" ? [direct.match.entity] : [];
  return [...comparisonEntities, ...directEntity].filter(
    (entity, index, entities) =>
      entity && entities.findIndex(({ id }) => id === entity.id) === index,
  );
};

const classificationCorrections = (message, entities) => {
  const corrections = [];
  for (const entity of entities) {
    const labelPattern = new RegExp(
      entity.label
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\s*&\s*/g, "\\s*(?:&|and)\\s*")
        .replace(/\s+/g, "\\s+"),
      "i",
    );
    const labelMatch = labelPattern.exec(message);
    if (!labelMatch) continue;
    const vicinity = message.slice(
      Math.max(0, labelMatch.index - 24),
      labelMatch.index + labelMatch[0].length + 28,
    );
    if (HARmless_CLASS_WORDS.test(vicinity)) continue;
    if (entity.type === "service" && PLATFORM_CLAIM.test(vicinity)) {
      corrections.push(
        correction({
          type: "classification",
          entity,
          claimedValue: "platform",
          correctedValue: "service",
          text: `${entity.label} is a service, not a platform.`,
        }),
      );
    }
    if (entity.type === "platform" && SERVICE_CLAIM.test(vicinity)) {
      corrections.push(
        correction({
          type: "classification",
          entity,
          claimedValue: "service",
          correctedValue: "platform",
          text: `${entity.label} is a platform, not a service.`,
        }),
      );
    }
  }
  for (const [canonicalName, aliasPattern] of CLASSIFICATION_ALIASES) {
    const aliasMatch = aliasPattern.exec(message);
    if (!aliasMatch) continue;
    const resolution = resolveMiraEntityText(canonicalName);
    if (resolution.status !== "resolved") continue;
    const entity = resolution.match.entity;
    const vicinity = message.slice(
      Math.max(0, aliasMatch.index - 24),
      aliasMatch.index + aliasMatch[0].length + 28,
    );
    if (entity.type === "service" && PLATFORM_CLAIM.test(vicinity)) {
      corrections.push(
        correction({
          type: "classification",
          entity,
          claimedValue: "platform",
          correctedValue: "service",
          text: `${entity.label} is a service, not a platform.`,
        }),
      );
    }
    if (entity.type === "platform" && SERVICE_CLAIM.test(vicinity)) {
      corrections.push(
        correction({
          type: "classification",
          entity,
          claimedValue: "service",
          correctedValue: "platform",
          text: `${entity.label} is a platform, not a service.`,
        }),
      );
    }
  }
  return corrections;
};

const staleInferenceCorrection = (message, conversationHistory) => {
  if (
    !/\byou said (?:earlier )?(?:that )?(?:we|our (?:system|applications?)) (?:use|uses|is|are|run on) (?:AS400|IBM\s*i)\b/i.test(
      message,
    )
  ) {
    return null;
  }
  const userEstablishedTechnology = conversationHistory.some(
    (turn) =>
      turn?.role === "user" &&
      /\b(?:our|we|they|it).{0,28}\b(?:AS400|IBM\s*i)\b/i.test(
        turn.content || "",
      ),
  );
  if (userEstablishedTechnology) return null;
  const assistantOnlyConditional = conversationHistory.some(
    (turn) =>
      turn?.role === "assistant" &&
      /\b(?:AS400|IBM\s*i).{0,40}\b(?:if|may|might|conditional)\b|\b(?:if|may|might).{0,40}\b(?:AS400|IBM\s*i)\b/i.test(
        turn.content || "",
      ),
  );
  if (!assistantOnlyConditional) return null;
  return correction({
    type: "stale_context",
    claimedValue: "The user uses IBM i / AS400",
    correctedValue: "IBM i / AS400 was only a conditional possibility",
    text:
      "I did not establish that your system uses IBM i / AS400; it was mentioned only as a conditional possibility.",
  });
};

export const checkMiraPremise = ({
  message = "",
  conversationHistory = [],
} = {}) => {
  const text = String(message).trim();
  const entities = mentionedEntities(text);
  const corrections = classificationCorrections(text, entities);
  let interpretationMessage = text;

  if (TELECOM_STANDALONE.test(text)) {
    const billAudit = resolveMiraEntityText("Bill Audit & Bill Pay").match?.entity;
    corrections.push(
      correction({
        type: "use_case",
        entity: billAudit,
        claimedValue: "standalone telecom platform",
        correctedValue: "telecom use case under Bill Audit & Bill Pay",
        text:
          "Telecom Expense Management is a use case under Bill Audit & Bill Pay, not a standalone platform.",
      }),
    );
    interpretationMessage = interpretationMessage.replace(
      TELECOM_STANDALONE,
      "Bill Audit & Bill Pay",
    );
  }

  if (COMPLIANCE_ASSERTION.test(text)) {
    corrections.push(
      correction({
        type: "compliance",
        claimedValue: text.match(COMPLIANCE_ASSERTION)?.[0] || "certified or automatic compliance",
        correctedValue: "evidence-based readiness without certification or guarantee",
        text:
          "No. OneSmarter does not present itself as HIPAA certified. Using a platform does not automatically make a customer compliant.",
        alreadyStatedPattern: /does not present itself as (?:hipaa|soc\s*2)\s*certified/i,
      }),
    );
  }

  const integrationMatch = INTEGRATION_ASSERTION.test(text);
  const externalSystem = text.match(EXTERNAL_SYSTEM)?.[1];
  if (integrationMatch && externalSystem) {
    corrections.push(
      correction({
        type: "integration",
        entity: entities[0] || null,
        claimedValue: `${externalSystem} integration`,
        correctedValue: "not confirmed by approved content",
        text: `I don't have approved information confirming an integration with ${externalSystem}.`,
      }),
    );
  }

  if (
    /\bsecure ticketing\b/i.test(text) &&
    /\b(?:handles?|supports?)\b.{0,24}\bvendor (?:bill )?payments?\b/i.test(text)
  ) {
    const secureTicketing = resolveMiraEntityText("Secure Ticketing").match?.entity;
    corrections.push(
      correction({
        type: "capability",
        entity: secureTicketing,
        claimedValue: "vendor bill payments",
        correctedValue: "not established for Secure Ticketing and Case Management",
        text:
          "Approved content does not establish vendor bill payments as a Secure Ticketing and Case Management capability; that workflow belongs with Bill Audit & Bill Pay.",
      }),
    );
  }

  const staleCorrection = staleInferenceCorrection(text, conversationHistory);
  if (staleCorrection) corrections.push(staleCorrection);

  const uniqueCorrections = corrections.filter(
    (item, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.type === item.type &&
          candidate.subjectEntityId === item.subjectEntityId &&
          normalized(candidate.text) === normalized(item.text),
      ) === index,
  );
  const contradictory =
    /\b(?:only|just) (?:want )?platforms?\b/i.test(text) &&
    uniqueCorrections.some(
      ({ type, correctedValue }) =>
        type === "classification" && correctedValue === "service",
    );

  return {
    status: contradictory
      ? "contradictory"
      : uniqueCorrections.some(({ type }) => type === "integration")
        ? "unsupported"
        : uniqueCorrections.length
          ? "incorrect"
          : "valid",
    corrections: uniqueCorrections.slice(0, 3),
    safeToProceed: true,
    interpretationMessage,
    correctionOnly:
      uniqueCorrections.length > 0 &&
      !uniqueCorrections.some(({ type }) =>
        ["integration", "compliance", "capability"].includes(type),
      ) &&
      !/\?|\b(?:compare|recommend|which|what|would|tell me|explain|how)\b/i.test(
        text,
      ),
  };
};

export const applyMiraPremiseCorrections = (result, premiseCheck) => {
  if (!premiseCheck?.corrections?.length) {
    return result;
  }
  const allowedCorrections = result?.riskFlags?.length
    ? premiseCheck.corrections.filter(({ type }) => type === "compliance")
    : premiseCheck.corrections;
  if (!allowedCorrections.length) return result;
  const answer = String(result?.answerSeed || "").trim();
  const normalizedAnswer = normalized(answer);
  const isAlreadyStated = ({ text, alreadyStatedPattern }) =>
    alreadyStatedPattern
      ? alreadyStatedPattern.test(answer)
      : normalizedAnswer.includes(normalized(text));

  if (premiseCheck.correctionOnly) {
    return {
      ...result,
      premiseCheck,
      answerSeed: allowedCorrections
        .map(({ text }) => text)
        .filter(Boolean)
        .join(" "),
    };
  }

  const missingCorrections = allowedCorrections.filter(
    (item) => !isAlreadyStated(item),
  );
  if (!missingCorrections.length) {
    return { ...result, premiseCheck, answerSeed: answer };
  }
  const correctionText = missingCorrections
    .map(({ text }) => text)
    .filter(Boolean)
    .join(" ");
  return {
    ...result,
    premiseCheck,
    answerSeed: `${correctionText}${answer ? `\n\n${answer}` : ""}`,
  };
};
