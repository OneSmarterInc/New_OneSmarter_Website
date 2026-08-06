import { onesmarterPublicKnowledgeBase } from "../../data/agentKnowledge/onesmarterPublicKb.js";

const MAX_ENTITY_SETS = 3;
const MAX_TOP_LEVEL_ENTITIES = 8;
const MAX_CHILD_ENTITIES = 8;

const knowledgeById = new Map(
  onesmarterPublicKnowledgeBase.map((entry) => [entry.id, entry]),
);

const ENTITY_DEFINITIONS = {
  "technology-solutions-overview": {
    label: "Technology Solutions Overview",
    type: "service_category",
    children: [
      {
        id: "healthcare-tpa-technology-services",
        label: "Healthcare & TPA Technology Services",
        type: "service",
        sourceIds: ["technology-solutions-overview"],
        approvedSummary:
          "Healthcare & TPA Technology Services are a Technology Solutions service area for healthcare operations and TPA technology work.",
        sourceFacts: [
          "Healthcare & TPA Technology Services are included under Technology Solutions.",
        ],
      },
      {
        id: "claims-processing-services",
        label: "Claims Processing Services",
        type: "service",
        sourceIds: ["claims-processing-services"],
      },
      {
        id: "ai-agentic-services",
        label: "AI Agentic Services",
        type: "service",
        sourceIds: ["ai-agentic-services"],
      },
      {
        id: "ibm-i-as400-services",
        label: "IBM i / AS400 Services",
        type: "service",
        sourceIds: ["technology-solutions-overview"],
        approvedSummary:
          "IBM i / AS400 Services are an approved service area within OneSmarter Technology Solutions.",
        sourceFacts: [
          "IBM i / AS400 Services are included under Technology Solutions.",
        ],
      },
      {
        id: "enterprise-software-development",
        label: "Enterprise Software Development",
        type: "service",
        sourceIds: ["technology-solutions-overview"],
        approvedSummary:
          "Enterprise Software Development is an approved service area within OneSmarter Technology Solutions.",
        sourceFacts: [
          "Enterprise Software Development is included under Technology Solutions.",
        ],
      },
      {
        id: "software-support-consolidation",
        label: "Software Support Consolidation",
        type: "service",
        sourceIds: ["technology-solutions-overview"],
        approvedSummary:
          "Software Support Consolidation is a Technology Solutions service that coordinates ongoing software maintenance, enhancements, issue resolution, documentation, and knowledge transfer through global delivery and support teams to support operational continuity.",
        sourceFacts: [
          "Software Support Consolidation coordinates software maintenance, enhancements, issue resolution, documentation, and knowledge transfer through global delivery and support teams.",
          "The service supports operational continuity by consolidating ongoing application support activities.",
        ],
      },
    ],
  },
};

const childDefinitionById = new Map(
  Object.entries(ENTITY_DEFINITIONS).flatMap(([parentId, definition]) =>
    (definition.children || []).map((child) => [child.id, { ...child, parentId }]),
  ),
);

const entityTypeFor = (entry) => {
  const category = String(entry?.category || "").toLowerCase();
  if (category === "platforms") return "platform";
  if (category.includes("service") || category.includes("technology")) return "service";
  if (category.includes("industry")) return "industry";
  return "topic";
};

const groundedChildEntity = (definition, position) => {
  const directSource = knowledgeById.get(definition.id);
  return {
    id: definition.id,
    label: definition.label,
    type: definition.type,
    level: 1,
    position,
    parentId: definition.parentId || "technology-solutions-overview",
    sourceIds: definition.sourceIds.filter((sourceId) =>
      knowledgeById.has(sourceId),
    ),
    approvedSummary:
      definition.approvedSummary || directSource?.approvedSummary || "",
    sourceFacts: definition.sourceFacts || directSource?.sourceFacts || [],
  };
};

