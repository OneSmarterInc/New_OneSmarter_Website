import {
  buildConversationEntityGroups,
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
} from "./miraConversationReferences.js";

const PLATFORM_IDS = [
  "secure-ticketing-case-management",
  "bill-audit-bill-pay",
];
const SERVICE_IDS = [
  "healthcare-tpa-technology-services",
  "claims-processing-services",
  "ai-agentic-services",
  "ibm-i-as400-services",
  "enterprise-software-development",
  "software-support-consolidation",
];

const normalizedIntentText = (message = "") =>
  String(message)
    .toLowerCase()
    .replace(/\bplatfporms?\b|\bplatfroms?\b/g, "platforms")
    .replace(/\bservies\b|\bserivces\b/g, "services")
    .replace(/\s+/g, " ")
    .trim();

const COMPARISON_INTENT =
  /\b(?:compare|comparison|difference|different from|versus|vs\.?|which (?:one|option|platform|service) is better|pros and cons|one versus another)\b/i;
const REORGANIZE_INTENT =
  /\b(?:bifurcate|separate|categorize|organize|group)\b.*\b(?:services?|platforms?|by type)\b|\b(?:show|list)\b.*\b(?:services?|platforms?)\b.*\bseparately\b/i;
const LIST_INTENT =
  /\b(?:list|give|show|what are|which are)\b.*\b(?:all\s+)?(?:(?:onesmarter|your)\s+)?(?:platforms?|services?)\b|\b(?:tell|give|show)\b[^.!?]{0,30}\bnames?\s+of\s+(?:the\s+|your\s+|onesmarter\s+)?(?:platforms?|services?)\b|\bwhat (?:platforms?|services?) (?:does onesmarter|do you) offer\b|\bwhich offerings? are (?:platforms?|services?)\b|\ball (?:onesmarter )?(?:platforms?|services?)\b|\bwhat does (?:each|every)\b[^.!?]{0,40}\b(?:platform|service) supports?\b|\bwhat do (?:the|your|both|all) (?:platforms|services) supports?\b|\b(?:each|every|both|all|these|the|your)\b[^.!?]{0,40}\b(?:platforms?|services?)\b.*\b(?:supports?|provide|handle|capabilit(?:y|ies))\b/i;
const CAPABILITY_SCOPE =
  /\b(?:supports?|capabilit(?:y|ies)|handle|provide)\b/i;

export const classifyMiraListingIntent = (message = "") => {
  const normalized = normalizedIntentText(message);
  if (COMPARISON_INTENT.test(normalized)) return "compare_entities";
  if (REORGANIZE_INTENT.test(normalized)) return "reorganize_previous_list";
  if (!LIST_INTENT.test(normalized)) return "";
  const asksPlatforms = /\bplatforms?\b/.test(normalized);
  const asksServices = /\bservices?\b/.test(normalized);
  if (asksPlatforms && asksServices) return "list_services_and_platforms";
  if (asksPlatforms) return "list_platforms";
  if (asksServices) return "list_services";
  return "";
};

const entityForId = (id) =>
  groundedConversationEntityForId(id, {
    level: SERVICE_IDS.includes(id) ? 1 : 0,
    includeChildren: false,
  });

const canonicalPlatforms = () => PLATFORM_IDS.map(entityForId).filter(Boolean);
const canonicalServices = () => SERVICE_IDS.map(entityForId).filter(Boolean);

const uniqueById = (entities = []) =>
  entities.filter(
    (entity, index) =>
      entity?.id &&
      entities.findIndex((candidate) => candidate?.id === entity.id) === index,
  );

const priorEntitiesForReorganization = (message, conversationHistory) => {
  const groups = buildConversationEntityGroups(conversationHistory);
  const latest = groups[0]?.items || [];
  if (!latest.length) return [];
  const normalized = normalizedIntentText(message);
  if (/\bfirst\b/.test(normalized) && /\bsecond\b/.test(normalized)) {
    return latest.slice(0, 2);
  }
  return latest;
};

const categorizedEntities = (entities = []) => ({
  platforms: uniqueById(entities.filter((entity) => entity.type === "platform")),
  services: uniqueById(entities.filter((entity) => entity.type === "service")),
  serviceCategories: uniqueById(
    entities.filter((entity) => entity.type === "service_category"),
  ),
});

