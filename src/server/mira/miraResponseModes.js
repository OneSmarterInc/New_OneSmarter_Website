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
  /\b(?:names? only|only (?:the )?(?:capability )?names?|just (?:tell|give|show|list)(?: me)? (?:their|the|those)?\s*(?:(?:platform|service|offering|capability)\s+)?names?|(?:tell|give|show)(?: me)? (?:the )?names? of (?:the |your |onesmarter )?(?:platforms?|services?|offerings?|capabilities)|give me (?:their|the|those)?\s*(?:(?:platform|service|offering|capability)\s+)?names?|list (?:(?:platform|service|offering|capability)\s+)?names only|no details?)\b/i;
const DETAILED =
  /\b(?:in detail|detailed|detail explanation|full explanation|explain .+ thoroughly|deep dive)\b/i;
const OVERVIEW =
  /\b(?:tell me (?:more )?about|overview of|who is)\s+(?:onesmarter|the company)\b|\bwhat does onesmarter do\b|\bcompany overview\b/i;
const BRIEF_ANSWER_SHAPE =
  /\b(?:short|brief|briefly|concise|concisely|quick)\b|\bone[- ]line\b|\bsummari[sz]e(?: it)? in (?:a|one) sentence\b|\bin short\b/i;
const CATEGORIZED_LIST =
  /\b(?:bifurcate|separate|separately|categorize|organize|group)\b.*\b(?:services?|platforms?|by type|the above|them)\b|\b(?:services?|platforms?)\b.*\bseparately\b/i;
const LIST =
  /\b(?:list|show|give me|what are|which are)\b.*\b(?:platforms?|services?|offerings?)\b|\ball (?:onesmarter )?(?:platforms?|services?|offerings?)\b/i;
const RECOMMENDATION =
  /\b(?:recommend|recomend|best for|right for|which (?:platform|service) should|which (?:platform|service) is (?:best|right)|what should (?:i|we) use|help (?:me|us) choose)\b/i;
const CONCISE =
  /\b(?:briefly|short|concise|tell me about|what (?:is|are)|explain|describe)\b/i;
const CAPABILITY_REQUEST =
  /\b(?:support|supports|handle|handles|help with|capabilit(?:y|ies)|what can .+ (?:do|provide)|summari[sz]e (?:their|the|these|those|its) capabilit(?:y|ies))\b/i;
const CAPABILITY_NAMES_ONLY =
  /\bonly (?:the )?capability names?\b|\bcapability names? only\b/i;

const entityCategoryScopeFor = (message = "") => {
  const mentionsPlatforms = /\bplatforms?\b/i.test(message);
  const mentionsServices = /\bservices?\b/i.test(message);
  const negatesPlatforms = /\bnot\b[^.!?]{0,30}\bplatforms?\b/i.test(message);
  const negatesServices = /\bnot\b[^.!?]{0,30}\bservices?\b/i.test(message);
  if (
    mentionsPlatforms &&
    mentionsServices &&
    !negatesPlatforms &&
    !negatesServices
  ) {
    return "mixed";
  }
  const asksPlatforms =
    /\b(?:each|every|both|the|your|all|two) platforms?\b|\bplatform (?:names?|capabilities?)\b|\bwhat (?:are|do) (?:the |your )?platforms?\b|\bwhich platform (?:is|would be) (?:better|best|right)\b/i.test(
      message,
    ) && !negatesPlatforms;
  const asksServices =
    /\b(?:each|every|both|the|your|all)\b[^.!?]{0,40}\bservices?\b|\bservice (?:names?|capabilities?)\b|\bwhat (?:are|do|does) (?:the |your )?services?\b/i.test(
      message,
    ) && !negatesServices;
  if (asksPlatforms) return "platform";
  if (asksServices) return "service";
  return "";
};

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
    entityCategoryScope: entityCategoryScopeFor(normalized),
    capabilityRequest: CAPABILITY_REQUEST.test(normalized),
    answerShape:
      mode === "names_only" && CAPABILITY_NAMES_ONLY.test(normalized)
        ? "capability_names_only"
        : mode === "overview" && BRIEF_ANSWER_SHAPE.test(normalized)
        ? "brief"
        : mode === "detailed_explanation"
          ? "detailed"
        : !["comparison", "recommendation"].includes(mode) &&
            CAPABILITY_REQUEST.test(normalized)
          ? "capability_summary"
        : "default",
    budget:
      mode === "overview" && BRIEF_ANSWER_SHAPE.test(normalized)
        ? { maxSentences: 3, shape: "one_to_three_sentences" }
        : RESPONSE_MODE_BUDGETS[mode],
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
  const requestedType =
    explicitList?.intent === "list_platforms"
      ? "platform"
      : explicitList?.intent === "list_services"
        ? "service"
        : "";
  const historyEntities = namesFromLatestEntityGroup(conversationHistory).filter(
    (entity) => !requestedType || entity.type === requestedType,
  );
  const entities = historyEntities.length
    ? historyEntities
    : explicitList?.entities?.length
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

