import {
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
} from "./miraConversationReferences.js";

const BROAD_RECOMMENDATION =
  /\b(recommend|recomend|right for (?:me|us)|best for|which (?:platform|service)|what (?:platform|service) should|help (?:us |our company )?(?:improv|with)|we need|we want)\b/i;
const CURRENT_GOAL =
  /\b(?:we|i|our company|our team) (?:also )?(?:need|want|are trying|would like)\b/i;
const REQUIREMENT_STATEMENT =
  /\b(?:we are|i am|i work (?:for|at)|we (?:process|handle|manage|review|track|approve))\b/i;
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
    patterns: [/\bclaims? (?:processing|operations?|support)\b/i],
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
    .replace(/\brecomend(?:ation)?\b/g, "recommend")
    .replace(/\bnede\b/g, "need")
    .replace(/\bteelcom\b/g, "telecom")
    .replace(/\binovices\b/g, "invoices");

const unique = (values = []) => [...new Set(values.filter(Boolean))];

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

const extractRequirements = (message = "") => {
  const text = normalizedText(message);
  const workflows = topicIdsForText(text).filter(
    (topic) => topic !== "general-company-information",
  );
  const needs = unique([
    ...(/\bcase intake\b/i.test(text) ? ["case intake"] : []),
    ...(/\bassign(?:ment|ing)?\b/i.test(text) ? ["assignment tracking"] : []),
    ...(/\baudit (?:history|tracking|trail)\b/i.test(text)
      ? ["audit history"]
      : []),
    ...(/\bdiscrepanc(?:y|ies) (?:tracking|review)?\b|\btrack discrepancies\b/i.test(
      text,
    )
      ? ["discrepancy tracking"]
      : []),
    ...(/\b(?:review|process|processing)\b.*\bvendor (?:bills?|invoices?)\b|\bvendor (?:bill|invoice) (?:review|processing)\b/i.test(
      text,
    )
      ? ["vendor bill review"]
      : []),
    ...(/\bapprov(?:al|e|ing)(?: invoices?| tracking| workflow)?\b/i.test(text)
      ? ["approval workflow"]
      : []),
    ...(/\bmanage payments?\b|\bpayment workflow\b/i.test(text)
      ? ["payment workflow"]
      : []),
    ...(/\bcontract (?:and |\/ )?rate comparison\b|\bcompare (?:contracts|rates)\b/i.test(
      text,
    )
      ? ["contract and rate comparison"]
      : []),
    ...(/\btelecom (?:bills?|expenses?)\b/i.test(text)
      ? ["telecom bill analysis"]
      : []),
    ...(/\brepetitive (?:business |healthcare )?(?:workflows?|operations?|tasks?)\b/i.test(
      text,
    )
      ? ["repetitive workflows"]
      : []),
    ...(/\bmoderniz(?:e|ation|ing)\b/i.test(text) ? ["modernization"] : []),
    ...(/\bsupport\b/i.test(text) ? ["support"] : []),
  ]);
  const securityNeeds = unique([
    ...(/\brole[- ]based access\b/i.test(text) ? ["role-based access"] : []),
    ...(/\baudit (?:history|tracking|trail)\b/i.test(text)
      ? ["audit history"]
      : []),
    ...(/\bsecurity review\b/i.test(text) ? ["security review"] : []),
    ...(/\bcompliance review\b/i.test(text) ? ["compliance review"] : []),
  ]);
  const industry = /\bhealthcare\b|\btpa\b/i.test(text)
    ? "healthcare/TPA"
    : null;
  const desiredOutcome = /\b(?:reduce|lower|control|cut)\b.*\btelecom (?:costs?|expenses?)\b|\btelecom cost control\b/i.test(
    text,
  )
    ? "telecom cost control"
    : /\bautomat(?:e|ion)\b/i.test(text)
      ? "workflow automation"
      : null;
  const currentProblem = /\bbetter (?:system|workflow)\b/i.test(text)
    ? "workflow improvement"
    : needs.includes("discrepancy tracking")
      ? "billing discrepancies"
      : needs.includes("repetitive workflows")
        ? "repetitive workflows"
        : null;

  return {
    industry,
    workflows,
    needs,
    currentProblem,
    desiredOutcome,
    securityNeeds,
  };
};

const emptyRequirementState = () => ({
  industry: null,
  workflows: [],
  needs: [],
  currentProblem: null,
  desiredOutcome: null,
  securityNeeds: [],
  recommendationReady: false,
});

const shouldResetRequirements = (state, extracted, message, relation) => {
  if (/\bactually\b|\bcorrection\b|\binstead\b/i.test(message)) return true;
  if (relation !== "new_goal" || !extracted.workflows.length) return false;
  return (
    state.workflows.length > 0 &&
    !extracted.workflows.some((workflow) => state.workflows.includes(workflow))
  );
};

