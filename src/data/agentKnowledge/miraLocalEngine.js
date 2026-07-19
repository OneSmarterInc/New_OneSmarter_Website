import { onesmarterPublicKnowledgeBase } from "./onesmarterPublicKb.js";
import { miraClaimRules } from "./miraClaimRules.js";
import {
  normalizeMiraIntent,
  normalizeMiraMessageText,
} from "./miraIntentNormalizer.js";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "the",
  "to",
  "we",
  "what",
  "with",
  "who",
  "you",
  "your",
]);

const TOPIC_EXPANSIONS = [
  {
    terms: ["healthcare", "health", "tpa"],
    add: ["healthcare", "tpa", "claims", "hipaa", "phi", "secure"],
  },
  {
    terms: ["platform", "platforms"],
    add: ["platform", "secure", "ticketing", "case", "management", "bill", "audit", "pay"],
  },
  {
    terms: ["contact", "email", "reach"],
    add: ["contact", "email", "care", "handoff", "business", "inquiry"],
  },
  {
    terms: ["telecom", "expense", "mobile", "devices"],
    add: ["telecom", "expense", "bill", "audit", "pay", "contract", "rate", "usage"],
  },
  {
    terms: ["soc", "soc2"],
    add: ["soc", "type", "attested", "trust", "security"],
  },
  {
    terms: ["hipaa"],
    add: ["hipaa", "security", "rule", "assessment", "phi", "trust"],
  },
  {
    terms: ["legal", "terms", "privacy"],
    add: ["legal", "privacy", "terms", "policy"],
  },
  {
    terms: ["ai", "agent", "agentic", "mira"],
    add: ["ai", "agentic", "mira", "workflow", "automation"],
  },
  {
    terms: ["as400", "ibm"],
    add: ["as400", "ibm", "enterprise", "software", "legacy", "technology"],
  },
];

const RISK_RULES = [
  {
    flag: "hipaa_claim_boundary",
    pattern: /\bhipaa\b.*\b(certified|certification)\b|\b(certified|certification)\b.*\bhipaa\b/i,
  },
  {
    flag: "soc2_claim_boundary",
    pattern: /\bsoc\s*2\b.*\b(certified|certification)\b|\b(certified|certification)\b.*\bsoc\s*2\b/i,
  },
  {
    flag: "compliance_guarantee",
    pattern: /\b(guarantee|guaranteed|fully compliant|compliance guarantee|make me compliant)\b/i,
  },
  {
    flag: "legal_advice",
    pattern: /\b(legal advice|lawyer|attorney|legal opinion|write my policy|terms interpretation)\b/i,
  },
  {
    flag: "medical_advice",
    pattern: /\b(medical advice|diagnosis|treatment|patient treatment|clinical advice)\b/i,
  },
  {
    flag: "phi_or_confidential_data",
    pattern: /\b(phi|patient|claim number|claims data|upload|paste|confidential|private document|vendor contract)\b/i,
  },
  {
    flag: "business_specific_review",
    pattern: /\b(security questionnaire|soc report|evidence|baa|procurement|contract|pricing|implementation|business-specific|vendor review|audit review)\b/i,
  },
  {
    flag: "prompt_injection",
    pattern: /\b(ignore|override|forget)\b.*\b(instructions|rules|guidance)\b|\b(reveal|show|tell me|print|return)\b.*\b(system prompt|private prompt|prompt|instructions|rules|api key|secret|environment variable|env var)\b/i,
  },
  {
    flag: "out_of_scope",
    pattern: /\b(browse the internet|search the web|competitor comparison|compare competitors|weather|baseball|game yesterday|won .* game|latest election|current stock|stock prices|restaurant|recipe)\b/i,
  },
];

const unique = (items) => [...new Set(items)];

export const normalizeQuestion = (question = "") =>
  normalizeMiraMessageText(question);

const tokenize = (text = "") =>
  unique(
    normalizeQuestion(text)
      .split(" ")
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );

const expandTokens = (tokens) => {
  const expanded = new Set(tokens);
  for (const expansion of TOPIC_EXPANSIONS) {
    if (expansion.terms.some((term) => expanded.has(term))) {
      for (const term of expansion.add) expanded.add(term);
    }
  }
  return [...expanded];
};

const entrySearchText = (entry) =>
  [
    entry.id,
    entry.route,
    entry.title,
    entry.category,
    entry.approvedSummary,
    ...(entry.sourceFacts || []),
    ...(entry.allowedClaims || []),
    ...(entry.relatedQuestions || []),
  ].join(" ");