const FAQ_IDS = new Set([
  "faq_company_overview",
  "faq_platforms",
  "faq_healthcare",
  "faq_soc2_attestation",
  "faq_hipaa_status",
  "faq_contact",
]);

const DIRECT_FACTUAL_REQUEST =
  /\b(?:what (?:is|does|are)|explain|tell me about|what does .+ mean|how does .+ relate|which (?:service|platform|offering) is related|what is .+ used for|short explanation|briefly explain)\b/i;
const DIRECT_FACTUAL_RECOMMENDATION =
  /\b(?:recommend|best for|right for|which (?:platform|service|offering) should|what should (?:i|we) use|help (?:me|us) choose)\b/i;

const DIRECT_FACTUAL_TOPICS = [
  {
    pattern: /\bHIPAA\b/i,
    ids: [
      "hipaa-security-rule-assessment",
      "secure-ticketing-case-management",
      "technology-solutions-overview",
      "claims-processing-services",
      "compliance-cyber-assurance-overview",
    ],
    answer: [
      "HIPAA is a U.S. healthcare privacy and security framework for protecting health information, including PHI.",
      "At OneSmarter, it relates to the Secure Ticketing and Case Management platform, Healthcare & TPA Technology Services, Claims Processing Services, and HIPAA readiness support where their approved healthcare or compliance scope applies.",
      "OneSmarter has completed an independent HIPAA Security Rule compliance assessment, but using a OneSmarter offering does not automatically make a customer HIPAA compliant.",
    ].join("\n\n"),
  },
  {
    pattern: /\bSOC\s*2\b/i,
    ids: ["soc2-attested", "trust-center-overview", "compliance-cyber-assurance-overview"],
    answer: "SOC 2 is an assurance framework concerning controls relevant to security and operational trust. OneSmarter is SOC 2 Type II Attested, and its Trust Center provides public context for that posture; separate Compliance & Cyber Assurance services can support readiness work. This attestation does not certify customer systems or guarantee customer compliance.",
  },
  {
    pattern: /\bPCI\s*DSS\b/i,
    ids: ["compliance-cyber-assurance-overview"],
    answer: "PCI DSS is a security standard for environments that handle payment-card data. OneSmarter's approved Compliance & Cyber Assurance scope includes PCI DSS readiness, evidence preparation, control documentation, framework mapping, VAPT coordination, and remediation support; it is readiness support, not certification or a compliance guarantee.",
  },
  {
    pattern: /\bPHI\b/i,
    ids: ["secure-ticketing-case-management", "hipaa-security-rule-assessment"],
    answer: "PHI means protected health information. It matters to Secure Ticketing and Case Management because the platform is built for HIPAA-regulated and PHI-sensitive workflows, including secure intake, role-based access, audit history, controlled communication, and workflow tracking. Do not submit PHI through this public agent.",
  },
  {
    pattern: /\btelecom expense management\b/i,
    ids: ["bill-audit-bill-pay"],
    answer: "Telecom expense management is an approved use case under the Bill Audit & Bill Pay platform, not a standalone platform. It includes telecom bill review, contract and rate comparison, usage analysis, discrepancy tracking, and cost reporting.",
  },
  {
    pattern: /\bclaims? processing\b/i,
    ids: ["claims-processing-services"],
    answer: "Claims processing covers operational workflows for handling claims. OneSmarter addresses this through Claims Processing Services, a service for claims workflow modernization, claims technology support, member and provider portals, legacy data integration, reporting, and operational visibility; it is not presented as a standalone claims platform.",
  },
  {
    pattern: /\b(?:IBM\s*i|AS\s*\/?\s*400|AS400)\b/i,
    ids: ["ibm-i-as400-services"],
    answer: "AS400 commonly refers to the IBM i platform lineage. OneSmarter provides IBM i / AS400 Services within Technology Solutions; the approved public content identifies this service area without establishing additional implementation capabilities.",
  },
  {
    pattern: /\bTrust Center\b/i,
    ids: ["trust-center-overview"],
    answer: "OneSmarter's Trust Center explains its own security, privacy, ISO/IEC 27001, SOC 2, HIPAA, secure-development, and responsible-data-handling posture. It includes ISO/IEC 27001 Certified, SOC 2 Type II Attested, and HIPAA Security Rule Compliance Assessment Completed wording, while formal evidence requests follow a direct business process.",
  },
];