const mergeRequirementState = (state, extracted) => ({
  industry: extracted.industry || state.industry,
  workflows: unique([...state.workflows, ...extracted.workflows]),
  needs: unique([...state.needs, ...extracted.needs]),
  currentProblem: extracted.currentProblem || state.currentProblem,
  desiredOutcome: extracted.desiredOutcome || state.desiredOutcome,
  securityNeeds: unique([...state.securityNeeds, ...extracted.securityNeeds]),
  recommendationReady: false,
});

const readinessFor = (state) => {
  const has = (value) => state.needs.includes(value);
  const readyWorkflows = state.workflows.filter((workflow) => {
    if (state.workflows.length > 1) return true;
    if (workflow === "secure-case-management") {
      return (
        has("case intake") ||
        has("assignment tracking") ||
        has("audit history") ||
        state.securityNeeds.includes("role-based access")
      );
    }
    if (workflow === "vendor-bill-audit-payment") {
      return (
        has("discrepancy tracking") ||
        has("vendor bill review") ||
        has("approval workflow") ||
        has("payment workflow")
      );
    }
    if (workflow === "telecom-expense-management") {
      return (
        has("contract and rate comparison") ||
        has("telecom bill analysis") ||
        state.desiredOutcome === "telecom cost control"
      );
    }
    if (workflow === "ai-workflow-automation") {
      return (
        has("repetitive workflows") ||
        state.desiredOutcome === "workflow automation"
      );
    }
    if (workflow === "ibm-i-as400-support") {
      return has("modernization") || has("support");
    }
    return true;
  });
  const recommendationReady =
    readyWorkflows.length > 0 &&
    readyWorkflows.length === state.workflows.length;
  const missingRequirements = recommendationReady
    ? []
    : !state.workflows.length
      ? ["workflow"]
      : ["workflow details"];
  return { recommendationReady, missingRequirements };
};

export const buildMiraRequirementState = (
  message = "",
  conversationHistory = [],
) => {
  let state = emptyRequirementState();
  const priorTurns = [];
  const userMessages = [
    ...conversationHistory
      .slice(-6)
      .filter((turn) => turn?.role === "user")
      .map((turn) => turn.content),
    message,
  ];

  for (const userMessage of userMessages) {
    const extracted = extractRequirements(userMessage);
    const { relationToPreviousTurn } = classifyMiraTopicShift(
      userMessage,
      priorTurns,
    );
    if (
      shouldResetRequirements(
        state,
        extracted,
        userMessage,
        relationToPreviousTurn,
      )
    ) {
      state = emptyRequirementState();
    }
    state = mergeRequirementState(state, extracted);
    priorTurns.push({ role: "user", content: userMessage });
  }

  const readiness = readinessFor(state);
  return {
    ...state,
    recommendationReady: readiness.recommendationReady,
    missingRequirements: readiness.missingRequirements,
  };
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
  const requirementState = buildMiraRequirementState(
    message,
    conversationHistory,
  );
  const explicitIntent = BROAD_RECOMMENDATION.test(current);
  const continuesGoalCollection = conversationHistory
    .slice(-2)
    .some(
      (turn) =>
        turn?.role === "assistant" &&
        /\bwhat (?:process|workflow|type of workflow)\b/i.test(turn.content),
    );
  const statesCurrentGoal =
    CURRENT_GOAL.test(current) || REQUIREMENT_STATEMENT.test(current);
  const continuesRecognizedGoal = ["continuation", "refinement"].includes(
    topicShift.relationToPreviousTurn,
  );
  const effectiveTopicIds = requirementState.workflows;
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
      requirementState,
      missingRequirements: requirementState.missingRequirements,
      recommendationReady: false,
    };
  }

  if (
    !matchedNeeds.length ||
    healthcareOnly ||
    !requirementState.recommendationReady
  ) {
    const workflow = requirementState.workflows[0];
    const clarification = healthcareOnly
      ? "What process are you trying to improve?"
      : !workflow
        ? "What workflow are you trying to improve: case management, bill processing, telecom expenses, claims operations, or something else?"
        : workflow === "secure-case-management"
          ? "Which case-management capabilities matter most: intake, assignment, role-based access, audit history, or something else?"
          : workflow === "vendor-bill-audit-payment"
            ? "Which bill-processing capabilities matter most: discrepancy tracking, approvals, payment workflow, or something else?"
            : workflow === "telecom-expense-management"
              ? "Is your telecom goal contract and rate comparison, cost reduction, or something else?"
              : workflow === "ai-workflow-automation"
                ? "What repetitive workflow are you trying to automate?"
                : "What outcome are you trying to achieve with this workflow?";
    return {
      recommendation: {
        status: "needs_clarification",
        primaryOption: null,
        reasons: [],
        alternatives: [],
        missingInformation: requirementState.missingRequirements,
      },
      entities: [],
      matchedEntries: [],
      answer: clarification,
      topicShift,
      requirementState,
      missingRequirements: requirementState.missingRequirements,
      recommendationReady: false,
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
    requirementState,
    missingRequirements: [],
    recommendationReady: true,
  };
};

export default resolveMiraRecommendation;