export const groundedConversationEntityForId = (
  id,
  { level = 0, position = 1, includeChildren = true } = {},
) => {
  const childDefinition = childDefinitionById.get(id);
  if (level > 0 && childDefinition) {
    return groundedChildEntity(childDefinition, position);
  }
  const entry = knowledgeById.get(id);
  if (!entry) return null;
  const definition = ENTITY_DEFINITIONS[id];
  return {
    id: entry.id,
    label: definition?.label || entry.title,
    type: definition?.type || entityTypeFor(entry),
    level: 0,
    position,
    sourceIds: [entry.id],
    approvedSummary: entry.approvedSummary,
    sourceFacts: entry.sourceFacts || [],
    ...(includeChildren && definition?.children?.length
      ? {
          children: definition.children
            .slice(0, MAX_CHILD_ENTITIES)
            .map((child, index) => groundedChildEntity(child, index + 1)),
        }
      : {}),
  };
};

export const buildGroundedConversationEntities = (matchedEntries = []) => {
  const matchedIds = new Set(matchedEntries.map((entry) => entry?.id));
  const childIdsToNest = new Set(
    [...matchedIds].filter((id) => {
      const parentId = childDefinitionById.get(id)?.parentId;
      return parentId && matchedIds.has(parentId);
    }),
  );
  return matchedEntries
    .filter((entry) => !childIdsToNest.has(entry?.id))
    .map((entry, index) =>
      groundedConversationEntityForId(entry?.id, { position: index + 1 }),
    )
    .filter(Boolean)
    .filter((entity, index, entities) =>
      entities.findIndex((candidate) => candidate.id === entity.id) === index,
    )
    .slice(0, MAX_TOP_LEVEL_ENTITIES)
    .map((entity, index) => ({ ...entity, position: index + 1 }));
};

export const normalizeGroundedConversationEntities = (entities) => {
  if (!Array.isArray(entities)) return [];
  return entities
    .slice(0, MAX_TOP_LEVEL_ENTITIES)
    .map((entity, index) =>
      groundedConversationEntityForId(entity?.id, {
        level: entity?.level === 1 ? 1 : 0,
        position: index + 1,
      }),
    )
    .filter(Boolean);
};

export const knownMiraOfferingEntities = () =>
  [
    ...onesmarterPublicKnowledgeBase.map((entry) =>
      groundedConversationEntityForId(entry.id, { includeChildren: false }),
    ),
    ...childDefinitionById.keys().map((id) =>
      groundedConversationEntityForId(id, { level: 1, includeChildren: false }),
    ),
  ]
    .filter((entity) => ["platform", "service"].includes(entity?.type))
    .filter(
      (entity, index, entities) =>
        entities.findIndex((candidate) => candidate.id === entity.id) === index,
    );

const MAIN_OFFERING_IDS = [
  "secure-ticketing-case-management",
  "bill-audit-bill-pay",
  "technology-solutions-overview",
];
const PLATFORM_IDS = [
  "secure-ticketing-case-management",
  "bill-audit-bill-pay",
];

const groupForEntities = (entities, sourceTurnId = "") => {
  const ids = entities.map((entity) => entity.id);
  const isMainOfferings =
    MAIN_OFFERING_IDS.every((id) => ids.includes(id)) && ids.length === 3;
  const isPlatforms =
    PLATFORM_IDS.every((id) => ids.includes(id)) && ids.length === 2;
  const parentIds = [...new Set(entities.map((entity) => entity.parentId).filter(Boolean))];
  const isSingleParentChildGroup =
    entities.length > 0 && parentIds.length === 1 && entities.every((entity) => entity.level === 1);
  const groupId = isMainOfferings
    ? "main-offerings"
    : isPlatforms
      ? "platforms"
    : isSingleParentChildGroup
      ? `${parentIds[0]}-services`
      : `entities:${ids.join("|")}`;
  return {
    groupId,
    type: isMainOfferings
      ? "offering"
      : isPlatforms
        ? "platform"
      : isSingleParentChildGroup
        ? "service"
        : entities[0]?.type || "entity",
    sourceTurnId,
    ...(isSingleParentChildGroup ? { parentId: parentIds[0] } : {}),
    items: entities,
  };
};

