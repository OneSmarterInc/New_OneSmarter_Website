const GENERIC_FOLLOW_UP =
  /(?:^|\n)(?:would you like|can you tell me|could you tell me|what workflow|what regulations|do you want|would you like to know)[^\n?]*\?\s*$/i;

const stripUnnecessaryFollowUp = (answer = "") =>
  String(answer).replace(GENERIC_FOLLOW_UP, "").trim();

export const classifyMiraAnswerCompleteness = (result = {}) => {
  if (
    result.riskFlags?.includes("phi_or_confidential_data") ||
    (result.riskFlags?.length > 0 && result.handoffNeeded) ||
    result.safetyHandled
  ) {
    return {
      status: "safety_response",
      reason: "The current request requires a safety response.",
      missingInformation: [],
      allowFollowUpQuestion: false,
    };
  }
  if (result.clarificationNeeded) {
    return {
      status: "needs_clarification",
      reason: "A required criterion or entity reference is unresolved.",
      missingInformation:
        result.missingRequirements?.length > 0
          ? result.missingRequirements
          : ["The specific workflow, criterion, or referenced offering"],
      allowFollowUpQuestion: true,
    };
  }
  if (result.unsupportedHandled) {
    return {
      status: "unsupported_with_handoff",
      reason:
        "Approved public content does not establish the requested implementation-specific fact.",
      missingInformation: [],
      allowFollowUpQuestion: false,
    };
  }
  return {
    status: "complete",
    reason:
      "The current question is understood and answered from grounded approved content.",
    missingInformation: [],
    allowFollowUpQuestion: false,
  };
};

export const applyMiraAnswerCompleteness = (result = {}) => {
  const answerCompleteness = classifyMiraAnswerCompleteness(result);
  return {
    ...result,
    answerSeed: answerCompleteness.allowFollowUpQuestion
      ? result.answerSeed
      : stripUnnecessaryFollowUp(result.answerSeed),
    answerCompleteness,
  };
};

export default applyMiraAnswerCompleteness;