const categorizedAnswer = ({ platforms, services, serviceCategories }) =>
  [
    ...(platforms.length
      ? ["Platforms", ...platforms.map((entity) => `- ${entity.label}`), ""]
      : []),
    ...(services.length
      ? ["Services", ...services.map((entity) => `- ${entity.label}`), ""]
      : []),
    ...(serviceCategories.length
      ? [
          "Service categories",
          ...serviceCategories.map((entity) => `- ${entity.label}`),
        ]
      : []),
  ]
    .join("\n")
    .trim();

const categorizedDetailedAnswer = ({ platforms, services, serviceCategories }) =>
  [
    ...(platforms.length
      ? [
          "Platforms",
          ...platforms.map(
            (entity) => `- ${entity.label}: ${entity.approvedSummary}`,
          ),
          "",
        ]
      : []),
    ...(services.length
      ? [
          "Services",
          ...services.map(
            (entity) => `- ${entity.label}: ${entity.approvedSummary}`,
          ),
          "",
        ]
      : []),
    ...(serviceCategories.length
      ? [
          "Service categories",
          ...serviceCategories.map(
            (entity) => `- ${entity.label}: ${entity.approvedSummary}`,
          ),
        ]
      : []),
  ]
    .join("\n")
    .trim();

const approvedCapabilityFacts = (entity) =>
  (entity.sourceFacts || []).filter(
    (fact) =>
      !/\b(?:should not|not positioned|does not|concept|page uses)\b/i.test(fact),
  );

const capabilitySentence = (entity) => {
  const facts = approvedCapabilityFacts(entity);
  const primary = facts[0] || entity.approvedSummary || entity.label;
  let sentence = primary
    .replace(/^The (?:platform|service) supports\s+/i, `${entity.label} supports `)
    .replace(/^The (?:platform|service) helps\s+/i, `${entity.label} helps `);
  if (sentence.toLowerCase().startsWith(entity.label.toLowerCase())) {
    sentence = `${entity.label}${sentence.slice(entity.label.length)}`;
  } else {
    sentence = `${entity.label}: ${sentence}`;
  }
  if (
    entity.id === "bill-audit-bill-pay" &&
    facts.some((fact) => /telecom expense management.+use case/i.test(fact))
  ) {
    sentence = `${sentence.replace(/[.]$/, "")}, including telecom expense management as an approved use case.`;
  }
  return sentence;
};

export const capabilitySummaryAnswerForEntities = (entities = []) =>
  entities.map(capabilitySentence).join("\n\n");

const capabilityNamesForEntity = (entity) => {
  const fact = approvedCapabilityFacts(entity).find((candidate) =>
    /\bsupports?\b/i.test(candidate),
  );
  if (!fact) return [entity.label];
  const capabilityText = fact
    .replace(/^.*?\bsupports?\s+/i, "")
    .replace(/[.]$/, "")
    .replace(/,?\s+and\s+/i, ", ");
  return capabilityText.split(/,\s*/).map((capability) => capability.trim());
};

export const capabilityNamesAnswerForEntities = (entities = []) =>
  [...new Set(entities.flatMap(capabilityNamesForEntity).filter(Boolean))].join(
    "\n",
  );

export const resolveMiraListingRequest = (
  message = "",
  conversationHistory = [],
) => {
  const intent = classifyMiraListingIntent(message);
  if (!intent || intent === "compare_entities") return null;
  if (/\bbusiness services?\b/i.test(message)) return null;

  let entities = [];
  if (intent === "list_platforms") {
    entities = canonicalPlatforms();
  } else if (intent === "list_services") {
    entities = canonicalServices();
  } else if (intent === "list_services_and_platforms") {
    entities = [...canonicalPlatforms(), ...canonicalServices()];
  } else {
    entities = priorEntitiesForReorganization(message, conversationHistory);
    if (!entities.length) {
      entities = [...canonicalPlatforms(), ...canonicalServices()];
    }
  }

  const categories = categorizedEntities(entities);
  const categorized = [
    ...categories.platforms,
    ...categories.services,
    ...categories.serviceCategories,
  ];
  if (!categorized.length) return null;

  return {
    intent,
    entities: categorized,
    matchedEntries: matchedEntriesForConversationEntities(categorized),
    answer: /\b(?:explain|describe)\b.*\b(?:each|all)\b|\b(?:each|all)\b.*\b(?:explain|describe)\b/i.test(
      message,
    )
      ? categorizedDetailedAnswer(categories)
      : CAPABILITY_SCOPE.test(normalizedIntentText(message))
      ? capabilitySummaryAnswerForEntities(categorized)
      : categorizedAnswer(categories),
    capabilitySummary: CAPABILITY_SCOPE.test(normalizedIntentText(message)),
  };
};

export default resolveMiraListingRequest;
