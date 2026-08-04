import {
  buildConversationEntityGroups,
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
} from "./miraConversationReferences.js";
import { resolveMiraListingRequest } from "./miraListingIntents.js";
import { onesmarterPublicKnowledgeBase } from "../../data/agentKnowledge/onesmarterPublicKb.js";

const ACKNOWLEDGEMENT =
  /^(?:ok(?:ay)?|got it|thanks|thank you|understood|fine|sounds good)[.! ]*$/i;
const COMPARISON =
  /\b(?:compare|comparison|difference(?:s)? between|different from|versus|vs\.?|which (?:one|option|platform|service) is better|pros and cons|one or both|compared with|use .+ as (?:the )?second option)\b/i;
const COMPARISON_NEGATION =
  /\b(?:do not|don't|dont|not|no)\s+(?:want to\s+)?compar(?:e|ison)\b/i;
const NAMES_ONLY =
  /\b(?:names? only|only (?:the )?names?|just (?:tell|give|show|list)(?: me)? (?:their|the|those)?\s*names?|give me (?:their|the|those) names?|list names only|no details?)\b/i;
const DETAILED =
  /\b(?:in detail|detailed|detail explanation|full explanation|explain .+ thoroughly|deep dive)\b/i;
const OVERVIEW =
  /\b(?:tell me (?:more )?about|overview of|who is)\s+(?:onesmarter|the company)\b|\bwhat does onesmarter do\b|\bcompany overview\b/i;
const CATEGORIZED_LIST =
  /\b(?:bifurcate|separate|categorize|organize|group)\b.*\b(?:services?|platforms?|by type|the above|them)\b/i;
const LIST =
  /\b(?:list|show|give me|what are|which are)\b.*\b(?:platforms?|services?|offerings?)\b|\ball (?:onesmarter )?(?:platforms?|services?|offerings?)\b/i;
const RECOMMENDATION =
  /\b(?:recommend|recomend|best for|right for|which (?:platform|service) should|which (?:platform|service) is (?:best|right)|what should (?:i|we) use|help (?:me|us) choose)\b/i;
const CONCISE =
  /\b(?:briefly|short|concise|tell me about|what (?:is|are)|explain|describe)\b/i;

export const RESPONSE_MODE_BUDGETS = Object.freeze({
  acknowledgement: { maxSentences: 1, shape: "one_short_sentence" },
  names_only: { maxSentences: 0, shape: "canonical_names_only" },
  concise_explanation: { maxSentences: 4, shape: "short_paragraph_or_bullets" },
  overview: { maxSentences: 6, shape: "short_overview_with_relevant_areas" },
  detailed_explanation: { maxSentences: 12, shape: "focused_structured_answer" },
  list: { maxSentences: 0, shape: "requested_list_only" },
  categorized_list: { maxSentences: 0, shape: "categorized_list_only" },
  comparison: { maxSentences: 12, shape: "comparison_structure" },
  recommendation: { maxSentences: 8, shape: "recommendation_with_reasons" },
  clarification_response: { maxSentences: 6, shape: "focused_response" },
  unsupported_request: { maxSentences: 2, shape: "short_scope_boundary" },
  safety: { maxSentences: 3, shape: "safety_hard_stop" },
});

export const classifyMiraResponseMode = (
  message = "",
  conversationHistory = [],
) => {
  const normalized = String(message).replace(/\s+/g, " ").trim();
  let mode = "concise_explanation";

  if (ACKNOWLEDGEMENT.test(normalized)) {
    mode = "acknowledgement";
  } else if (NAMES_ONLY.test(normalized)) {
    mode = "names_only";
  } else if (DETAILED.test(normalized)) {
    mode = "detailed_explanation";
  } else if (OVERVIEW.test(normalized)) {
    mode = "overview";
  } else if (CATEGORIZED_LIST.test(normalized)) {
    mode = "categorized_list";
  } else if (COMPARISON.test(normalized) && !COMPARISON_NEGATION.test(normalized)) {
    mode = "comparison";
  } else if (RECOMMENDATION.test(normalized)) {
    mode = "recommendation";
  } else if (LIST.test(normalized)) {
    mode = "list";
  } else if (
    conversationHistory.length &&
    /^(?:all of them|both|the first|the second|the third|that one|this one)\b/i.test(
      normalized,
    )
  ) {
    mode = "clarification_response";
  } else if (CONCISE.test(normalized)) {
    mode = "concise_explanation";
  }

  return {
    mode,
    budget: RESPONSE_MODE_BUDGETS[mode],
    comparisonNegated: COMPARISON_NEGATION.test(normalized),
    currentTurnOverride:
      /^(?:no\b|actually\b|instead\b|i mean\b|not that\b)|\b(?:only|just)\b/i.test(
        normalized,
      ),
  };
};

const namesFromLatestEntityGroup = (conversationHistory = []) =>
  buildConversationEntityGroups(conversationHistory)[0]?.items || [];

export const resolveMiraNamesOnly = (
  message = "",
  conversationHistory = [],
) => {
  const explicitList = resolveMiraListingRequest(message, conversationHistory);
  const entities =
    explicitList?.entities?.length
      ? explicitList.entities
      : namesFromLatestEntityGroup(conversationHistory);
  if (!entities.length) return null;

  return {
    entities,
    matchedEntries: matchedEntriesForConversationEntities(entities),
    answer: entities.map((entity) => entity.label).join("\n"),
  };
};

export const acknowledgementAnswerFor = (message = "") =>
  /\bthank/i.test(message) ? "Happy to help." : "Sure.";

const knowledgeById = new Map(
  onesmarterPublicKnowledgeBase.map((entry) => [entry.id, entry]),
);

const entriesForIds = (ids = []) =>
  ids.map((id) => knowledgeById.get(id)).filter(Boolean);

export const resolveMiraResponseModeFastPath = (message = "", responseMode = {}) => {
  if (responseMode.mode === "overview") {
    return {
      answer: [
        "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance readiness support.",
        "- Platforms for secure case management and bill audit and payment workflows",
        "- Technology services for healthcare, claims, IBM i / AS400, enterprise software, and support consolidation",
        "- Practical AI and controlled workflow automation",
        "- Business services for finance, HR, payment, benefits, and back-office workflows",
        "- Compliance and Trust Center information grounded in approved public evidence",
      ].join("\n"),
      matchedEntries: entriesForIds([
        "company-overview",
        "technology-solutions-overview",
        "business-services-overview",
        "compliance-cyber-assurance-overview",
        "trust-center-overview",
      ]),
      entities: [],
    };
  }

  if (
    responseMode.mode === "detailed_explanation" &&
    /\b(?:healthcare|tpa)\b/i.test(message)
  ) {
    const entities = [
      "healthcare-tpa-technology-services",
      "claims-processing-services",
      "secure-ticketing-case-management",
    ]
      .map((id) => groundedConversationEntityForId(id))
      .filter(Boolean);
    return {
      answer: [
        "OneSmarter supports healthcare and TPA operations through focused technology services and secure workflow capabilities.",
        "- Healthcare & TPA Technology Services supports healthcare operations and regulated technology delivery.",
        "- Claims Processing Services supports claims workflow modernization, member and provider portals, legacy data integration, reporting, and operational visibility.",
        "- Secure Ticketing and Case Management supports secure intake, role-based access, audit history, controlled communication, and workflow tracking for PHI-sensitive operations.",
        "These are distinct services and platform capabilities; Claims Processing Services is not presented as a standalone claims product.",
      ].join("\n"),
      matchedEntries: entriesForIds([
        "technology-solutions-overview",
        "claims-processing-services",
        "secure-ticketing-case-management",
      ]),
      entities,
    };
  }

  return null;
};

export default classifyMiraResponseMode;