export const buildConversationEntityGroups = (
  conversationHistory = [],
  currentEntities = [],
  currentTurnId = "current",
) => {
  const groups = [];
  if (currentEntities.length) {
    groups.push(groupForEntities(currentEntities, currentTurnId));
  }
  conversationHistory
    .slice()
    .reverse()
    .filter((turn) => turn?.role === "assistant")
    .forEach((turn, index) => {
      const entities = normalizeGroundedConversationEntities(turn.conversationEntities);
      if (entities.length) groups.push(groupForEntities(entities, `history-${index + 1}`));
    });
  return groups
    .filter(
      (group, index, allGroups) =>
        allGroups.findIndex((candidate) => candidate.groupId === group.groupId) === index,
    )
    .slice(0, MAX_ENTITY_SETS);
};

const normalizeReferenceText = (message = "") =>
  String(message)
    .toLowerCase()
    .replace(/\btherd\b/g, "third")
    .replace(/\bfrist\b/g, "first")
    .replace(/\bsecnd\b/g, "second")
    .replace(/\bforth\b/g, "fourth")
    .replace(/\babut\b/g, "about")
    .replace(/\b1st\b/g, "first")
    .replace(/\b2nd\b/g, "second")
    .replace(/\b3rd\b/g, "third")
    .replace(/\b4th\b/g, "fourth")
    .replace(/\s+/g, " ")
    .trim();

const ordinalIndex = (value = "") => {
  const normalized = value.trim();
  const values = {
    first: 0,
    one: 0,
    "1": 0,
    second: 1,
    two: 1,
    "2": 1,
    third: 2,
    three: 2,
    "3": 2,
    fourth: 3,
    four: 3,
    "4": 3,
  };
  return values[normalized] ?? -1;
};

const requestedType = (message = "") => {
  if (/\bservice categor(?:y|ies)\b/.test(message)) return "service_category";
  const match = message.match(
    /\b(platform|service|industry|topic|offering|capability|use case)s?\b/,
  );
  return match?.[1] === "use case" ? "use_case" : match?.[1] || "";
};

const hasReferenceLanguage = (message = "") =>
  /\b(first|second|third|fourth|last|previous|former|latter|each one|both|their capabilities|these (?:platforms|services|offerings|options)|above (?:two|platforms|services|offerings|options)|option\s+[1-4]|number\s+(?:one|two|three|four)|that one|this (?:platform|service|industry|topic)|that (?:platform|service|industry|topic)|tell (?:me )?more about it|compare the|different from|one or both)\b/.test(
    message,
  );

const isScopedListRequest = (message = "") =>
  !/\b(first|second|third|fourth|last|previous|former|latter|option|number)\b/.test(
    message,
  ) &&
  /\b(what|which|list|show)\b.*\b(items?|services?|topics?)\b.*\b(under|inside|within)\b/.test(
    message,
  );

const directlyScopedParent = (message = "") => {
  const searchableMessage = normalizedLabel(message);
  for (const parentId of Object.keys(ENTITY_DEFINITIONS)) {
    const parent = groundedConversationEntityForId(parentId);
    const parentLabel = normalizedLabel(parent?.label);
    const parentLabelWithoutOverview = parentLabel.replace(/\s+overview$/, "");
    if (
      parent &&
      (searchableMessage.includes(parentLabel) ||
        searchableMessage.includes(parentLabelWithoutOverview))
    ) {
      return parent;
    }
  }
  return null;
};

const recentEntityGroups = (conversationHistory = []) =>
  buildConversationEntityGroups(conversationHistory);

const normalizedLabel = (label = "") =>
  String(label).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const parentScopeFor = (message, group) => {
  if (!/\b(under|inside|within)\b/.test(message)) return null;
  const searchableMessage = normalizedLabel(message);
  if (group.parentId) {
    const parent = groundedConversationEntityForId(group.parentId);
    if (parent && searchableMessage.includes(normalizedLabel(parent.label))) {
      return { parent, entities: group.items };
    }
  }
  return (
    group.items
      .filter((entity) => entity.children?.length)
      .map((parent) => ({ parent, entities: parent.children }))
      .find(({ parent }) =>
        searchableMessage.includes(normalizedLabel(parent.label)),
      ) || null
  );
};