export const resolveMiraDirectFactualTopic = (message = "") => {
  if (
    !DIRECT_FACTUAL_REQUEST.test(message) ||
    COMPARISON.test(message) ||
    /\b(?:we|i|our company|my company)\s+(?:need|want|process|handle)\b/i.test(message)
  ) {
    return null;
  }
  if (/\bHIPAA\b/i.test(message) && /\b(?:assessment|certif(?:ied|ication)?|security rule|compliance status)\b/i.test(message)) return null;
  if (/\bPHI\b/i.test(message)) return null;
  const topic = DIRECT_FACTUAL_TOPICS.find(({ pattern }) => pattern.test(message));
  if (!topic) return null;
  return {
    faqId: "direct_factual_topic",
    answer: topic.answer,
    matchedEntries: entriesForIds(topic.ids),
    entities: topic.ids
      .map((id) => groundedConversationEntityForId(id, { includeChildren: false }))
      .filter(Boolean),
    directAnswerEligible: true,
  };
};
const singleEntryFaqResult = (entry, answer, faqId) => ({
  faqId,
  answer,
  matchedEntries: entry ? [entry] : [],
  entities: entry
    ? [groundedConversationEntityForId(entry.id, { includeChildren: false })].filter(Boolean)
    : [],
  directAnswerEligible: true,
});

