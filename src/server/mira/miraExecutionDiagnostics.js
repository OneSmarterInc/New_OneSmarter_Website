// Configuration, answer origin and provider activity are different facts.
// Do not infer a successful transport from configuration or fluent answer text.
export const describeMiraExecution = (result, config) => {
  const trace = result.executionTrace || {};
  const generationAdapterCalls = trace.generationAdapterCalls || 0;
  const localAnswer = result.mode === "local_harness_mock" || result.fallbackUsed === true;
  const mode = config.mode === "staging_llm" && localAnswer
    ? "local_deterministic"
    : result.mode || "unknown";
  return {
    mode,
    legacyResponseMode: result.mode || "unknown",
    requestedMode: config.requestedMode,
    configuredMode: config.mode,
    configuredProvider: config.provider || "none",
    configuredModel: config.model || "none",
    executionPath: result.fallbackUsed
      ? "safe_fallback"
      : mode === "staging_llm"
        ? "provider_generated"
        : mode === "local_deterministic"
          ? "intentional_local_answer"
          : mode,
    generationAdapterCalls,
    semanticProviderCalls: trace.semanticProviderCalls || 0,
    semanticProviderCompleted: trace.semanticProviderCompleted || 0,
    providerStatus: result.providerMetadata?.providerStatus || (generationAdapterCalls ? "unknown" : "not_called"),
    providerHttpStatus: result.providerMetadata?.httpStatus ?? null,
    faqId: result.faqId || "",
    skipModel: Boolean(result.responseMode?.skipModel),
  };
};