const selectEntityGroup = (groups, type, message) => {
  if (!type && !/\b(under|inside|within)\b/.test(message)) {
    return { entities: groups[0]?.items || [], ambiguousParents: [] };
  }
  for (const group of groups) {
    const scopedParent = parentScopeFor(message, group);
    if (scopedParent) {
      const scopedChildren = scopedParent.entities.filter(
        (entity) => !type || entity.type === type,
      );
      return { entities: scopedChildren, ambiguousParents: [] };
    }

    const typedTopLevel =
      type === "offering"
        ? group.type === "offering"
          ? group.items
          : []
        : group.items.filter((entity) => entity.type === type);
    if (typedTopLevel.length) {
      return { entities: typedTopLevel, ambiguousParents: [] };
    }

    const nestedGroups = group.items
      .map((parent) => ({
        parent,
        entities: (parent.children || []).filter((entity) => entity.type === type),
      }))
      .filter((group) => group.entities.length);
    if (nestedGroups.length === 1) {
      return { entities: nestedGroups[0].entities, ambiguousParents: [] };
    }
    if (nestedGroups.length > 1) {
      return {
        entities: [],
        ambiguousParents: nestedGroups.map((group) => group.parent),
      };
    }
  }
  return { entities: [], ambiguousParents: [] };
};

const explicitlyNamedEntity = (message, sets) => {
  const searchableMessage = normalizedLabel(message);
  for (const group of sets) {
    for (const parent of group.items) {
      for (const entity of [...(parent.children || []), parent]) {
        const label = normalizedLabel(entity.label);
        if (label && searchableMessage.includes(label)) return entity;
      }
    }
  }
  return null;
};

