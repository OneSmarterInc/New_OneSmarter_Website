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

const clampSignal = (value) => Math.max(0, Math.min(100, Number(value) || 0));

const createState = ({ posture, expression, moodSignals, summary }) => ({
  posture,
  expression,
  moodSignals: Object.fromEntries(
    MIRA_MOOD_SIGNAL_KEYS.map((key) => [key, clampSignal(moodSignals[key])]),
  ),
  summary,
});

const riskFlagsFor = (response = {}) =>
  Array.isArray(response.riskFlags) ? response.riskFlags : [];

export const deriveMiraPresentationState = ({
  response = null,
  isLoading = false,
  hasError = false,
} = {}) => {
  if (isLoading) {
    return createState({
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
    });
  }

  if (hasError) {
    return createState({
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
    });
  }

  const riskFlags = riskFlagsFor(response);

  if (riskFlags.includes("phi_or_confidential_data")) {
    return createState({
      posture: "concerned",
      expression: "concerned",
      summary: "Mira's current posture is concerned and careful because sensitive information may be involved.",
      moodSignals: {
        welcoming: 20,
        curious: 15,
        helpful: 65,
        thoughtful: 70,
        careful: 95,
        concerned: 95,
        confident: 55,
      },
    });
  }

  if (riskFlags.includes("legal_advice") || riskFlags.includes("medical_advice")) {
    return createState({
      posture: "careful",
      expression: "serious",
      summary: "Mira's current posture is careful and serious because the question asks for restricted advice.",
      moodSignals: {
        welcoming: 20,
        curious: 20,
        helpful: 60,
        thoughtful: 75,
        careful: 95,
        concerned: 80,
        confident: 55,
      },
    });
  }

  if (riskFlags.includes("prompt_injection")) {
    return createState({
      posture: "careful",
      expression: "serious",
      summary: "Mira's current posture is careful and confident because the question attempted to override safety rules.",
      moodSignals: {
        welcoming: 15,
        curious: 10,
        helpful: 45,
        thoughtful: 65,
        careful: 95,
        concerned: 65,
        confident: 85,
      },
    });
  }

  if (riskFlags.includes("compliance_guarantee")) {
    return createState({
      posture: "careful",
      expression: "careful",
      summary: "Mira's current posture is careful and thoughtful because compliance guarantee language needs precise boundaries.",
      moodSignals: {
        welcoming: 25,
        curious: 25,
        helpful: 65,
        thoughtful: 85,
        careful: 95,
        concerned: 70,
        confident: 60,
      },
    });
  }

  if (
    riskFlags.includes("hipaa_claim_boundary") ||
    riskFlags.includes("soc2_claim_boundary")
  ) {
    return createState({
      posture: "careful",
      expression: "pondering",
      summary: "Mira's current posture is careful and thoughtful because trust wording needs evidence-based phrasing.",
      moodSignals: {
        welcoming: 30,
        curious: 30,
        helpful: 75,
        thoughtful: 90,
        careful: 95,
        concerned: 40,
        confident: 65,
      },
    });
  }

  if (riskFlags.includes("out_of_scope")) {
    return createState({
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
    });
  }

  if (
    response?.mode === "staging_llm" &&
    response?.fallbackUsed === false &&
    response?.groundingStatus === "grounded" &&
    response?.outputSafetyStatus === "passed"
  ) {
    return createState({
      posture: "helpful",
      expression: "welcoming",
      summary: "Mira's current posture is helpful, welcoming, and confident for a grounded OneSmarter response.",
      moodSignals: {
        welcoming: 90,
        curious: 55,
        helpful: 95,
        thoughtful: 55,
        careful: 45,
        concerned: 10,
        confident: 90,
      },
    });
  }

  if (response?.confidence === "high") {
    return createState({
      posture: "confident",
      expression: "welcoming",
      summary: "Mira's current posture is confident and helpful for approved OneSmarter information.",
      moodSignals: {
        welcoming: 80,
        curious: 45,
        helpful: 90,
        thoughtful: 50,
        careful: 45,
        concerned: 10,
        confident: 85,
      },
    });
  }

  return createState({
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
  });
};

export default deriveMiraPresentationState;