const resolveCanonicalKnowledgeFaq = (message = "") => {
  const hiringEntry = knowledgeById.get("practice-hiring-support");
  if (
    hiringEntry &&
    /\b(?:practice hiring|hiring agent|agent-assisted hiring|speciali[sz]ed (?:job )?posting|job posting for|screen candidates?|candidate screening|track credentialing|credentialing steps?|help practices? (?:with )?hiring)\b/i.test(message)
  ) {
    const agentQuestion =
      /\b(?:AI hiring agent|hiring agent|agent-assisted hiring|launch|available|availability|buy)\b/i.test(message);
    return singleEntryFaqResult(
      hiringEntry,
      agentQuestion ? hiringEntry.sourceFacts[1] : hiringEntry.sourceFacts[0],
      agentQuestion ? "faq_agent_assisted_hiring" : "faq_practice_hiring",
    );
  }

  const isoReadinessEntry = knowledgeById.get("iso-27001-readiness-support");
  const isoCertificationEntry = knowledgeById.get("iso-27001-certified");
  if (
    isoCertificationEntry &&
    /\bwhat (?:certifications?|security credentials?|trust credentials?) (?:does OneSmarter|do you) have\b/i.test(message)
  ) {
    const trustEntry = knowledgeById.get("trust-center-overview");
    return {
      faqId: "faq_trust_credentials",
      answer: "OneSmarter's approved trust posture includes ISO/IEC 27001 Certified, SOC 2 Type II Attested, and HIPAA Security Rule Compliance Assessment Completed. These phrases describe different forms of evidence and should not be treated as customer certification or a compliance guarantee.",
      matchedEntries: [isoCertificationEntry, trustEntry].filter(Boolean),
      entities: [],
      directAnswerEligible: true,
    };
  }
  if (
    isoReadinessEntry &&
    isoCertificationEntry &&
    /\b(?:do you certify (?:us|me|customers?)|can (?:OneSmarter|you) certify (?:us|me|my company|our company|customers?))\b/i.test(message)
  ) {
    return {
      ...singleEntryFaqResult(
        isoReadinessEntry,
        "No. OneSmarter does not certify customer systems or issue ISO certificates. It provides ISO/IEC 27001 readiness support to help clients prepare for an independent certification process.",
        "faq_iso_customer_certification_boundary",
      ),
      entities: [],
    };
  }
  if (
    isoReadinessEntry &&
    isoCertificationEntry &&
    (/\bISO(?:\/IEC)?(?:\s*27001)?\b/i.test(message) ||
      /\breadiness service\b.{0,50}\bown certification\b/i.test(message))
  ) {
    const differenceQuestion =
      /\b(?:difference|distinguish|separate)\b|\breadiness\b.{0,50}\b(?:own|itself|OneSmarter)\b.{0,30}\bcertif/i.test(message);
    const customerCertificationQuestion =
      /\b(?:are|will|would)\s+(?:we|I|our systems?|customer systems?)\s+(?:automatically\s+)?certified\b|\bautomatically\s+(?:certif(?:y|ies)|make(?:s)?)\s+(?:us|me|customers?)\b|\bmake(?:s)?\s+(?:us|me|customers?)\s+certified\b|\bmean\b.{0,30}\b(?:our|customer) systems?\b.{0,20}\bcertified\b/i.test(
        message,
      );
    const issuingQuestion =
      /\b(?:OneSmarter|you)\s+(?:issue|provide|grant)\b.{0,30}\bISO certificates?\b/i.test(
        message,
      );
    const guaranteeQuestion =
      /\b(?:guarantee|guarantees|guaranteed)\b.{0,25}\b(?:compliance|compliant)\b/i.test(message);
    const certificateDetailQuestion =
      /\b(?:certificate number|who issued|issuing body|certification scope|certificate scope|issue date|issued on|expiry|expire|expiration)\b/i.test(message);
    const readinessQuestion =
      /\b(?:readiness|services?|support|prepare|preparation|ISMS|control mapping|evidence preparation|remediation)\b/i.test(message);
    const certificationQuestion =
      /\b(?:certif(?:ied|ication)|certificate|logo)\b/i.test(message);
    const definitionQuestion = /\bwhat is ISO(?:\/IEC)?\s*27001\b/i.test(message);
    let answer = isoReadinessEntry.approvedSummary;
    let faqId = "faq_iso_readiness";
    let matchedEntries = [isoReadinessEntry];
    if (differenceQuestion) {
      answer = "OneSmarter's ISO/IEC 27001 certification is its own organizational credential. ISO/IEC 27001 readiness support is a separate client-facing service that helps organizations prepare through ISMS documentation, control mapping, evidence preparation, and remediation coordination. Readiness support does not automatically certify a customer, and OneSmarter does not issue ISO certificates.";
      faqId = "faq_iso_readiness_vs_certification";
      matchedEntries = [isoCertificationEntry, isoReadinessEntry];
    } else if (customerCertificationQuestion) {
      answer = "No. OneSmarter's ISO/IEC 27001 certification does not certify customer systems. ISO/IEC 27001 readiness support helps clients prepare, but certification is not automatic and OneSmarter does not issue ISO certificates.";
      faqId = "faq_iso_customer_certification_boundary";
    } else if (issuingQuestion) {
      answer = "No. OneSmarter provides ISO/IEC 27001 readiness support for clients; it does not issue ISO certificates.";
      faqId = "faq_iso_certificate_issuer_boundary";
    } else if (guaranteeQuestion) {
      answer = "No. ISO/IEC 27001 certification does not guarantee customer compliance, and OneSmarter's certification does not certify customer systems.";
      faqId = "faq_iso_compliance_guarantee_boundary";
      matchedEntries = [isoCertificationEntry];
    } else if (certificateDetailQuestion) {
      answer = "OneSmarter is ISO/IEC 27001 Certified, but Mira's approved knowledge does not include the requested certificate number, issuing body, exact scope, issue date, or expiry date. For documentary certificate evidence, contact care@onesmarter.com.";
      faqId = "faq_iso_certificate_details";
      matchedEntries = [isoCertificationEntry];
    } else if (readinessQuestion && !/\b(?:own certification|your certification|OneSmarter certified|are you certified)\b/i.test(message)) {
      answer = "OneSmarter provides ISO/IEC 27001 readiness support for clients through ISMS documentation, control mapping, evidence preparation, and remediation coordination. This service supports preparation; it does not issue certificates or guarantee certification or compliance.";
      faqId = "faq_iso_readiness";
    } else if (certificationQuestion) {
      const logoContext = /\blogo\b/i.test(message)
        ? "A logo alone should not be treated as certification evidence. "
        : "";
      answer = `${logoContext}Yes. OneSmarter is ISO/IEC 27001 Certified. This describes OneSmarter's own organizational credential and does not certify customer systems.`;
      faqId = "faq_iso_certification";
      matchedEntries = [isoCertificationEntry];
    } else if (definitionQuestion) {
      answer = "ISO/IEC 27001 is an information-security management system standard. OneSmarter provides readiness support for clients through ISMS documentation, control mapping, evidence preparation, and remediation coordination.";
      faqId = "faq_iso_definition";
    }
    return {
      faqId,
      answer,
      matchedEntries,
      entities: [],
      directAnswerEligible: true,
    };
  }

  if (/\bhow many platforms?\b/i.test(message)) {
    const platforms = [
      groundedConversationEntityForId("secure-ticketing-case-management"),
      groundedConversationEntityForId("bill-audit-bill-pay"),
    ].filter(Boolean);
    return {
      faqId: "faq_platform_count",
      answer: `OneSmarter presents ${platforms.length} platforms: ${platforms
        .map((platform) => platform.label)
        .join(" and ")}. Telecom Expense Management is a Bill Audit & Bill Pay use case, not a standalone promoted platform.`,
      matchedEntries: matchedEntriesForConversationEntities(platforms),
      entities: platforms,
      directAnswerEligible: true,
    };
  }

  return null;
};

