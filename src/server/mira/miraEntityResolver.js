import { groundedConversationEntityForId } from "./miraConversationReferences.js";

const GENERIC_TOKENS = new Set([
  "and",
  "platform",
  "service",
  "solution",
  "overview",
  "technology",
  "support",
  "software",
]);

const OFFERING_CONFIG = [
  {
    id: "secure-ticketing-case-management",
    aliases: [
      "secure ticketing and case management",
      "secure ticketing",
      "secure ticket",
      "ticketing case management",
      "case workflow platform",
      "case management platform",
    ],
  },
  {
    id: "bill-audit-bill-pay",
    aliases: [
      "bill audit and bill pay",
      "bill audit",
      "bill pay",
      "bill pay audit",
      "bill auditing",
      "invoice audit",
      "vendor bill platform",
    ],
  },
  {
    id: "technology-solutions-overview",
    aliases: ["technology solutions overview", "technology solutions"],
  },
  {
    id: "healthcare-tpa-technology-services",
    parentId: "technology-solutions-overview",
    aliases: [
      "healthcare and tpa technology services",
      "healthcare tpa technology",
      "tpa technology services",
      "healthcare technology services",
    ],
  },
  {
    id: "claims-processing-services",
    parentId: "technology-solutions-overview",
    aliases: [
      "claims processing services",
      "claims processing",
      "claims service",
      "claims support",
    ],
  },
  {
    id: "ai-agentic-services",
    parentId: "technology-solutions-overview",
    aliases: [
      "ai agentic services",
      "agentic ai",
      "ai agents",
      "ai agent service",
      "ai automation services",
    ],
  },
  {
    id: "ibm-i-as400-services",
    parentId: "technology-solutions-overview",
    abbreviations: ["as400", "as 400", "ibmi", "ibm i"],
    aliases: [
      "ibm i as400 services",
      "as400 services",
      "as400 support",
      "ibm i services",
      "ibm i support",
    ],
  },
  {
    id: "enterprise-software-development",
    parentId: "technology-solutions-overview",
    aliases: [
      "enterprise software development",
      "enterprise development",
      "enterprise software engineering",
    ],
  },
  {
    id: "software-support-consolidation",
    parentId: "technology-solutions-overview",
    aliases: [
      "software support consolidation",
      "consolidated software support",
      "support consolidation",
    ],
  },
  {
    id: "compliance-cyber-assurance-overview",
    aliases: [
      "compliance and cyber assurance",
      "compliance cyber assurance",
      "cyber assurance",
      "compliance services",
    ],
  },
];

const stemToken = (token) => {
  if (/^tick/.test(token)) return token;
  if (token.length > 6 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
};

export const normalizeMiraEntityText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bibm[\s/-]*i\b/g, "ibmi")
    .replace(/\bas[\s/-]*400\b/g, "as400")
    .replace(/\bcomapre\b|\bcompar\b/g, "compare")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(stemToken)
    .join(" ");

const tokensFor = (value) => normalizeMiraEntityText(value).split(" ").filter(Boolean);

const editDistance = (left, right) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
};

const tokenSimilarity = (left, right) => {
  if (left === right) return 1;
  if (left.length < 3 || right.length < 3) return 0;
  return 1 - editDistance(left, right) / Math.max(left.length, right.length);
};

const entityForConfig = (config) =>
  groundedConversationEntityForId(config.id, {
    level: config.parentId ? 1 : 0,
    includeChildren: false,
  });

