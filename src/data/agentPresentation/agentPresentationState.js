const normalizeObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const clampSignal = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export const createAgentPresentationState = (state, moodSignalKeys) => ({
  posture: state.posture,
  expression: state.expression,
  moodSignals: Object.fromEntries(
    moodSignalKeys.map((key) => [key, clampSignal(state.moodSignals?.[key])]),
  ),
  summary: state.summary,
});

export const createAgentPresentationStateDeriver = ({
  moodSignalKeys,
  normalizeMessage,
  initialState,
  loadingState,
  errorState,
  rules,
  fallbackState,
}) => {
  const toPresentationState = (state) =>
    createAgentPresentationState(state, moodSignalKeys);

  return (input = {}) => {
    const safeInput = normalizeObject(input);
    const response = normalizeObject(safeInput.response);
    const message = normalizeMessage(
      safeInput.currentMessage || response.question || "",
    );
    const riskFlags = Array.isArray(response.riskFlags) ? response.riskFlags : [];
    const context = {
      input: safeInput,
      response,
      message,
      riskFlags,
      hasResponse: Boolean(safeInput.response) && Object.keys(response).length > 0,
    };

    if (safeInput.isLoading) return toPresentationState(loadingState);
    if (safeInput.hasError) return toPresentationState(errorState);
    if (!context.hasResponse) return toPresentationState(initialState);

    const matchedRule = rules.find((rule) => rule.when(context));
    return toPresentationState(matchedRule?.state || fallbackState);
  };
};
