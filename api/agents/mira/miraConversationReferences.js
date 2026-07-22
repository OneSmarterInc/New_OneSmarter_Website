import { onesmarterPublicKnowledgeBase } from "../../../src/data/agentKnowledge/onesmarterPublicKb.js";

const MAX_ENTITY_SETS = 3;
const MAX_TOP_LEVEL_ENTITIES = 8;
const MAX_CHILD_ENTITIES = 8;

const knowledgeById = new Map(
  onesmarterPublicKnowledgeBase.map((entry) => [entry.id, entry]),
);

const ENTITY_DEFINITIONS = {
  "technology-solutions-overview": {
    label: "Technology Solutions",
    type: "platform",
    children: [
      {
        id: "healthcare-tpa-technology-services",
        label: "Healthcare & TPA Technology Services",
        type: "service",
        sourceIds: ["technology-solutions-overview"],
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
      },
      {
        id: "enterprise-software-development",
        label: "Enterprise Software Development",
        type: "service",
        sourceIds: ["technology-solutions-overview"],
      },
      {
        id: "software-support-consolidation",
        label: "Software Support Consolidation",
        type: "service",
        sourceIds: ["technology-solutions-overview"],
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

const groundedChildEntity = (definition, position) => ({
  id: definition.id,
  label: definition.label,
  type: definition.type,
  level: 1,
  position,
  sourceIds: definition.sourceIds.filter((sourceId) => knowledgeById.has(sourceId)),
});

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
      groundedConversationEntityForId(entity?.id, { position: index + 1 }),
    )
    .filter(Boolean);
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
  const match = message.match(/\b(platform|service|industry|topic)s?\b/);
  return match?.[1] || "";
};

const hasReferenceLanguage = (message = "") =>
  /\b(first|second|third|fourth|last|previous|former|latter|option\s+[1-4]|number\s+(?:one|two|three|four)|that one|this (?:platform|service|industry|topic)|that (?:platform|service|industry|topic)|tell (?:me )?more about it|compare the|different from)\b/.test(
    message,
  );

const recentEntitySets = (conversationHistory = []) =>
  conversationHistory
    .slice()
    .reverse()
    .filter((turn) => turn?.role === "assistant")
    .map((turn) => normalizeGroundedConversationEntities(turn.conversationEntities))
    .filter((entities) => entities.length)
    .slice(0, MAX_ENTITY_SETS);

const normalizedLabel = (label = "") =>
  String(label).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const parentScopeFor = (message, entitySet) => {
  if (!/\b(under|inside|within)\b/.test(message)) return null;
  const searchableMessage = normalizedLabel(message);
  return (
    entitySet.find((entity) =>
      searchableMessage.includes(normalizedLabel(entity.label)),
    ) || null
  );
};

const selectEntitySet = (sets, type, message) => {
  if (!type && !/\b(under|inside|within)\b/.test(message)) {
    return { entities: sets[0] || [], ambiguousParents: [] };
  }
  for (const set of sets) {
    const scopedParent = parentScopeFor(message, set);
    if (scopedParent) {
      const scopedChildren = (scopedParent.children || []).filter(
        (entity) => !type || entity.type === type,
      );
      return { entities: scopedChildren, ambiguousParents: [] };
    }

    const typedTopLevel = set.filter((entity) => entity.type === type);
    if (typedTopLevel.length) {
      return { entities: typedTopLevel, ambiguousParents: [] };
    }

    const nestedGroups = set
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
  for (const set of sets) {
    for (const parent of set) {
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
  return references;
};

export const resolveMiraConversationReference = (
  message,
  conversationHistory = [],
) => {
  const normalizedMessage = normalizeReferenceText(message);
  const sets = recentEntitySets(conversationHistory);
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
  if (!hasReferenceLanguage(normalizedMessage)) {
    return { kind: "none", entities: [], isComparison: false, hadEntityContext: false };
  }

  const type = requestedType(normalizedMessage);
  const selection = selectEntitySet(sets, type, normalizedMessage);
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
    entities.length > 1 && /\b(compare|different|difference)\b/.test(normalizedMessage);
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
