import {
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
} from "./miraConversationReferences.js";

const BROAD_RECOMMENDATION =
  /\b(recommend|recomend|right for (?:me|us)|best for|which (?:platform|service)|what (?:platform|service) should|help (?:us |our company )?(?:improv|with)|we need|we want)\b/i;
const CURRENT_GOAL =
  /\b(?:we|i|our company|our team) (?:also )?(?:need|want|are trying|would like)\b/i;
const CONTINUATION = /\b(?:also|additionally|too|as well|along with)\b/i;
const REFINEMENT = /\b(?:specifically|in particular|more precisely|for that|within that)\b/i;
const COMPARISON = /\b(?:compare|versus|vs\.?|difference between|which is better)\b/i;

const NEEDS = [
  {
    id: "secure-case-management",
    optionId: "secure-ticketing-case-management",
    patterns: [
      /\bcase (?:intake|management|tracking|assignment)\b/i,
      /\baudit (?:history|trail)\b/i,
      /\brole[- ]based access\b/i,
    ],
    reason: "The need involves secure case intake, assignment, tracking, or audit history.",
  },
  {
    id: "vendor-bill-audit-payment",
    optionId: "bill-audit-bill-pay",
    patterns: [
      /\bvendor bills?\b/i,
      /\bbill (?:audit|processing|approval|payment)\b/i,
      /\bpayment workflow\b/i,
      /\bapproval tracking\b/i,
    ],
    reason: "The need involves vendor-bill review, approvals, or payment workflow.",
  },
  {
    id: "telecom-expense-management",
    optionId: "bill-audit-bill-pay",
    patterns: [/\btelecom\b/i, /\bcontract (?:and |\/ )?rate comparison\b/i],
    reason: "The need involves telecom expense management, including bill analysis, rate comparison, or cost control.",
  },
  {
    id: "claims-processing",
    optionId: "claims-processing-services",
    patterns: [/\bclaims? (?:processing|operations?)\b/i],
    reason: "The need involves claims-processing operations.",
  },
  {
    id: "ai-workflow-automation",
    optionId: "ai-agentic-services",
    patterns: [/\bai (?:workflow|automation|agentic|agents?)\b/i, /\bautomate (?:a |our )?(?:business )?(?:process|workflow)/i],
    reason: "The need involves AI-assisted business-process automation.",
  },
  {
    id: "ibm-i-as400-support",
    optionId: "ibm-i-as400-services",
    patterns: [/\b(?:ibm\s*i|as\s*\/?\s*400)\b/i],
    reason: "The need involves IBM i / AS400 support or modernization.",
  },
  {
    id: "enterprise-software-development",
    optionId: "enterprise-software-development",
    patterns: [/\benterprise software (?:development|engineering)\b/i, /\bcustom enterprise software\b/i],
    reason: "The need involves enterprise software development.",
  },
  {
    id: "software-support-consolidation",
    optionId: "software-support-consolidation",
    patterns: [/\b(?:software )?support consolidation\b/i, /\bconsolidat(?:e|ing) (?:our )?software support\b/i],
    reason: "The need involves consolidating software support.",
  },
  {
    id: "compliance-security-review",
    optionId: "compliance-cyber-assurance-overview",
    patterns: [/\bcompliance (?:or |and )?security review\b/i, /\bsecurity (?:or |and )?compliance review\b/i],
    reason: "The need involves compliance readiness or security review.",
  },
];

const normalizedText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/\bplatfrom\b/g, "platform")
    .replace(/\bwihch\b/g, "which")
    .replace(/\brecomend(?:ation)?\b/g, "recommend");

const topicIdsForText = (text = "") => {
  const normalized = normalizedText(text);
  return [
    ...NEEDS.filter((need) =>
      need.patterns.some((pattern) => pattern.test(normalized)),
    ).map((need) => need.id),
    ...(/\bwhat does onesmarter do\b|\babout onesmarter\b|\bcompany (?:overview|information)\b/i.test(
      normalized,
    )
      ? ["general-company-information"]
      : []),
  ];
};

const latestRelevantUserTurn = (history = []) =>
  [...history]
    .reverse()
    .find(
      (turn) =>
        turn?.role === "user" &&
        (topicIdsForText(turn.content).length ||
          BROAD_RECOMMENDATION.test(normalizedText(turn.content))),
    );

