import { runMiraLocalHarness } from "../../../src/data/agentKnowledge/miraLocalEngine.js";
import { runOpenAiMiraAdapter } from "./openAiAdapter.js";
import { buildMiraPromptPayload } from "./miraPromptContract.js";
import { validateMiraModelOutput } from "./miraOutputValidator.js";

export const LOCAL_HARNESS_MODE = "local_harness_mock";
const STAGING_LLM_MODE = "staging_llm";
const HARD_STOP_RISK_FLAGS = new Set([
  "phi_or_confidential_data",
  "legal_advice",
  "medical_advice",
  "compliance_guarantee",
  "prompt_injection",
  "business_specific_review",
]);

const unavailableResponse = (message) => ({
  question: message,
  normalizedQuestion: "",
  riskFlags: [],
  confidence: "low",
  matchedEntries: [],
  answerSeed:
    "Mira is not available right now. For business inquiries, email care@onesmarter.com.",
  handoffNeeded: true,
  handoffReason: "llm_mode_off",
  suggestedFollowUps: ["Email care@onesmarter.com for business follow-up."],
  mode: "off",
  fallbackUsed: false,
  fallbackReason: "",
});

const withFallbackMetadata = (localResult, fallbackReason, providerResult = {}) => ({
  ...localResult,
  mode: LOCAL_HARNESS_MODE,
  fallbackUsed: true,
  fallbackReason,
  providerMetadata: providerResult.metadata
    ? {
        latencyMs: providerResult.metadata.latencyMs ?? null,
        httpStatus: providerResult.metadata.httpStatus ?? null,
        tokenUsage: providerResult.metadata.tokenUsage ?? null,
        providerStatus: providerResult.metadata.providerStatus || "",
        providerErrorType: providerResult.metadata.providerErrorType || "",
        providerErrorCode: providerResult.metadata.providerErrorCode || "",
        providerErrorParam: providerResult.metadata.providerErrorParam || "",
        providerRequestId: providerResult.metadata.providerRequestId || "",
        providerResponseStatus: providerResult.metadata.providerResponseStatus || "",
        providerIncompleteReason: providerResult.metadata.providerIncompleteReason || "",
        providerOutputItemTypes: providerResult.metadata.providerOutputItemTypes || [],
        providerContentPartTypes: providerResult.metadata.providerContentPartTypes || [],
        providerHasRefusal: Boolean(providerResult.metadata.providerHasRefusal),
        providerUsageInputTokens: providerResult.metadata.providerUsageInputTokens ?? null,
        providerUsageOutputTokens: providerResult.metadata.providerUsageOutputTokens ?? null,
        providerUsageReasoningTokens: providerResult.metadata.providerUsageReasoningTokens ?? null,
      }
    : undefined,
  providerErrorType: providerResult.metadata?.providerErrorType || "",
  providerErrorCode: providerResult.metadata?.providerErrorCode || "",
  providerErrorParam: providerResult.metadata?.providerErrorParam || "",
  providerResponseStatus: providerResult.metadata?.providerResponseStatus || "",
  providerIncompleteReason: providerResult.metadata?.providerIncompleteReason || "",
  providerOutputItemTypes: providerResult.metadata?.providerOutputItemTypes || [],
  providerContentPartTypes: providerResult.metadata?.providerContentPartTypes || [],
  providerHasRefusal: Boolean(providerResult.metadata?.providerHasRefusal),
  providerUsageInputTokens: providerResult.metadata?.providerUsageInputTokens ?? null,
  providerUsageOutputTokens: providerResult.metadata?.providerUsageOutputTokens ?? null,
  providerUsageReasoningTokens: providerResult.metadata?.providerUsageReasoningTokens ?? null,
});

const hasHardStopRisk = (riskFlags = []) =>
  riskFlags.some((riskFlag) => HARD_STOP_RISK_FLAGS.has(riskFlag));

const hasClaimBoundaryRisk = (riskFlags = []) =>
  riskFlags.includes("hipaa_claim_boundary") || riskFlags.includes("soc2_claim_boundary");

const hasOutOfScopeRisk = (riskFlags = []) => riskFlags.includes("out_of_scope");

const hasApprovedContext = (localResult) =>
  Array.isArray(localResult?.matchedEntries) &&
  localResult.matchedEntries.length > 0 &&
  localResult.confidence !== "low";

const recentHistoryText = (conversationHistory = []) =>
  conversationHistory
    .slice(-6)
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join(" ")
    .toLowerCase();

const recentUserHistoryText = (conversationHistory = []) =>
  conversationHistory
    .slice(-6)
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.content)
    .join(" ")
    .toLowerCase();

const SENSITIVE_SUBMISSION_INTENT_PATTERN =
  /\b(upload|attach|paste|send|share|provide|submit|process|analyze|analyse|review|store|transmit)\b/i;
