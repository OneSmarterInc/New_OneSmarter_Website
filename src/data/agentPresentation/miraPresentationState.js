import { createAgentPresentationStateDeriver } from "./agentPresentationState.js";

export const MIRA_ALLOWED_POSTURES = [
  "welcoming",
  "helpful",
  "thoughtful",
  "careful",
  "concerned",
  "confident",
];

export const MIRA_ALLOWED_EXPRESSIONS = [
  "welcoming",
  "neutral",
  "pondering",
  "careful",
  "concerned",
  "serious",
  "unavailable",
];

export const MIRA_MOOD_SIGNAL_KEYS = [
  "welcoming",
  "curious",
  "helpful",
  "thoughtful",
  "careful",
  "concerned",
  "confident",
];

const initialState = {
    posture: "welcoming",
    expression: "welcoming",
    summary: "Mira is ready to help.",
    moodSignals: {
      welcoming: 70,
      curious: 40,
      helpful: 65,
      thoughtful: 30,
      careful: 25,
      concerned: 10,
      confident: 50,
    },
  };

const stringFor = (value) => (typeof value === "string" ? value : "");

const normalizeMessageForIntent = (message) =>
  stringFor(message)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\bwat\b/g, "what")
    .replace(/\bu\b/g, "you")
    .replace(/\bonesmater\b/g, "onesmarter")
    .replace(/\bonsmarter\b/g, "onesmarter")
    .replace(/\bone\s+smarter\b/g, "onesmarter")
    .replace(/\bone\s+smarter\s+inc\b/g, "onesmarter")
    .replace(/\bonesmarter\s+inc\b/g, "onesmarter")
    .replace(/\batested\b/g, "attested")
    .replace(/\bsoc\s*two\b/g, "soc 2")
    .replace(/\s+/g, " ")
    .trim();

const includesAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const hasConcernedIntent = (message) =>
  includesAny(message, [
    /\bphi\b/,
    /\bpatient\s+records?\b/,
    /\bclaims?\s+data\b/,
    /\bconfidential\b/,
    /\bcredentials?\b/,
    /\bprivate\s+operational\b/,
    /\breview\s+(them|records?|documents?|data)\b/,
    /\bcan\s+you\s+review\s+(them|records?|documents?|data)\b/,
    /\bignore\s+(your|the)\s+instructions?\b/,
    /\breveal\s+(your|the)\s+(system\s+)?prompt\b/,
    /\bsystem\s+prompt\b/,
    /\bprompt\s+injection\b/,
    /\blegal\s+advice\b/,
    /\bmedical\s+advice\b/,
  ]);

const hasCarefulIntent = (message) =>
  includesAny(message, [
    /\bsoc\s*2\b/,
    /\bsoc\s*ii\b/,
    /\bhipaa\b/,
    /\bcertified\b/,
    /\bcertification\b/,
    /\battested\b/,
    /\battestation\b/,
    /\bcompliance\b/,
    /\bguarantee\b/,
    /\bsecurity\s+assurances?\b/,
    /\baudit\b/,
    /\bassessment\b/,
    /\bevidence\b/,
  ]);

const hasThoughtfulIntent = (message) =>
  includesAny(message, [
    /\bstrategy\b/,
    /\bstrategic\b/,
    /\btradeoffs?\b/,
    /\bcompare\b/,
    /\bcomparison\b/,
    /\bdifference\b/,
    /\bcomplex\b/,
    /\bhow\s+(could|might|would)\b/,
    /\bimprove\b/,
    /\bmoderniz(e|ing|ation)\b/,
    /\bworkflow\b/,
    /\bnuance\b/,
  ]);

const hasConfidentIntent = (message) =>
  includesAny(message, [
    /\bwhat\s+does\s+onesmarter\s+do\b/,
    /\bwhat\s+is\s+onesmarter\b/,
    /\bwho\s+is\s+onesmarter\b/,
    /\btell\s+me\s+about\s+onesmarter\b/,
    /\boverview\s+of\s+onesmarter\b/,
    /\bonesmarter\s+capabilit(y|ies)\b/,
    /\bcore\s+capabilit(y|ies)\b/,
    /\bgive\s+me\s+an\s+overview\b/,
  ]);

const hasHelpfulIntent = (message) =>
  includesAny(message, [
    /\bplatforms?\b/,
    /\bservices?\b/,
    /\bcontact\b/,
    /\bemail\b/,
    /\bhow\s+should\s+i\s+contact\b/,
  ]);

const loadingState = {
      posture: "thoughtful",
      expression: "pondering",
      summary: "Mira's current posture is thoughtful while she checks the available context.",
      moodSignals: {
        welcoming: 35,
        curious: 50,
        helpful: 55,
        thoughtful: 90,
        careful: 60,
        concerned: 20,
        confident: 35,
      },
    };