const latestAssistantTurn = (conversationHistory = []) =>
  [...conversationHistory]
    .slice(-4)
    .reverse()
    .find((turn) => turn?.role === "assistant");

export const resolveMiraHiringFollowUp = (
  message = "",
  conversationHistory = [],
) => {
  const hiringEntry = knowledgeById.get("practice-hiring-support");
  const latestAssistant = latestAssistantTurn(conversationHistory);
  if (!hiringEntry || !latestAssistant) return null;

  const latestEntityIds = (latestAssistant.conversationEntities || []).map(
    ({ id }) => id,
  );
  const latestContent = String(latestAssistant.content || "");
  const hiringIsCurrent =
    latestEntityIds.includes("practice-hiring-support") ||
    /\b(?:practice hiring|agent-assisted hiring|AI hiring agent|hiring support)\b/i.test(
      latestContent,
    );
  if (!hiringIsCurrent) return null;

  const agentAlias =
    /\b(?:AI|agent|automated)[- ](?:version|option|hiring|hiring support)\b|\bagent-assisted (?:option|hiring|service)\b|\bin-development (?:one|option|version)\b/i.test(
      message,
    );
  const agentWasFocused =
    /\b(?:agent-assisted hiring|AI hiring agent)\b/i.test(latestContent) &&
    /\b(?:in development|not (?:yet |currently )?(?:an )?offered|no availability date)\b/i.test(
      latestContent,
    );
  const availabilityFollowUp =
    agentWasFocused &&
    /\b(?:is (?:it|that) available|can (?:I|we) use (?:it|that)(?: now| today)?|can (?:I|we) buy (?:it|that)(?: now| today)?|when is (?:it|that) available|is (?:it|that) live yet)\b/i.test(
      message,
    );
  const detailFollowUp =
    agentWasFocused &&
    /\b(?:what does (?:it|that) do|tell me more about (?:it|that)|explain (?:it|that|that part)|what about that feature)\b/i.test(
      message,
    );

  if (!agentAlias && !availabilityFollowUp && !detailFollowUp) return null;

  const answer = availabilityFollowUp
    ? "Not yet. Agent-assisted hiring is still in development and is not currently offered. No availability date has been committed."
    : hiringEntry.sourceFacts[1];
  return singleEntryFaqResult(
    hiringEntry,
    answer,
    availabilityFollowUp
      ? "faq_agent_assisted_hiring_availability_follow_up"
      : "faq_agent_assisted_hiring_follow_up",
  );
};
export const resolveMiraSuggestedFaqFastPath = (
  message = "",
  responseMode = {},
  suggestedQuestionId = "",
) => {
  const canonicalKnowledgeFaq = resolveCanonicalKnowledgeFaq(message);
  if (canonicalKnowledgeFaq) return canonicalKnowledgeFaq;
  const directFactualTopic = DIRECT_FACTUAL_RECOMMENDATION.test(message)
    ? null
    : resolveMiraDirectFactualTopic(message);
  if (directFactualTopic) return directFactualTopic;
  const normalized = String(message).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const requestedId = FAQ_IDS.has(suggestedQuestionId) ? suggestedQuestionId : "";
  const faqId = requestedId ||
    (/^(?:what does onesmarter do|tell me what onesmarter does|give me (?:a )?company overview|briefly explain what onesmarter does)$/.test(normalized)
      ? "faq_company_overview"
      : /^(?:what platforms do you offer|list your platforms|what are onesmarter s platforms|what are your platforms|list all platforms)$/.test(normalized)
        ? "faq_platforms"
        : /^(?:do you work with healthcare organizations|do you provide healthcare services|how does onesmarter support healthcare)$/.test(normalized)
          ? "faq_healthcare"
          : /^(?:what does soc 2 type ii attested mean here|what does your soc 2 type ii attestation mean|explain the soc 2 type ii attestation in detail)$/.test(normalized)
            ? "faq_soc2_attestation"
            : /^(?:are you hipaa certified|is onesmarter hipaa certified|are your platforms hipaa certified)$/.test(normalized)
              ? "faq_hipaa_status"
              : /^(?:how should i contact onesmarter|what is your contact email|how can i reach onesmarter|just give me the contact email)$/.test(normalized)
                ? "faq_contact"
                : "");
  if (!faqId) return null;

  if (faqId === "faq_platforms") return { faqId, platformListing: true };
  if (faqId === "faq_company_overview") {
    return {
      faqId,
      answer: responseMode.answerShape === "brief"
        ? "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance-readiness support for healthcare, financial, telecom, and growing organizations."
        : "OneSmarter builds secure platforms, practical AI workflows, Technology Solutions, Business Services, and compliance and security readiness support for healthcare, financial, telecom, and growing organizations.",
      matchedEntries: entriesForIds(["company-overview"]),
      entities: [],
    };
  }
  if (faqId === "faq_healthcare") {
    return {
      faqId,
      answer: "Yes. OneSmarter supports healthcare and TPA operations through Healthcare & TPA Technology Services, Claims Processing Services, and secure workflow capabilities such as Secure Ticketing and Case Management.",
      matchedEntries: entriesForIds(["technology-solutions-overview", "claims-processing-services", "secure-ticketing-case-management"]),
      entities: ["healthcare-tpa-technology-services", "claims-processing-services", "secure-ticketing-case-management"].map((id) => groundedConversationEntityForId(id)).filter(Boolean),
    };
  }
  if (faqId === "faq_soc2_attestation") {
    const detailed = responseMode.mode === "detailed_explanation";
    return {
      faqId,
      answer: detailed
        ? "The OneSmarter Trust Center states that OneSmarter is SOC 2 Type II Attested as part of its ongoing security and operational controls program. This describes OneSmarter's attestation and does not certify customer systems or mean every service automatically makes a customer compliant. Formal reports and evidence are handled through a direct business process."
        : "The OneSmarter Trust Center states that OneSmarter is SOC 2 Type II Attested. This describes OneSmarter's attestation; it does not certify customer systems or mean every service automatically makes a customer compliant.",
      matchedEntries: entriesForIds(["soc2-attested"]),
      entities: [groundedConversationEntityForId("soc2-attested")].filter(Boolean),
    };
  }
  if (faqId === "faq_hipaa_status") {
    return {
      faqId,
      answer: "No. OneSmarter does not present itself as HIPAA certified. The approved Trust Center wording is “HIPAA Security Rule Compliance Assessment Completed.” This is not a universal certification and does not mean using a platform automatically makes a customer HIPAA compliant.",
      matchedEntries: entriesForIds(["hipaa-security-rule-assessment"]),
      entities: [groundedConversationEntityForId("hipaa-security-rule-assessment")].filter(Boolean),
    };
  }
  return {
    faqId,
    answer: /^(?:what is your contact email|just give me the contact email)$/.test(normalized)
      ? "care@onesmarter.com"
      : "For business inquiries, email care@onesmarter.com.",
    matchedEntries: entriesForIds(["contact-handoff"]),
    entities: [groundedConversationEntityForId("contact-handoff")].filter(Boolean),
  };
};

export const resolveMiraResponseModeFastPath = (message = "", responseMode = {}) => {
  if (responseMode.mode === "overview") {
    if (responseMode.answerShape === "brief") {
      return {
        answer:
          "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance-readiness support for healthcare, financial, telecom, and growing organizations.",
        matchedEntries: entriesForIds(["company-overview"]),
        entities: [],
      };
    }

    return {
      answer:
        "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance-readiness support. Its work spans healthcare, financial, telecom, and growing organizations.",
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
    /\b(?:onesmarter|the company|company overview)\b/i.test(message)
  ) {
    return {
      answer: [
        "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance-readiness support.",
        "- Platforms support secure case management and bill-audit and payment workflows.",
        "- Technology services cover healthcare and claims operations, IBM i / AS400, enterprise software, and support consolidation.",
        "- Practical AI services support controlled automation and document workflows.",
        "- Business services cover finance, HR, payments, benefits, and back-office workflows.",
        "- Compliance-readiness and Trust Center information is grounded in approved public evidence.",
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