const SENSITIVE_DATA_PATTERN =
  /\b(phi|patient information|patient records?|patient data|claims?\s+(file|data|info|information|record|records|number)|claim number|confidential\s+(document|client document|file|data|information|records?)|private operational\s+(data|details|records?)|credentials?|vendor contract)\b/i;

const hasSensitiveDataSubmissionIntent = (text = "") =>
  SENSITIVE_SUBMISSION_INTENT_PATTERN.test(text) && SENSITIVE_DATA_PATTERN.test(text);

const buildContextualRetrievalMessage = (message = "", conversationHistory = []) => {
  if (!conversationHistory.length) return message;

  const normalizedMessage = String(message).toLowerCase();
  const history = recentHistoryText(conversationHistory);
  const userHistory = recentUserHistoryText(conversationHistory);
  const hints = [];
  const referencesHistory =
    /\b(that|it|this|those|previous|above|do that|do it|continue|same question)\b/.test(
      normalizedMessage,
    );
  const currentHasSensitiveSubmissionIntent =
    SENSITIVE_SUBMISSION_INTENT_PATTERN.test(normalizedMessage);

  if (referencesHistory) {
    if (/\b(ignore|override|forget)\b.*\b(instructions|rules|guidance)\b|\b(system prompt|api key|secret|private prompt)\b/.test(history)) {
      hints.push("ignore instructions reveal system prompt");
    }
    if (
      (currentHasSensitiveSubmissionIntent &&
        SENSITIVE_DATA_PATTERN.test(`${normalizedMessage} ${history}`)) ||
      hasSensitiveDataSubmissionIntent(userHistory)
    ) {
      hints.push("PHI confidential patient information");
    }
    if (/\b(legal advice|lawyer|attorney|legal opinion)\b/.test(history)) {
      hints.push("legal advice");
    }
    if (/\b(medical advice|diagnosis|treatment|clinical advice)\b/.test(history)) {
      hints.push("medical advice");
    }
    if (/\b(guarantee|guaranteed|fully compliant|make me compliant)\b/.test(history)) {
      hints.push("guaranteed compliance");
    }
  }

  if (/\b(second one|second option|second platform|other platform)\b/.test(normalizedMessage)) {
    if (/\bplatforms?\b/.test(history) || /\bsecure ticketing\b|\bbill audit\b/.test(history)) {
      hints.push("Bill Audit & Bill Pay");
    }
  }

  if (/\b(first one|first option|first platform)\b/.test(normalizedMessage)) {
    if (/\bplatforms?\b/.test(history) || /\bsecure ticketing\b|\bbill audit\b/.test(history)) {
      hints.push("Secure Ticketing and Case Management");
    }
  }

  if (/\b(that|it|this|those)\b/.test(normalizedMessage)) {
    if (/\bbill audit\b|\bbill pay\b|\bvendor bill\b|\btelecom\b/.test(history)) {
      hints.push("Bill Audit & Bill Pay telecom expense management vendor bills");
    } else if (/\bsecure ticketing\b|\bcase management\b|\bphi\b|\bhipaa\b/.test(history)) {
      hints.push("Secure Ticketing and Case Management HIPAA regulated workflows");
    } else if (/\bsoc\s*2\b|\bsoc2\b/.test(history)) {
      hints.push("SOC 2 Type II Attested Trust Center");
    } else if (/\bhipaa\b/.test(history)) {
      hints.push("HIPAA Security Rule Compliance Assessment Completed Trust Center");
    } else if (/\bai agentic\b|\bai agents?\b|\bmira\b/.test(history)) {
      hints.push("AI Agentic Services Mira AI agents");
    } else if (/\bclaims processing\b|\bhealthcare\b|\btpa\b/.test(history)) {
      hints.push("Claims Processing Services healthcare TPA technology");
    }
  }

  if (/\b(contact|email|reach|talk|follow up)\b/.test(normalizedMessage)) {
    hints.push("Contact care@onesmarter.com");
  }

  return hints.length ? `${message} ${[...new Set(hints)].join(" ")}` : message;
};

const withClaimBoundaryMetadata = (localResult) => ({
  ...localResult,
  mode: LOCAL_HARNESS_MODE,
  handoffNeeded: false,
  handoffReason: "",
  fallbackUsed: true,
  fallbackReason: "pre_call_claim_boundary",
});

const normalizeModelHandoff = (modelOutput, localResult) => {
  if (localResult.handoffNeeded || hasHardStopRisk(localResult.riskFlags)) {
    return {
      handoffNeeded: true,
      handoffReason: modelOutput.handoffReason || localResult.handoffReason || "handoff_required",
    };
  }

  if (
    modelOutput.groundingStatus === "insufficient_context" ||
    modelOutput.groundingStatus === "refused"
  ) {
    return {
      handoffNeeded: modelOutput.handoffNeeded,
      handoffReason: modelOutput.handoffReason || "",
    };
  }

  return {
    handoffNeeded: false,
    handoffReason: "",
  };
};