export const miraOfferingRegistry = OFFERING_CONFIG.map((config) => {
  const entity = entityForConfig(config);
  if (!entity) return null;
  const aliases = [entity.label, ...(config.aliases || [])];
  const abbreviations = config.abbreviations || [];
  const aliasCandidates = [
    ...aliases.map((alias) => ({ alias, abbreviation: false })),
    ...abbreviations.map((alias) => ({ alias, abbreviation: true })),
  ].map((candidate) => {
    const normalized = normalizeMiraEntityText(candidate.alias);
    const tokens = normalized.split(" ").filter(Boolean);
    return {
      ...candidate,
      normalized,
      tokens,
      distinctiveTokens: tokens.filter((token) => !GENERIC_TOKENS.has(token)),
    };
  });
  return {
    id: entity.id,
    label: entity.label,
    type: entity.type,
    parentId: config.parentId || entity.parentId || null,
    sourceIds: entity.sourceIds,
    aliases,
    abbreviations,
    aliasCandidates,
    normalizedTokens: [
      ...new Set(
        [...aliases, ...abbreviations].flatMap((alias) => tokensFor(alias)),
      ),
    ],
    entity,
  };
}).filter(Boolean);

const scoreAlias = (
  normalizedOperand,
  operandTokens,
  { normalized: normalizedAlias, tokens: aliasTokens, distinctiveTokens, abbreviation },
) => {
  if (!normalizedOperand || !normalizedAlias) return 0;
  if (
    normalizedOperand === normalizedAlias ||
    normalizedOperand.includes(normalizedAlias)
  ) {
    return abbreviation ? 1 : 0.99;
  }
  const similarities = aliasTokens.map((aliasToken) =>
    Math.max(
      0,
      ...operandTokens.map((operandToken) =>
        tokenSimilarity(aliasToken, operandToken),
      ),
    ),
  );
  const matched = similarities.filter((similarity) => similarity >= 0.7);
  const coverage = matched.length / aliasTokens.length;
  const average =
    matched.reduce((total, similarity) => total + similarity, 0) /
    Math.max(1, aliasTokens.length);
  const distinctiveMatch = distinctiveTokens.some((aliasToken) =>
    operandTokens.some(
      (operandToken) => tokenSimilarity(aliasToken, operandToken) >= 0.78,
    ),
  );
  return Math.min(
    0.98,
    coverage * 0.62 + average * 0.3 + (distinctiveMatch ? 0.08 : 0),
  );
};

const candidateFor = (operand, normalizedOperand, operandTokens, registryEntry) => {
  const aliasScores = registryEntry.aliasCandidates.map((candidate) => ({
    alias: candidate.alias,
    aliasDistinctive: candidate.distinctiveTokens,
    score: scoreAlias(normalizedOperand, operandTokens, candidate),
    matchType: candidate.abbreviation ? "abbreviation" : "fuzzy_alias",
  }));
  const best = aliasScores.sort(
    (left, right) => right.score - left.score,
  )[0] || { alias: "", score: 0, matchType: "none" };
  const operandDistinctive = operandTokens.filter(
    (token) => !GENERIC_TOKENS.has(token),
  );
  const aliasDistinctive = best.aliasDistinctive || [];
  const distinctiveMatch = aliasDistinctive.some((aliasToken) =>
    operandDistinctive.some(
      (operandToken) => tokenSimilarity(aliasToken, operandToken) >= 0.7,
    ),
  );
  return {
    entityId: registryEntry.id,
    label: registryEntry.label,
    entity: registryEntry.entity,
    confidence: Number(best.score.toFixed(3)),
    matchType:
      best.score >= 0.99 && best.matchType !== "abbreviation"
        ? "exact_alias"
        : best.matchType,
    matchedText: operand.trim(),
    matchedAlias: best.alias,
    distinctiveMatch,
    genericOnlyOperand: operandDistinctive.length === 0,
  };
};