const formatEntityChoices = (entities) => {
  const labels = entities.map((entity) => entity.label);
  if (labels.length < 2) return labels[0] || "the item you mean";
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, or ${labels.at(-1)}`;
};

const clarificationFor = (entities, type = "item") => {
  if (!entities.length) {
    return `Which ${type} would you like me to explain?`;
  }
  return `I listed ${entities.length} ${entities.length === 1 ? "item" : "items"}. Did you mean ${formatEntityChoices(entities)}?`;
};

const resolveIndexes = (message, entityCount) => {
  if (
    /\b(?:each one|both|their capabilities|these (?:platforms|services|offerings|options)|above (?:two|platforms|services|offerings|options))\b/.test(
      message,
    )
  ) {
    return Array.from({ length: entityCount }, (_, index) => index);
  }
  if (/\bone or both\b/.test(message) && entityCount === 2) return [0, 1];
  if (/\b(?:compare )?(?:the )?two\b/.test(message) && entityCount === 2) {
    return [0, 1];
  }
  if (/\bfirst two\b/.test(message)) return [0, 1];
  if (/\blast two\b/.test(message)) return [entityCount - 2, entityCount - 1];
  if (/\bformer\b/.test(message)) return [0];
  if (/\blatter\b/.test(message)) return [1];
  if (/\blast one\b|\blast (?:platform|service|industry|topic)\b/.test(message)) {
    return [entityCount - 1];
  }
  if (/\bprevious one\b/.test(message)) return [entityCount - 2];

  const references = [];
  const pattern =
    /\b(first|second|third|fourth|option\s+([1-4])|number\s+(one|two|three|four))\b/g;
  for (const match of message.matchAll(pattern)) {
    const value = match[2] || match[3] || match[1];
    const index = ordinalIndex(value);
    if (index >= 0 && !references.includes(index)) references.push(index);
  }
  if (
    /\blast\b/.test(message) &&
    entityCount > 0 &&
    !references.includes(entityCount - 1)
  ) {
    references.push(entityCount - 1);
  }
  return references;
};

export const resolveMiraConversationReference = (
  message,
  conversationHistory = [],
) => {
  const normalizedMessage = normalizeReferenceText(message);
  const sets = recentEntityGroups(conversationHistory);
  const namedEntity = /\b(under|inside|within)\b/.test(normalizedMessage)
    ? null
    : explicitlyNamedEntity(normalizedMessage, sets);
  if (namedEntity) {
    return {
      kind: "resolved",
      entities: [namedEntity],
      isComparison: false,
      hadEntityContext: true,
    };
  }
  const scopedListRequest = isScopedListRequest(normalizedMessage);
  if (!hasReferenceLanguage(normalizedMessage) && !scopedListRequest) {
    return { kind: "none", entities: [], isComparison: false, hadEntityContext: false };
  }

  const type = requestedType(normalizedMessage);
  if (scopedListRequest && !sets.length) {
    const parent = directlyScopedParent(normalizedMessage);
    const entities = (parent?.children || []).filter(
      (entity) => !type || entity.type === type,
    );
    if (entities.length) {
      return {
        kind: "resolved",
        entities,
        isComparison: false,
        isList: true,
        canonicalHierarchyList:
          parent?.id === "technology-solutions-overview",
        hadEntityContext: false,
      };
    }
  }
  const selection = selectEntityGroup(sets, type, normalizedMessage);
  const entitySet = selection.entities;
  if (selection.ambiguousParents.length) {
    return {
      kind: "clarification",
      entities: [],
      isComparison: false,
      hadEntityContext: true,
      clarification: `Which parent list did you mean: ${formatEntityChoices(selection.ambiguousParents)}?`,
    };
  }
  if (!entitySet.length) {
    return {
      kind: "clarification",
      entities: [],
      isComparison: false,
      hadEntityContext: false,
      clarification: clarificationFor([], type || "item"),
    };
  }

  if (scopedListRequest) {
    return {
      kind: "resolved",
      entities: entitySet,
      isComparison: false,
      isList: true,
      canonicalHierarchyList: entitySet.every(
        (entity) => entity.parentId === "technology-solutions-overview",
      ),
      hadEntityContext: true,
    };
  }

  let indexes = resolveIndexes(normalizedMessage, entitySet.length);
  const singularReference =
    /\b(that one|this (?:platform|service|industry|topic)|that (?:platform|service|industry|topic)|tell (?:me )?more about it)\b/.test(
      normalizedMessage,
    );
  if (!indexes.length && singularReference && entitySet.length === 1) indexes = [0];

  const validIndexes = indexes.filter(
    (index) => index >= 0 && index < entitySet.length,
  );
  if (!indexes.length || validIndexes.length !== indexes.length) {
    return {
      kind: "clarification",
      entities: entitySet,
      isComparison: false,
      hadEntityContext: true,
      clarification: clarificationFor(entitySet, type || "item"),
    };
  }

  const entities = validIndexes.map((index) => entitySet[index]);
  const isComparison =
    entities.length > 1 &&
    /\b(compare|compared|different|difference|versus|vs)\b/.test(
      normalizedMessage,
    );
  return { kind: "resolved", entities, isComparison, hadEntityContext: true };
};

export const matchedEntriesForConversationEntities = (entities = []) =>
  entities
    .flatMap((entity) => entity.sourceIds || [])
    .map((sourceId) => knowledgeById.get(sourceId))
    .filter(Boolean)
    .filter((entry, index, entries) =>
      entries.findIndex((candidate) => candidate.id === entry.id) === index,
    )
    .map((entry) => ({
      id: entry.id,
      route: entry.route,
      title: entry.title,
      category: entry.category,
      approvedSummary: entry.approvedSummary,
      sourceFacts: entry.sourceFacts,
      allowedClaims: entry.allowedClaims,
      handoffGuidance: entry.handoffGuidance,
      relatedQuestions: entry.relatedQuestions,
      sourceLabel: entry.sourceLabel,
      score: 50,
      matchedTerms: [],
    }));