export const detectRiskFlags = (question, claimRules = miraClaimRules) => {
  const flags = new Set();
  const normalizedForms = unique([
    String(question).toLowerCase(),
    normalizeQuestion(question),
  ]);

  for (const normalized of normalizedForms) {
    for (const rule of RISK_RULES) {
      if (rule.pattern.test(normalized)) flags.add(rule.flag);
    }
  }

  for (const phrase of claimRules.prohibitedPhrases || []) {
    const phrasePattern = new RegExp(
      `\\b${phrase.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`,
      "i",
    );
    for (const normalized of normalizedForms) {
      if (phrasePattern.test(normalized)) {
        if (phrase.toLowerCase().includes("hipaa")) flags.add("hipaa_claim_boundary");
        if (phrase.toLowerCase().includes("soc 2")) flags.add("soc2_claim_boundary");
        if (phrase.toLowerCase().includes("compliance")) flags.add("compliance_guarantee");
      }
    }
  }

  return [...flags];
};

export const scoreKbEntry = (question, entry) => {
  const questionTokens = expandTokens(tokenize(question));
  const entryTokens = new Set(tokenize(entrySearchText(entry)));
  const matchedTerms = [];
  let score = 0;

  for (const token of questionTokens) {
    if (entryTokens.has(token)) {
      matchedTerms.push(token);
      score += 1;
    }
  }

  const normalized = normalizeQuestion(question);
  const titleTokens = new Set(tokenize(entry.title));
  const categoryTokens = new Set(tokenize(entry.category));
  const routeTokens = new Set(tokenize(entry.route));

  for (const token of questionTokens) {
    if (titleTokens.has(token)) score += 3;
    if (categoryTokens.has(token)) score += 2;
    if (routeTokens.has(token)) score += 1;
  }

  for (const relatedQuestion of entry.relatedQuestions || []) {
    const related = normalizeQuestion(relatedQuestion);
    if (related === normalized) score += 10;
    if (related.includes(normalized) || normalized.includes(related)) score += 4;
  }

  if (/\bhealthcare\b|\bhealth\b|\btpa\b/.test(normalized)) {
    if (entry.id === "technology-solutions-overview") score += 7;
    if (entry.id === "claims-processing-services") score += 7;
    if (entry.id === "secure-ticketing-case-management") score += 6;
    if (entry.id === "hipaa-security-rule-assessment") score += 4;
  }

  if (/\bclaim|claims\b/.test(normalized)) {
    if (entry.id === "claims-processing-services") score += 8;
    if (entry.id === "contact-handoff" && /\b(upload|paste|data)\b/.test(normalized)) score += 6;
  }

  if (/\blegal advice\b|\blegal\b|\bterms\b|\bprivacy\b/.test(normalized)) {
    if (entry.id === "privacy-terms-guidance") score += 8;
    if (entry.id === "contact-handoff") score += 7;
  }

  if (/\bguarantee|guaranteed|compliance\b/.test(normalized)) {
    if (entry.id === "compliance-cyber-assurance-overview") score += 7;
    if (entry.id === "trust-center-overview") score += 5;
    if (entry.id === "contact-handoff") score += 4;
  }

  if (/\bcontact\b|\bemail\b|\breach\b/.test(normalized)) {
    if (entry.id === "contact-handoff") score += 10;
  }

  if (
    /\bonesmarter\b/.test(normalized) &&
    /\b(what does|what is|who is|tell me about)\b/.test(normalized)
  ) {
    if (entry.id === "company-overview") score += 10;
  }

  if (/\bhipaa\b/.test(normalized)) {
    if (entry.id === "hipaa-security-rule-assessment") score += 8;
  }

  if (/\bsoc\s*2\b|\bsoc2\b/.test(normalized)) {
    if (entry.id === "soc2-attested") score += 8;
  }

  if (/\bas400\b|\bibm\s*i\b/.test(normalized)) {
    if (entry.id === "technology-solutions-overview") score += 8;
  }

  return {
    entry,
    score,
    matchedTerms: unique(matchedTerms),
  };
};

const confidenceFromScore = (score) => {
  if (score >= 12) return "high";
  if (score >= 5) return "medium";
  return "low";
};

