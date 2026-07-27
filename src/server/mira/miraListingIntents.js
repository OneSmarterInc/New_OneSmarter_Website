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
  /\b(?:bifurcate|separate|categorize|organize|group)\b.*\b(?:services?|platforms?|by type)\b|\bshow\b.*\b(?:services?|platforms?)\b.*\bseparately\b/i;
const LIST_INTENT =
  /\b(?:list|give|show|what are|which are)\b.*\b(?:all\s+)?(?:onesmarter\s+)?(?:platforms?|services?)\b|\ball (?:onesmarter )?(?:platforms?|services?)\b/i;

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

export const resolveMiraListingRequest = (
  message = "",
  conversationHistory = [],
) => {
  const intent = classifyMiraListingIntent(message);
  if (!intent || intent === "compare_entities") return null;

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
    answer: categorizedAnswer(categories),
  };
};

export default resolveMiraListingRequest;