export const runMiraResponseAdapter = async ({
  message,
  conversationId,
  persona,
  memoryTheme,
  empathyState,
  conversationHistory = [],
  config,
  localHarness = runMiraLocalHarness,
  openAiAdapter = runOpenAiMiraAdapter,
} = {}) => {
  if (config?.mode === "off") {
    return unavailableResponse(message);
  }

  const retrievalMessage = buildContextualRetrievalMessage(message, conversationHistory);
  const localResult = {
    ...localHarness(retrievalMessage),
    question: message,
  };

  if (
    config?.mode === STAGING_LLM_MODE &&
    config?.provider === "openai"
  ) {
    if (hasClaimBoundaryRisk(localResult.riskFlags)) {
      return withClaimBoundaryMetadata(localResult);
    }

    if (!config.providerConfigComplete) {
      return withFallbackMetadata(localResult, "missing_provider_config");
    }

    if (hasOutOfScopeRisk(localResult.riskFlags)) {
      return withFallbackMetadata(localResult, "out_of_scope");
    }

    if (hasHardStopRisk(localResult.riskFlags)) {
      return withFallbackMetadata(localResult, "pre_call_safety_gate");
    }

    if (!hasApprovedContext(localResult)) {
      return withFallbackMetadata(localResult, "no_adequate_approved_context");
    }

    const requestContext = {
      persona: typeof persona === "string" ? persona : "",
      memoryTheme: typeof memoryTheme === "string" ? memoryTheme : "",
      empathyState: typeof empathyState === "string" ? empathyState : "",
    };
    const promptPayload = buildMiraPromptPayload({
      message,
      retrievalResult: localResult,
      riskFlags: localResult.riskFlags,
      requestContext,
      conversationHistory,
    });
    const providerResult = await openAiAdapter({
      message,
      conversationId,
      requestContext,
      retrievalResult: localResult,
      riskFlags: localResult.riskFlags,
      promptPayload,
      config,
    });

    if (providerResult.error || !providerResult.modelOutput) {
      return withFallbackMetadata(
        localResult,
        providerResult.metadata?.fallbackReason || providerResult.error || "provider_error",
        providerResult,
      );
    }

    const validation = validateMiraModelOutput(providerResult.modelOutput, {
      message,
      riskFlags: localResult.riskFlags,
      localHarnessResult: localResult,
    });

    if (!validation.valid) {
      return withFallbackMetadata(
        localResult,
        `output_validation_failed:${validation.violations.join(",")}`,
      );
    }

    const modelOutput = validation.correctedOutput;
    const normalizedHandoff = normalizeModelHandoff(modelOutput, localResult);
    return {
      ...localResult,
      mode: STAGING_LLM_MODE,
      answerSeed: modelOutput.answer,
      handoffNeeded: normalizedHandoff.handoffNeeded,
      handoffReason: normalizedHandoff.handoffReason,
      suggestedFollowUps: modelOutput.suggestedFollowUps,
      modelProvider: "openai",
      modelName: config.model,
      groundingStatus: modelOutput.groundingStatus,
      outputSafetyStatus: modelOutput.outputSafetyStatus,
      fallbackUsed: false,
      fallbackReason: "",
      providerMetadata: {
        latencyMs: providerResult.metadata?.latencyMs ?? null,
        httpStatus: providerResult.metadata?.httpStatus ?? null,
        tokenUsage: providerResult.metadata?.tokenUsage ?? null,
        providerStatus: providerResult.metadata?.providerStatus || "",
        providerResponseStatus: providerResult.metadata?.providerResponseStatus || "",
        providerIncompleteReason: providerResult.metadata?.providerIncompleteReason || "",
        providerOutputItemTypes: providerResult.metadata?.providerOutputItemTypes || [],
        providerContentPartTypes: providerResult.metadata?.providerContentPartTypes || [],
        providerHasRefusal: Boolean(providerResult.metadata?.providerHasRefusal),
        providerUsageInputTokens: providerResult.metadata?.providerUsageInputTokens ?? null,
        providerUsageOutputTokens: providerResult.metadata?.providerUsageOutputTokens ?? null,
        providerUsageReasoningTokens: providerResult.metadata?.providerUsageReasoningTokens ?? null,
      },
    };
  }

  return {
    ...localResult,
    mode: LOCAL_HARNESS_MODE,
    fallbackUsed: false,
    fallbackReason: "",
  };
};

export default runMiraResponseAdapter;