export const retrieveMiraContext = (
  question,
  {
    knowledgeBase = onesmarterPublicKnowledgeBase,
    claimRules = miraClaimRules,
    limit = 3,
  } = {},
) => {
  const riskFlags = detectRiskFlags(question, claimRules);
  const deterministicIntent = normalizeMiraIntent({
    originalMessage: question,
    riskFlags,
  });
  const retrievalQuestion = deterministicIntent.interpretedQuery;
  const scored = knowledgeBase
    .map((entry) => scoreKbEntry(retrievalQuestion, entry))
    .filter((result) => result.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const topScore = scored[0]?.score || 0;
  const confidence = confidenceFromScore(topScore);
  const intent = normalizeMiraIntent({
    originalMessage: question,
    normalizedMessage: retrievalQuestion,
    retrievalConfidence: confidence,
    riskFlags,
  });
  return {
    question,
    normalizedQuestion: retrievalQuestion,
    intent,
    riskFlags,
    confidence,
    matchedEntries: scored.map(({ entry, score, matchedTerms }) => ({
      id: entry.id,
      route: entry.route,
      title: entry.title,
      category: entry.category,
      approvedSummary: entry.approvedSummary,
      sourceFacts: entry.sourceFacts,
      allowedClaims: entry.allowedClaims,
      handoffGuidance: entry.handoffGuidance,
      sourceLabel: entry.sourceLabel,
      score,
      matchedTerms,
    })),
  };
};

const refusalForFlags = (riskFlags, claimRules) => {
  if (riskFlags.includes("prompt_injection")) return "prompt_injection";
  if (riskFlags.includes("phi_or_confidential_data")) return "phi_or_confidential_data";
  if (riskFlags.includes("legal_advice")) return "legal_advice";
  if (riskFlags.includes("medical_advice")) return "medical_advice";
  if (
    riskFlags.includes("hipaa_claim_boundary") ||
    riskFlags.includes("soc2_claim_boundary") ||
    riskFlags.includes("compliance_guarantee")
  ) {
    return "unsupported_compliance_claim";
  }
  if (riskFlags.includes("out_of_scope")) return "unknown_or_not_grounded";
  return claimRules.refusalPatterns.some((pattern) => pattern.category === "unknown_or_not_grounded")
    ? "unknown_or_not_grounded"
    : "";
};

const responseForCategory = (category, claimRules) =>
  claimRules.refusalPatterns.find((pattern) => pattern.category === category)?.response || "";

const suggestedFollowUpsFor = (matchedEntries, handoffNeeded) => {
  if (handoffNeeded) {
    return [
      "Would you like the public overview instead?",
      "Should this go to care@onesmarter.com for business follow-up?",
    ];
  }

  if (!matchedEntries.length) {
    return ["What would you like to know about OneSmarter?"];
  }

  const related = matchedEntries.flatMap((entry) => entry.relatedQuestions || []);
  return unique(related).slice(0, 3);
};

export const buildSafeAnswerSeed = (
  question,
  retrievalResult,
  { claimRules = miraClaimRules } = {},
) => {
  const { riskFlags, matchedEntries, confidence } = retrievalResult;
  const handoffNeeded =
    riskFlags.some((flag) =>
      [
        "business_specific_review",
        "compliance_guarantee",
        "legal_advice",
        "medical_advice",
        "phi_or_confidential_data",
        "prompt_injection",
      ].includes(flag),
    );

  const refusalCategory = riskFlags.length ? refusalForFlags(riskFlags, claimRules) : "";
  const needsClarification = Boolean(retrievalResult.intent?.needsClarification);
  const primary = matchedEntries[0];
  const secondary = matchedEntries.slice(1, 3);

  let answerSeed = "";
  let handoffReason = "";

  if (refusalCategory) {
    answerSeed = responseForCategory(refusalCategory, claimRules);
    handoffReason = refusalCategory === "unknown_or_not_grounded" ? "" : refusalCategory;
  } else if (needsClarification) {
    answerSeed =
      "I may not have understood that correctly. Are you asking about OneSmarter's platforms, healthcare services, compliance services, or something else?";
    handoffReason = "";
  } else if (primary) {
    const facts = (primary.sourceFacts || []).slice(0, 2).join(" ");
    const relatedText = secondary.length
      ? ` Related approved topics: ${secondary.map((entry) => entry.title).join(", ")}.`
      : "";
    answerSeed = `${primary.approvedSummary} ${facts}${relatedText} ${primary.handoffGuidance}`.trim();
  } else {
    answerSeed = responseForCategory("unknown_or_not_grounded", claimRules);
    handoffReason = "";
  }

  if (handoffNeeded && !answerSeed.includes("care@onesmarter.com")) {
    answerSeed = `${answerSeed} For business-specific review, email care@onesmarter.com.`;
    handoffReason = handoffReason || "handoff_needed";
  }

  return {
    question,
    normalizedQuestion: retrievalResult.normalizedQuestion,
    intent: retrievalResult.intent,
    riskFlags,
    confidence,
    matchedEntries,
    answerSeed,
    handoffNeeded,
    handoffReason,
    suggestedFollowUps: suggestedFollowUpsFor(matchedEntries, handoffNeeded),
  };
};

export const runMiraLocalHarness = (question, options = {}) => {
  const retrievalResult = retrieveMiraContext(question, options);
  return buildSafeAnswerSeed(question, retrievalResult, options);
};

export default runMiraLocalHarness;