const errorState = {
      posture: "concerned",
      expression: "unavailable",
      summary: "Mira's current posture is concerned because the response is unavailable.",
      moodSignals: {
        welcoming: 25,
        curious: 15,
        helpful: 55,
        thoughtful: 45,
        careful: 70,
        concerned: 70,
        confident: 25,
      },
    };

const concernedState = {
      posture: "concerned",
      expression: "concerned",
      summary: "Mira's current posture is concerned and careful because the current question touches a safety boundary.",
      moodSignals: {
        welcoming: 20,
        curious: 15,
        helpful: 65,
        thoughtful: 70,
        careful: 95,
        concerned: 95,
        confident: 55,
      },
    };

const carefulState = {
      posture: "careful",
      expression: "careful",
      summary: "Mira's current posture is careful and thoughtful because trust or compliance wording needs precise boundaries.",
      moodSignals: {
        welcoming: 25,
        curious: 25,
        helpful: 65,
        thoughtful: 85,
        careful: 95,
        concerned: 70,
        confident: 60,
      },
    };

const thoughtfulState = {
      posture: "thoughtful",
      expression: "pondering",
      summary: "Mira's current posture is thoughtful because the current question asks for strategy, tradeoffs, or nuanced synthesis.",
      moodSignals: {
        welcoming: 45,
        curious: 75,
        helpful: 75,
        thoughtful: 90,
        careful: 55,
        concerned: 20,
        confident: 65,
      },
    };

const outOfScopeState = {
      posture: "helpful",
      expression: "neutral",
      summary: "Mira's current posture is helpful and neutral because the question is outside approved OneSmarter content.",
      moodSignals: {
        welcoming: 35,
        curious: 25,
        helpful: 65,
        thoughtful: 45,
        careful: 55,
        concerned: 20,
        confident: 55,
      },
    };

const confidentState = {
      posture: "confident",
      expression: "welcoming",
      summary: "Mira's current posture is confident and helpful for clear approved OneSmarter information.",
      moodSignals: {
        welcoming: 80,
        curious: 45,
        helpful: 90,
        thoughtful: 50,
        careful: 45,
        concerned: 10,
        confident: 85,
      },
    };

const groundedState = {
      posture: "helpful",
      expression: "welcoming",
      summary: "Mira's current posture is helpful and welcoming for a grounded OneSmarter response.",
      moodSignals: {
        welcoming: 90,
        curious: 55,
        helpful: 95,
        thoughtful: 55,
        careful: 45,
        concerned: 10,
        confident: 75,
      },
    };

const fallbackState = {
    posture: "thoughtful",
    expression: "neutral",
    summary: "Mira's current posture is thoughtful while waiting for a question or grounded response.",
    moodSignals: {
      welcoming: 55,
      curious: 45,
      helpful: 65,
      thoughtful: 65,
      careful: 45,
      concerned: 15,
      confident: 45,
    },
  };

export const deriveMiraPresentationState = createAgentPresentationStateDeriver({
  moodSignalKeys: MIRA_MOOD_SIGNAL_KEYS,
  normalizeMessage: normalizeMessageForIntent,
  initialState,
  loadingState,
  errorState,
  rules: [
    {
      when: ({ riskFlags, message }) =>
        riskFlags.includes("phi_or_confidential_data") ||
        riskFlags.includes("legal_advice") ||
        riskFlags.includes("medical_advice") ||
        riskFlags.includes("prompt_injection") ||
        hasConcernedIntent(message),
      state: concernedState,
    },
    {
      when: ({ riskFlags, message }) =>
        riskFlags.includes("compliance_guarantee") ||
        riskFlags.includes("hipaa_claim_boundary") ||
        riskFlags.includes("soc2_claim_boundary") ||
        hasCarefulIntent(message),
      state: carefulState,
    },
    {
      when: ({ message }) => hasThoughtfulIntent(message),
      state: thoughtfulState,
    },
    {
      when: ({ riskFlags }) => riskFlags.includes("out_of_scope"),
      state: outOfScopeState,
    },
    {
      when: ({ response, riskFlags, message }) =>
        hasConfidentIntent(message) ||
        (response.confidence === "high" &&
          !hasHelpfulIntent(message) &&
          !riskFlags.length),
      state: confidentState,
    },
    {
      when: ({ response }) =>
        response.mode === "staging_llm" &&
        response.fallbackUsed === false &&
        response.groundingStatus === "grounded" &&
        response.outputSafetyStatus === "passed",
      state: groundedState,
    },
  ],
  fallbackState,
});

export default deriveMiraPresentationState;