export const resolveMiraEntityText = (text = "") => {
  const normalizedText = normalizeMiraEntityText(text);
  const normalizedTokens = normalizedText.split(" ").filter(Boolean);
  const exactMatches = miraOfferingRegistry
    .flatMap((entry) =>
      entry.aliasCandidates
        .filter(
          (candidate) =>
            candidate.normalized &&
            (normalizedText === candidate.normalized ||
              normalizedText.includes(candidate.normalized)),
        )
        .map((candidate) => ({ entry, candidate })),
    )
    .sort(
      (left, right) =>
        right.candidate.normalized.length - left.candidate.normalized.length,
    );
  if (exactMatches.length) {
    const { entry, candidate } = exactMatches[0];
    const match = {
      entityId: entry.id,
      label: entry.label,
      entity: entry.entity,
      confidence: candidate.abbreviation ? 1 : 0.99,
      matchType: candidate.abbreviation ? "abbreviation" : "exact_alias",
      matchedText: String(text).trim(),
      matchedAlias: candidate.alias,
      distinctiveMatch: candidate.distinctiveTokens.length > 0,
      genericOnlyOperand: candidate.distinctiveTokens.length === 0,
    };
    return { status: "resolved", match, candidates: [match] };
  }
  const candidates = miraOfferingRegistry
    .map((entry) => candidateFor(text, normalizedText, normalizedTokens, entry))
    .sort((left, right) => right.confidence - left.confidence);
  const best = candidates[0];
  const second = candidates[1];
  const leadingMargin = (best?.confidence || 0) - (second?.confidence || 0);
  if (
    best?.confidence >= 0.82 ||
    (best?.confidence >= 0.68 && leadingMargin >= 0.12) ||
    (best?.confidence >= 0.52 &&
      best.distinctiveMatch &&
      leadingMargin >= 0.2)
  ) {
    return { status: "resolved", match: best, candidates: candidates.slice(0, 3) };
  }
  const plausible = candidates.filter(
    (candidate) =>
      candidate.confidence >= 0.28 &&
      (candidate.distinctiveMatch || candidate.genericOnlyOperand),
  );
  return {
    status: plausible.length ? "ambiguous" : "unresolved",
    match: null,
    candidates: plausible.slice(0, 3),
  };
};

const stripComparisonFraming = (message = "") =>
  String(message)
    .replace(/^\s*(?:comapre|compare)\s+/i, "")
    .replace(/^\s*(?:what(?:'s| is) )?the difference between\s+/i, "")
    .replace(/^\s*how (?:is|are)\s+/i, "")
    .replace(/\?+\s*$/, "")
    .trim();

export const splitMiraComparisonOperands = (message = "") => {
  const stripped = stripComparisonFraming(message);
  const strongConnector =
    /\s+(?:compared (?:to|with)|versus|vs\.?|against|with|or)\s+/i;
  const strongMatch = strongConnector.exec(stripped);
  if (strongMatch) {
    return [
      stripped.slice(0, strongMatch.index).trim(),
      stripped.slice(strongMatch.index + strongMatch[0].length).trim(),
    ].filter(Boolean);
  }
  const lastAnd = stripped.toLowerCase().lastIndexOf(" and ");
  return lastAnd > 0
    ? [
        stripped.slice(0, lastAnd).trim(),
        stripped.slice(lastAnd + 5).trim(),
      ].filter(Boolean)
    : [];
};

export const resolveMiraComparisonEntities = (message = "") => {
  const operands = splitMiraComparisonOperands(message);
  if (operands.length < 2) {
    return { status: "unresolved", operands: [], matches: [], issues: [] };
  }
  const resolutions = operands.map((operand) => ({
    operand,
    resolution: resolveMiraEntityText(operand),
  }));
  const matches = resolutions
    .filter(({ resolution }) => resolution.status === "resolved")
    .map(({ operand, resolution }) => ({
      ...resolution.match,
      matchedText: operand,
    }));
  const issues = resolutions
    .filter(({ resolution }) => resolution.status !== "resolved")
    .map(({ operand, resolution }) => ({
      operand,
      status: resolution.status,
      candidates: resolution.candidates,
    }));
  return {
    status: issues.length ? (matches.length ? "partial" : "ambiguous") : "resolved",
    operands,
    matches,
    issues,
  };
};

export default resolveMiraEntityText;