export const classifyMiraTopicShift = (message = "", conversationHistory = []) => {
  const current = normalizedText(message);
  const currentTopics = topicIdsForText(current);
  const previousTurn = latestRelevantUserTurn(conversationHistory);
  const previousTopics = topicIdsForText(previousTurn?.content || "");
  const sharedTopics = currentTopics.filter((topic) =>
    previousTopics.includes(topic),
  );

  let relationToPreviousTurn = "unclear";
  if (COMPARISON.test(current)) {
    relationToPreviousTurn = "comparison";
  } else if (currentTopics.length && previousTopics.length) {
    relationToPreviousTurn = sharedTopics.length
      ? REFINEMENT.test(current)
        ? "refinement"
        : "continuation"
      : "new_goal";
  } else if (
    previousTopics.length &&
    !currentTopics.length &&
    (CONTINUATION.test(current) || REFINEMENT.test(current))
  ) {
    relationToPreviousTurn = REFINEMENT.test(current)
      ? "refinement"
      : "continuation";
  } else if (currentTopics.length || CURRENT_GOAL.test(current)) {
    relationToPreviousTurn = "new_goal";
  }

  return {
    relationToPreviousTurn,
    currentTopics,
    previousTopics,
    retainedTopics: ["continuation", "refinement", "comparison"].includes(
      relationToPreviousTurn,
    )
      ? previousTopics
      : [],
  };
};

const optionFor = (optionId, position) => {
  const isNested = [
    "ai-agentic-services",
    "ibm-i-as400-services",
    "enterprise-software-development",
    "software-support-consolidation",
  ].includes(optionId);
  return groundedConversationEntityForId(optionId, {
    level: isNested ? 1 : 0,
    position,
  });
};

export const resolveMiraRecommendation = (message = "", conversationHistory = []) => {
  const current = normalizedText(message);
  const topicShift = classifyMiraTopicShift(message, conversationHistory);
  const explicitIntent = BROAD_RECOMMENDATION.test(current);
  const continuesGoalCollection = conversationHistory
    .slice(-2)
    .some(
      (turn) =>
        turn?.role === "assistant" &&
        /\bwhat (?:process|workflow|type of workflow)\b/i.test(turn.content),
    );
  const statesCurrentGoal = CURRENT_GOAL.test(current);
  const continuesRecognizedGoal = ["continuation", "refinement"].includes(
    topicShift.relationToPreviousTurn,
  );
  const effectiveTopicIds = [
    ...new Set([...topicShift.currentTopics, ...topicShift.retainedTopics]),
  ];
  const matchedNeeds = NEEDS.filter((need) =>
    effectiveTopicIds.includes(need.id),
  );
  const healthcareOnly =
    /\bhealthcare\b|\btpa\b/i.test(current) &&
    matchedNeeds.length === 0;
  const noMatch = /\bpayroll(?: software| system| platform)?\b/i.test(current);

  if (
    !explicitIntent &&
    !continuesGoalCollection &&
    !continuesRecognizedGoal &&
    !statesCurrentGoal &&
    !noMatch
  ) {
    return null;
  }

  if (noMatch) {
    return {
      recommendation: {
        status: "no_match",
        primaryOption: null,
        reasons: [],
        alternatives: [],
        missingInformation: ["A supported OneSmarter workflow or service need"],
      },
      entities: [],
      matchedEntries: [],
      answer:
        "The approved OneSmarter content does not establish a payroll product. Would you like help with another workflow?",
      topicShift,
    };
  }

  if (!matchedNeeds.length || healthcareOnly) {
    return {
      recommendation: {
        status: "needs_clarification",
        primaryOption: null,
        reasons: [],
        alternatives: [],
        missingInformation: [healthcareOnly ? "The healthcare process to improve" : "The workflow to improve"],
      },
      entities: [],
      matchedEntries: [],
      answer: healthcareOnly
        ? "What process are you trying to improve?"
        : "What type of workflow are you trying to improve: case management, bill processing, telecom expenses, claims operations, or something else?",
      topicShift,
    };
  }

  const uniqueNeeds = matchedNeeds.filter(
    (need, index, all) =>
      all.findIndex((candidate) => candidate.optionId === need.optionId) === index,
  );
  const entities = uniqueNeeds
    .map((need, index) => optionFor(need.optionId, index + 1))
    .filter(Boolean);
  const matchedEntries = matchedEntriesForConversationEntities(entities);
  const options = entities.map(({ id, label, type }) => ({ id, label, type }));
  const reasons = uniqueNeeds.map((need) => need.reason);
  const answer = [
    uniqueNeeds.length > 1
      ? "Your needs map to more than one grounded OneSmarter offering:"
      : `Recommended: ${options[0].label}.`,
    ...options.map((option, index) =>
      uniqueNeeds.length > 1
        ? `- ${option.label}: ${reasons[index]}`
        : reasons[index],
    ),
    ...matchedEntries.map((entry) => `${entry.title}: ${entry.approvedSummary}`),
  ].join("\n");

  return {
    recommendation: {
      status: "recommended",
      primaryOption: options[0],
      reasons,
      alternatives: options.slice(1),
      missingInformation: [],
    },
    entities,
    matchedEntries,
    answer,
    topicShift,
  };
};

export default resolveMiraRecommendation;
